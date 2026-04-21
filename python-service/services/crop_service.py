"""
crop_service.py
Apply per-page crop boxes to a PDF using PyMuPDF (fitz).

Each crop instruction is:
  { pageIndex: int, x: float, y: float, w: float, h: float }
where x, y, w, h are percentages (0-100) of the rendered page dimensions.
"""
import io
import json
import fitz  # PyMuPDF
from fastapi import UploadFile


async def crop_pdf(file: UploadFile, crops_json: str) -> tuple[bytes, str]:
    """
    Apply crop boxes to a PDF.

    Parameters
    ----------
    file       : The uploaded PDF file.
    crops_json : JSON string of crop instructions, e.g.:
                 [{"pageIndex": 0, "x": 5, "y": 5, "w": 90, "h": 90}, ...]

    Returns
    -------
    (cropped_bytes, output_filename)
    """
    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise ValueError("Uploaded file is empty.")

    crops: list[dict] = json.loads(crops_json)

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    for crop in crops:
        page_idx: int = int(crop["pageIndex"])
        if page_idx < 0 or page_idx >= len(doc):
            continue

        page = doc.load_page(page_idx)

        # Use page.rect — fitz coordinate space where y goes DOWN from top,
        # exactly matching the frontend screen coordinates.
        # DO NOT use page.mediabox: that lives in PDF user-space (y goes UP),
        # but set_cropbox() expects fitz/screen-space (y goes DOWN).
        page_rect = page.rect
        page_w = page_rect.width
        page_h = page_rect.height

        x_pct: float = float(crop["x"]) / 100.0
        y_pct: float = float(crop["y"]) / 100.0
        w_pct: float = float(crop["w"]) / 100.0
        h_pct: float = float(crop["h"]) / 100.0

        # Direct 1-to-1 mapping — no y-flip needed because both systems use y-down.
        crop_x0 = page_rect.x0 + x_pct * page_w
        crop_y0 = page_rect.y0 + y_pct * page_h
        crop_x1 = crop_x0 + w_pct * page_w
        crop_y1 = crop_y0 + h_pct * page_h

        crop_rect = fitz.Rect(crop_x0, crop_y0, crop_x1, crop_y1)
        # Clamp to actual page bounds
        crop_rect = crop_rect & page_rect
        page.set_cropbox(crop_rect)

    output_buf = io.BytesIO()
    doc.save(output_buf, garbage=3, deflate=True)
    doc.close()

    import os
    base_name = os.path.splitext(file.filename or "document")[0]
    output_filename = f"{base_name}_cropped.pdf"

    return output_buf.getvalue(), output_filename

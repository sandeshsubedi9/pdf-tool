import json
import logging
import fitz  # PyMuPDF
from fastapi import UploadFile

logger = logging.getLogger(__name__)

async def apply_redactions_standalone(file: UploadFile, redactions_json: str) -> tuple[bytes, str]:
    """
    Apply secure, true redactions to a PDF document based on a list of rectangles.
    redactions_json is a JSON array of objects:
    [ { "page": 1, "x_pct": 10.5, "y_pct": 20.0, "w_pct": 50.0, "h_pct": 5.0 }, ... ]
    """
    pdf_bytes = await file.read()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    try:
        redactions = json.loads(redactions_json)
    except Exception as e:
        logger.error(f"Failed to parse redactions JSON: {e}")
        redactions = []

    for item in redactions:
        page_idx = int(item.get("page", 1)) - 1
        if 0 <= page_idx < len(doc):
            page = doc[page_idx]
            pw = page.rect.width
            ph = page.rect.height

            # Coordinates are given in percentages of the page size
            bx = (float(item.get("x_pct", 0)) / 100) * pw
            by = (float(item.get("y_pct", 0)) / 100) * ph
            bw = (float(item.get("w_pct", 0)) / 100) * pw
            bh = (float(item.get("h_pct", 0)) / 100) * ph

            # Visual redaction box applies directly to screen coordinates, 
            # derotate so PyMuPDF natively erases it correctly on rotated pages
            visual_rect = fitz.Rect(bx, by, bx + bw, by + bh)
            unrotated_rect = visual_rect * page.derotation_matrix
            
            # Add redaction annotation filled with pure black
            page.add_redact_annot(unrotated_rect, fill=(0.0, 0.0, 0.0))

    # Apply all redactions globally across the document
    for page_idx in range(len(doc)):
        doc[page_idx].apply_redactions()

    out_bytes = doc.tobytes(garbage=4, deflate=True)
    doc.close()

    base = (file.filename or "document").rsplit(".", 1)[0]
    return out_bytes, f"{base}_redacted.pdf"

"""
Edit PDF Service
─────────────────
1. extract_pdf_content  → parse text blocks + images with positions (returned as JSON)
2. apply_pdf_edits      → receive edit instructions, whiteout originals, draw new content
"""

import io
import os
import re
import json
import base64
import logging
import fitz  # PyMuPDF
from PIL import Image
from fastapi import UploadFile

logger = logging.getLogger(__name__)

# ─── Font mapping (friendly name → fitz base-14 fontname) ────────────────────

FONT_MAP = {
    "Helvetica": "helv",
    "Arial": "helv",
    "Inter": "helv",
    "Roboto": "helv",
    "Open Sans": "helv",
    "Lato": "helv",
    "Montserrat": "helv",
    "Poppins": "helv",
    "Verdana": "helv",
    "Impact": "helv",
    "Times New Roman": "tiro",
    "Georgia": "tiro",
    "Courier": "cour",
    "Courier New": "cour",
}


def _resolve_fitz_font(family: str, bold: bool, italic: bool) -> str:
    base = FONT_MAP.get(family, "helv")
    if base == "helv":
        if bold and italic:
            return "hebo"
        elif bold:
            return "hebo"
        elif italic:
            return "heob"
        return "helv"
    elif base == "tiro":
        if bold and italic:
            return "tibi"
        elif bold:
            return "tibo"
        elif italic:
            return "tiit"
        return "tiro"
    elif base == "cour":
        if bold and italic:
            return "cobi"
        elif bold:
            return "cobo"
        elif italic:
            return "coit"
        return "cour"
    return base


def _hex_to_rgb(hex_color: str) -> tuple:
    try:
        if not isinstance(hex_color, str) or not hex_color:
            return 0.0, 0.0, 0.0
        h = hex_color.lstrip("#")
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        return r / 255.0, g / 255.0, b / 255.0
    except (ValueError, IndexError, TypeError):
        return 0.0, 0.0, 0.0


def _rgb_to_hex(r: float, g: float, b: float) -> str:
    return "#{:02x}{:02x}{:02x}".format(
        int(r * 255), int(g * 255), int(b * 255)
    )


# ─── EXTRACT ──────────────────────────────────────────────────────────────────

async def extract_pdf_content(file: UploadFile) -> dict:
    """
    Extract all text blocks and images from a PDF.
    Returns JSON with text_blocks and images arrays,
    each with position info as percentages of page dimensions.
    """
    pdf_bytes = await file.read()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    result = {
        "pages": [],
        "total_pages": len(doc),
    }

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        pw = page.rect.width
        ph = page.rect.height

        page_data = {
            "page_number": page_idx + 1,
            "width": pw,
            "height": ph,
            "text_blocks": [],
            "images": [],
        }

        # ── Extract text lines ──────────────────────────────────────────
        # Use get_text("dict") for detailed block/line/span info
        text_dict = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)

        for blk_idx, block in enumerate(text_dict.get("blocks", [])):
            if block.get("type") != 0:  # type 0 = text block
                continue

            for line_idx, line in enumerate(block.get("lines", [])):
                dominant_size = 12.0
                dominant_color_hex = "#000000"
                dominant_font = "Helvetica"
                is_bold = False
                is_italic = False
                
                line_parts = []
                span_count = 0

                for span in line.get("spans", []):
                    span_text = span.get("text", "")
                    # Don't skip completely empty spans if they are just spaces
                    if not span_text:
                        continue
                        
                    line_parts.append(span_text)
                    span_count += 1

                    # Track the most common style (use the first span's style)
                    if span_count == 1:
                        dominant_size = span.get("size", 12.0)
                        # Color is an integer in fitz
                        color_int = span.get("color", 0)
                        r = ((color_int >> 16) & 0xFF) / 255.0
                        g = ((color_int >> 8) & 0xFF) / 255.0
                        b = (color_int & 0xFF) / 255.0
                        dominant_color_hex = _rgb_to_hex(r, g, b)

                        font_name = span.get("font", "")
                        # Detect bold/italic from font name
                        fn_lower = font_name.lower()
                        is_bold = "bold" in fn_lower or "heavy" in fn_lower or "black" in fn_lower
                        is_italic = "italic" in fn_lower or "oblique" in fn_lower

                        # Map to a friendly font family
                        if any(k in fn_lower for k in ["arial", "helvetica", "sans"]):
                            dominant_font = "Helvetica"
                        elif any(k in fn_lower for k in ["times", "serif", "roman"]):
                            dominant_font = "Times New Roman"
                        elif any(k in fn_lower for k in ["courier", "mono"]):
                            dominant_font = "Courier New"
                        else:
                            dominant_font = "Helvetica"

                full_text = "".join(line_parts)
                if not full_text.strip():
                    continue

                # Line bounding box (much tighter and perfectly positioned than block bbox)
                bbox = line.get("bbox", (0, 0, 0, 0))
                x0, y0, x1, y1 = bbox

                page_data["text_blocks"].append({
                    "id": f"ext_t_{page_idx}_{blk_idx}_{line_idx}",
                    "text": full_text,
                    "x_pct": (x0 / pw) * 100,
                    "y_pct": (y0 / ph) * 100,
                    "w_pct": ((x1 - x0) / pw) * 100,
                    "h_pct": ((y1 - y0) / ph) * 100,
                    # Original coords for whiteout (in PDF points)
                    "orig_x0": x0,
                    "orig_y0": y0,
                    "orig_x1": x1,
                    "orig_y1": y1,
                    # Style
                    "fontSize": round(dominant_size, 1),
                    "fontFamily": dominant_font,
                    "color": dominant_color_hex,
                    "bold": is_bold,
                    "italic": is_italic,
                })

        # ── Extract images ───────────────────────────────────────────────
        img_list = page.get_images(full=True)
        for img_index, img_info in enumerate(img_list):
            xref = img_info[0]
            try:
                # Get image bounding box by looking at how it's placed on the page
                img_rects = page.get_image_rects(xref)
                if not img_rects:
                    continue

                for rect_idx, img_rect in enumerate(img_rects):
                    if img_rect.is_empty or img_rect.is_infinite:
                        continue

                    # Extract image bytes
                    base_image = doc.extract_image(xref)
                    if not base_image:
                        continue

                    img_bytes = base_image["image"]
                    img_ext = base_image.get("ext", "png")
                    mime = f"image/{img_ext}" if img_ext != "jpg" else "image/jpeg"

                    # Convert to base64 data URL
                    b64 = base64.b64encode(img_bytes).decode("utf-8")
                    data_url = f"data:{mime};base64,{b64}"

                    x0, y0, x1, y1 = img_rect.x0, img_rect.y0, img_rect.x1, img_rect.y1

                    page_data["images"].append({
                        "id": f"ext_i_{page_idx}_{img_index}_{rect_idx}",
                        "dataUrl": data_url,
                        "x_pct": (x0 / pw) * 100,
                        "y_pct": (y0 / ph) * 100,
                        "w_pct": ((x1 - x0) / pw) * 100,
                        "h_pct": ((y1 - y0) / ph) * 100,
                        # Original coords for whiteout
                        "orig_x0": x0,
                        "orig_y0": y0,
                        "orig_x1": x1,
                        "orig_y1": y1,
                    })
            except Exception as e:
                logger.warning(f"Could not extract image xref={xref}: {e}")
                continue

        result["pages"].append(page_data)

    doc.close()
    return result


# ─── APPLY EDITS ──────────────────────────────────────────────────────────────

async def apply_pdf_edits(file: UploadFile, edits_json: str) -> tuple[bytes, str]:
    """
    Apply edits to a PDF.

    edits_json is a JSON string with:
    {
        "modified": [  // existing items that were changed (text edited, moved, resized)
            {
                "type": "text" | "image",
                "page": 1,  // 1-indexed
                // Original area to whiteout (PDF points)
                "orig_x0": ..., "orig_y0": ..., "orig_x1": ..., "orig_y1": ...,
                // New position (% of page)
                "x_pct": ..., "y_pct": ..., "w_pct": ..., "h_pct": ...,
                // For text:
                "text": "...", "fontSize": 14, "fontFamily": "Helvetica",
                "color": "#000000", "bold": false, "italic": false,
                // For image:
                "dataUrl": "data:image/..."
            }
        ],
        "deleted": [  // existing items that were removed
            {
                "page": 1,
                "orig_x0": ..., "orig_y0": ..., "orig_x1": ..., "orig_y1": ...
            }
        ],
        "added": [  // brand new annotations
            {
                "type": "text" | "image",
                "page": 1,
                "x_pct": ..., "y_pct": ..., "w_pct": ..., "h_pct": ...,
                "text": "...", "fontSize": 14, "fontFamily": "Helvetica",
                "color": "#000000", "bold": false, "italic": false,
                // or for image:
                "dataUrl": "data:image/..."
            }
        ]
    }

    Returns (pdf_bytes, output_filename).
    """
    pdf_bytes = await file.read()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    edits = json.loads(edits_json)

    modified = edits.get("modified", [])
    deleted = edits.get("deleted", [])
    added = edits.get("added", [])

    # ── Process deletions: whiteout the original area ─────────────────────
    for item in deleted:
        page_idx = item["page"] - 1
        if page_idx < 0 or page_idx >= len(doc):
            continue
        page = doc[page_idx]
        rect = fitz.Rect(
            item.get("orig_x0", 0), item.get("orig_y0", 0),
            item.get("orig_x1", 0), item.get("orig_y1", 0)
        )
        # Add redaction annotation (whiteout)
        page.add_redact_annot(rect, fill=(1, 1, 1))  # white fill

    # ── Process modifications: whiteout original, then draw new ──────────
    for item in modified:
        page_idx = item["page"] - 1
        if page_idx < 0 or page_idx >= len(doc):
            continue
        page = doc[page_idx]

        # Whiteout original position
        rect = fitz.Rect(
            item.get("orig_x0", 0), item.get("orig_y0", 0),
            item.get("orig_x1", 0), item.get("orig_y1", 0)
        )
        page.add_redact_annot(rect, fill=(1, 1, 1))

    # Apply all redactions at once (per page)
    for page_idx in range(len(doc)):
        page = doc[page_idx]
        page.apply_redactions()

    # ── Now draw modified items at their new positions ────────────────────
    for item in modified:
        page_idx = item["page"] - 1
        if page_idx < 0 or page_idx >= len(doc):
            continue
        page = doc[page_idx]
        pw = page.rect.width
        ph = page.rect.height

        if item.get("type") == "text":
            _draw_text_block(page, item, pw, ph)
        elif item.get("type") == "image":
            _draw_image_block(page, item, pw, ph)

    # ── Draw newly added items ───────────────────────────────────────────
    for item in added:
        page_idx = item["page"] - 1
        if page_idx < 0 or page_idx >= len(doc):
            continue
        page = doc[page_idx]
        pw = page.rect.width
        ph = page.rect.height

        if item.get("type") == "text":
            _draw_text_block(page, item, pw, ph)
        elif item.get("type") == "image":
            _draw_image_block(page, item, pw, ph)

    out_bytes = doc.tobytes(garbage=4, deflate=True)
    doc.close()

    base = (file.filename or "document").rsplit(".", 1)[0]
    return out_bytes, f"{base}_edited.pdf"


def _draw_text_block(page, item: dict, pw: float, ph: float):
    """Draw a text block onto the page."""
    text = item.get("text", "")
    if not text.strip():
        return

    x = (float(item.get("x_pct") or 0) / 100) * pw
    y = (float(item.get("y_pct") or 0) / 100) * ph
    w = (float(item.get("w_pct") or 0) / 100) * pw
    h = (float(item.get("h_pct") or 0) / 100) * ph

    font_size = item.get("fontSize", 12)
    font_family = item.get("fontFamily", "Helvetica")
    color_hex = item.get("color", "#000000")
    bold = item.get("bold", False)
    italic = item.get("italic", False)

    fitz_font = _resolve_fitz_font(font_family, bold, italic)
    color = _hex_to_rgb(color_hex)

    # Use a massive boundary to match the frontend `whiteSpace: "pre"` dynamic sizing behavior. 
    # This guarantees PyMuPDF never silently truncates text that extends past the original `w` threshold.
    text_rect = fitz.Rect(x, y, x + 10000, y + 10000)

    try:
        # Use insert_textbox for multi-line text with wrapping
        page.insert_textbox(
            text_rect,
            text,
            fontname=fitz_font,
            fontsize=font_size,
            color=color,
            align=fitz.TEXT_ALIGN_LEFT,
        )
    except Exception as e:
        logger.warning(f"insert_textbox failed, falling back to insert_text: {e}")
        # Fallback: simple text insert at top-left of rect
        insert_pt = fitz.Point(x, y + font_size)
        try:
            page.insert_text(
                insert_pt,
                text,
                fontname=fitz_font,
                fontsize=font_size,
                color=color,
            )
        except Exception as e2:
            logger.error(f"Text insertion failed completely: {e2}")


def _draw_image_block(page, item: dict, pw: float, ph: float):
    """Draw an image block onto the page."""
    data_url = item.get("dataUrl", "")
    if not data_url:
        return

    x = (float(item.get("x_pct") or 0) / 100) * pw
    y = (float(item.get("y_pct") or 0) / 100) * ph
    w = (float(item.get("w_pct") or 0) / 100) * pw
    h = (float(item.get("h_pct") or 0) / 100) * ph

    try:
        # Parse data URL
        if "," in data_url:
            b64_data = data_url.split(",", 1)[1]
        else:
            b64_data = data_url

        img_bytes = base64.b64decode(b64_data)
        img_rect = fitz.Rect(x, y, x + w, y + h)
        page.insert_image(img_rect, stream=img_bytes)
    except Exception as e:
        logger.error(f"Image insertion failed: {e}")

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
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return r / 255.0, g / 255.0, b / 255.0


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
        # Use find_tables() to perfectly preserve table structures cell by cell
        tables = page.find_tables()
        table_cells = []
        for table in tables:
            for row in table.cells:
                for cell in row:
                    if cell:
                        table_cells.append(fitz.Rect(cell))
        
        text_dict = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)

        for blk_idx, block in enumerate(text_dict.get("blocks", [])):
            if block.get("type") != 0:  # type 0 = text block
                continue

            block_rect = fitz.Rect(block.get("bbox"))
            
            # Check if this block is inside a table cell
            is_in_table = False
            for cell_rect in table_cells:
                if block_rect.intersects(cell_rect):
                    is_in_table = True
                    break

            block_text = ""
            dominant_size = 12.0
            dominant_color_hex = "#000000"
            dominant_font = "Helvetica"
            is_bold = False
            is_italic = False
            
            span_count = 0
            real_x0, real_y0, real_x1, real_y1 = None, None, None, None

            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    span_text = span.get("text", "")
                    if not span_text.strip():
                        block_text += span_text
                        continue
                        
                    sx0, sy0, sx1, sy1 = span.get("bbox", (0, 0, 0, 0))
                    if real_x0 is None:
                        real_x0, real_y0, real_x1, real_y1 = sx0, sy0, sx1, sy1
                    else:
                        real_x0 = min(real_x0, sx0)
                        real_y0 = min(real_y0, sy0)
                        real_x1 = max(real_x1, sx1)
                        real_y1 = max(real_y1, sy1)

                    block_text += span_text
                    span_count += 1

                    if span_count == 1:
                        dominant_size = span.get("size", 12.0)
                        color_int = span.get("color", 0)
                        r = ((color_int >> 16) & 0xFF) / 255.0
                        g = ((color_int >> 8) & 0xFF) / 255.0
                        b = (color_int & 0xFF) / 255.0
                        dominant_color_hex = _rgb_to_hex(r, g, b)

                        font_name = span.get("font", "")
                        fn_lower = font_name.lower()
                        is_bold = "bold" in fn_lower or "heavy" in fn_lower or "black" in fn_lower
                        is_italic = "italic" in fn_lower or "oblique" in fn_lower

                        if any(k in fn_lower for k in ["arial", "helvetica", "sans"]):
                            dominant_font = "Helvetica"
                        elif any(k in fn_lower for k in ["times", "serif", "roman"]):
                            dominant_font = "Times New Roman"
                        elif any(k in fn_lower for k in ["courier", "mono"]):
                            dominant_font = "Courier New"
                        else:
                            dominant_font = "Helvetica"
                block_text += "\n"

            block_text = block_text.rstrip("\n")
            if not block_text.strip():
                continue

            if real_x0 is None:
                real_x0, real_y0, real_x1, real_y1 = block.get("bbox", (0, 0, 0, 0))

            pad_x = dominant_size * 0.1
            pad_y = dominant_size * 0.1
            orig_x0 = max(0, real_x0 - pad_x)
            orig_y0 = max(0, real_y0 - pad_y)
            orig_x1 = min(pw, real_x1 + pad_x)
            orig_y1 = min(ph, real_y1 + pad_y)

            page_data["text_blocks"].append({
                "id": str(uuid.uuid4()),
                "text": block_text,
                "x_pct": (real_x0 / pw) * 100.0,
                "y_pct": (real_y0 / ph) * 100.0,
                "w_pct": ((real_x1 - real_x0) / pw) * 100.0,
                "h_pct": ((real_y1 - real_y0) / ph) * 100.0,
                "orig_x0": orig_x0,
                "orig_y0": orig_y0,
                "orig_x1": orig_x1,
                "orig_y1": orig_y1,
                "fontSize": round(dominant_size, 1),
                "fontFamily": dominant_font,
                "color": dominant_color_hex,
                "bold": is_bold,
                "italic": is_italic,
                "align": align
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

    align_str = item.get("align", "left")
    
    # We split and render manually to prevent bounds truncation and forced shrinking
    lines = text.split("\n")
    line_height = font_size * 1.3
    
    for i, line in enumerate(lines):
        if not line.strip():
            continue
            
        insert_y = y + font_size + (i * line_height)
        
        # Calculate exactly how wide the string is at this font size
        try:
            # fitz Font object could be needed to get exact length, but get_text_length works
            text_len = fitz.get_text_length(line, fontname=fitz_font, fontsize=font_size)
        except Exception:
            text_len = font_size * 0.5 * len(line) # Fallback heuristic
            
        if align_str == "center":
            insert_x = x + (w - text_len) / 2
        elif align_str == "right":
            insert_x = x + w - text_len
        elif align_str == "justify":
            # Native insert_textbox does Justify properly, but we can do it manually per line
            # except the last line of a paragraph shouldn't be justified.
            # But let's just use insert_textbox for the line but with width exactly.
            if i == len(lines) - 1 or len(line.split(" ")) == 1:
                # Don't justify the last line or single words
                insert_x = x
            else:
                # We can just rely on insert_textbox for this specific line!
                # It safely handles justification if we provide a tight rect.
                line_rect = fitz.Rect(x, insert_y - font_size, x + w, insert_y + line_height)
                try:
                    page.insert_textbox(
                        line_rect,
                        line,
                        fontname=fitz_font,
                        fontsize=font_size,
                        color=color,
                        align=fitz.TEXT_ALIGN_JUSTIFY
                    )
                except Exception:
                    page.insert_text(fitz.Point(x, insert_y), line, fontname=fitz_font, fontsize=font_size, color=color)
                continue
        else:
            insert_x = x
            
        # Draw with exact coordinates
        insert_pt = fitz.Point(insert_x, insert_y)
        try:
            page.insert_text(
                insert_pt,
                line,
                fontname=fitz_font,
                fontsize=font_size,
                color=color,
            )
        except Exception as e:
            logger.warning(f"insert_text failed for line {i}: {e}")


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

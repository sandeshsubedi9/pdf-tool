import io
import math
import base64
import fitz  # PyMuPDF
from PIL import Image
from fastapi import UploadFile
from typing import Optional


# Map friendly font names → built-in fitz base font names
FONT_MAP = {
    "Arial": "helv",
    "Arial Unicode MS": "helv",
    "Impact": "helv",
    "Verdana": "helv",
    "Courier": "cour",
    "Comic": "helv",
    "Times New Roman": "tiro",
    "Georgia": "tiro",
}

FORCE_BOLD = {"Impact"}

POSITION_GRID = {
    "TL": (0.04, 0.04), "TC": (0.5, 0.04), "TR": (0.96, 0.04),
    "ML": (0.04, 0.5), "MC": (0.5, 0.5), "MR": (0.96, 0.5),
    "BL": (0.04, 0.96), "BC": (0.5, 0.96), "BR": (0.96, 0.96),
}


def _hex_to_rgb(hex_color: str) -> tuple[float, float, float]:
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return r / 255.0, g / 255.0, b / 255.0


def _resolve_font(base: str, bold: bool, italic: bool) -> str:
    if base == "helv":
        if bold and italic: return "hebi"   # Helvetica-BoldOblique
        elif bold: return "hebo"             # Helvetica-Bold
        elif italic: return "heit"           # Helvetica-Oblique (italic)
        return "helv"
    elif base == "tiro":
        if bold and italic: return "tibi"
        elif bold: return "tibo"
        elif italic: return "tiit"
        return "tiro"
    elif base == "cour":
        if bold and italic: return "cobi"
        elif bold: return "cobo"
        elif italic: return "coit"
        return "cour"
    return base


def _parse_page_range(page_range_str: str, total: int) -> list[int]:
    """
    Parse a page range string like '1-5,7,9-12' into 0-indexed page numbers.
    Returns sorted unique list of valid 0-indexed page indices.
    """
    if not page_range_str.strip() or page_range_str.strip().lower() == "all":
        return list(range(total))

    indices = set()
    for part in page_range_str.split(","):
        part = part.strip()
        if "-" in part:
            try:
                a, b = part.split("-", 1)
                start = max(1, int(a.strip()))
                end = min(total, int(b.strip()))
                for i in range(start, end + 1):
                    indices.add(i - 1)
            except ValueError:
                pass
        else:
            try:
                n = int(part)
                if 1 <= n <= total:
                    indices.add(n - 1)
            except ValueError:
                pass

    return sorted(indices)


async def add_watermark(
    file: UploadFile,
    watermark_type: str = "text",           # "text" or "image"
    # Text-specific
    text: str = "CONFIDENTIAL",
    font_name: str = "Arial",
    font_size: float = 48.0,
    bold: bool = False,
    italic: bool = False,
    underline: bool = False,
    text_color: str = "#000000",
    # Image-specific
    image_data: str = "",                  # base64-encoded image
    image_width_pct: float = 30.0,        # image width as % of page width
    # Shared
    position: str = "MC",                  # 9-grid position
    opacity: float = 0.5,                  # 0.0 - 1.0
    rotation: float = 0.0,                 # degrees
    layer: str = "over",                   # "over" or "under"
    page_range: str = "all",              # e.g. "1-5,7" or "all"
) -> tuple[bytes, str]:
    """
    Stamp a text or image watermark onto a PDF.
    Returns (pdf_bytes, output_filename).
    """
    pdf_bytes = await file.read()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    total = len(doc)
    pages_to_watermark = _parse_page_range(page_range, total)

    # Multiple positions support
    pos_list = [p.strip() for p in position.split(",")]

    # Process image exactly ONCE before looping
    pre_img_bytes = None
    pre_img_w = 0
    pre_img_h = 0
    pre_unrotated_w = 0

    if watermark_type == "image" and image_data:
        try:
            raw_bytes = base64.b64decode(image_data)
            with Image.open(io.BytesIO(raw_bytes)) as img:
                img = img.convert("RGBA")
                if opacity < 1.0:
                    alpha = img.getchannel('A')
                    new_alpha = alpha.point(lambda i: int(i * opacity))
                    img.putalpha(new_alpha)
                
                pre_unrotated_w, _ = img.size

                if int(rotation) % 360 != 0:
                    img = img.rotate(-rotation, expand=True, resample=Image.BICUBIC)
                
                out_io = io.BytesIO()
                img.save(out_io, format="PNG")
                pre_img_bytes = out_io.getvalue()
                pre_img_w, pre_img_h = img.size
        except Exception as e:
            print(f"Failed to pre-process watermark image: {e}")

    for page_idx in pages_to_watermark:
        page = doc[page_idx]
        rect = page.rect
        pw, ph = rect.width, rect.height

        for pos in pos_list:
            pos_fractions = POSITION_GRID.get(pos, (0.5, 0.5))
            # Anchor point in page coordinates
            anchor_x = rect.x0 + pos_fractions[0] * pw
            anchor_y = rect.y0 + pos_fractions[1] * ph

            if watermark_type == "image" and pre_img_bytes:
                _stamp_image(
                    page, pre_img_bytes, pre_img_w, pre_img_h, pre_unrotated_w,
                    anchor_x, anchor_y, pw, image_width_pct, layer, pos_fractions
                )
            elif watermark_type == "text":
                _stamp_text(
                    page, text, font_name, font_size, bold, italic, underline,
                    text_color, anchor_x, anchor_y, pw, ph,
                    opacity, rotation, layer, pos_fractions
                )

    out_bytes = doc.tobytes(garbage=4, deflate=True)
    doc.close()

    base = (file.filename or "document").rsplit(".", 1)[0]
    return out_bytes, f"{base}_watermarked.pdf"


def _stamp_text(page, text, font_name, font_size, bold, italic, underline,
                text_color, cx, cy, pw, ph, opacity, rotation, layer, pos_fractions):
    """Stamp text watermark using system fonts for correct bold/italic rendering."""
    color = _hex_to_rgb(text_color)
    use_bold = bold or (font_name in FORCE_BOLD)

    # Build a fitz.Font with proper italic/bold flags so the PDF embeds real italic glyphs
    sys_name = font_name if font_name else "Arial"
    try:
        font = fitz.Font(fontname=sys_name, is_bold=int(use_bold), is_italic=int(italic))
    except Exception:
        # Fall back to Helvetica Base14 family
        base = FONT_MAP.get(font_name, "helv")
        alias = _resolve_font(base, use_bold, italic)
        try:
            font = fitz.Font(fontname=alias)
        except Exception:
            font = fitz.Font(fontname="helv")

    tw = font.text_length(text, fontsize=font_size)
    th = font_size

    h_frac, v_frac = pos_fractions
    insert_x = cx - (h_frac * tw)
    insert_y = cy - (v_frac * th) + th * 0.8

    pivot = fitz.Point(insert_x + tw / 2, insert_y - th * 0.3)
    mat = fitz.Matrix(-rotation)
    morph_arg = (pivot, mat) if rotation % 360 != 0 else None

    # ── Text ─────────────────────────────────────────────────────────────────
    writer = fitz.TextWriter(page.rect)
    writer.append(fitz.Point(insert_x, insert_y), text, font=font, fontsize=font_size)
    writer.write_text(page, color=color, opacity=opacity,
                      overlay=(layer == "over"), morph=morph_arg)

    # ── Underline (separate draw_line — TextWriter underline not in all versions) ──
    if underline:
        ul_y = insert_y + 2
        ul_w = max(0.5, font_size * 0.04)
        p1, p2 = fitz.Point(insert_x, ul_y), fitz.Point(insert_x + tw, ul_y)
        try:
            page.draw_line(p1, p2, color=color, width=ul_w,
                           morph=morph_arg, overlay=(layer == "over"),
                           stroke_opacity=opacity)
        except TypeError:
            page.draw_line(p1, p2, color=color, width=ul_w,
                           morph=morph_arg, overlay=(layer == "over"))


def _stamp_image(page, img_bytes, img_w, img_h, unrotated_w, cx, cy, page_width, width_pct, layer, pos_fractions):
    """Stamp an image watermark with proper alignment."""
    try:
        # Scale to desired width relative to page based on UNROTATED dimensions, just like CSS
        unrotated_target_w = page_width * (width_pct / 100.0)
        scale = unrotated_target_w / unrotated_w if unrotated_w > 0 else 1
        
        target_w = img_w * scale
        target_h = img_h * scale

        # Use pos_fractions to align corners to anchors
        h_frac, v_frac = pos_fractions
        x0 = cx - (h_frac * target_w)
        y0 = cy - (v_frac * target_h)
        x1 = x0 + target_w
        y1 = y0 + target_h
        img_rect = fitz.Rect(x0, y0, x1, y1)

        page.insert_image(
            img_rect,
            stream=img_bytes,
            overlay=(layer == "over"),
        )
    except Exception as e:
        print(f"Image stamping error: {e}")
        return


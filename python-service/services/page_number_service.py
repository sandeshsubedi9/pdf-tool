import io
import fitz  # PyMuPDF
from fastapi import UploadFile


# Map friendly font names → built-in fitz/PDF base font names
FONT_MAP = {
    "Arial": "helv",
    "Arial Unicode MS": "helv",
    "Impact": "helv",          # fitz has no Impact – fall back to Helvetica bold
    "Verdana": "helv",
    "Courier": "cour",
    "Comic": "helv",           # no Comic Sans in base fonts
    "Times New Roman": "tiro",
    "Lohit Marathi": "helv",
    "Lohit Devanagari": "helv",
}

# For fonts we want bold by default (Impact)
FORCE_BOLD = {"Impact"}


async def add_page_numbers(
    file: UploadFile,
    # Position: "TL","TC","TR","ML","MC","MR","BL","BC","BR"
    position: str = "BC",
    margin: float = 36.0,         # points
    first_number: int = 1,
    from_page: int = 1,
    to_page: int = 0,             # 0 means last page
    text_template: str = "Page {n}",   # supports {n} and {total}
    custom_text: str = "",        # if set, overrides text_template
    font_name: str = "Arial",
    font_size: float = 12.0,
    bold: bool = False,
    italic: bool = False,
    underline: bool = False,
    text_color: str = "#000000",  # hex
) -> tuple[bytes, str]:
    """
    Stamp page numbers (or any text containing {n}/{total}) onto a PDF.
    Returns (pdf_bytes, output_filename).
    """
    pdf_bytes = await file.read()

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    total_pages = len(doc)

    # Clamp page range (convert to 0-indexed)
    fp = max(1, from_page) - 1
    tp = (min(total_pages, to_page) - 1) if to_page > 0 else total_pages - 1

    # Parse hex color → (r, g, b) floats 0‒1
    color = _hex_to_rgb(text_color)

    # Choose font
    base_font = FONT_MAP.get(font_name, "helv")
    use_bold = bold or (font_name in FORCE_BOLD)

    # Determine the actual font key fitz uses for bold/italic combos
    fitz_font = _resolve_font(base_font, use_bold, italic)

    # Resolve template
    template = custom_text if custom_text.strip() else text_template

    for i, page in enumerate(doc):
        if i < fp or i > tp:
            continue

        page_number = first_number + (i - fp)
        label = template.replace("{n}", str(page_number)).replace("{total}", str(total_pages))

        rect = page.rect  # page bounding box in points
        x, y = _compute_position(rect, position, margin, font_size)

        # Measure text width to centre/right-align
        text_width = fitz.get_text_length(label, fontname=fitz_font, fontsize=font_size)

        # Adjust x for centre/right alignment
        if position[1] == "C":       # ?C → horizontally centred
            x = x - text_width / 2
        elif position[1] == "R":     # ?R → right aligned
            x = x - text_width

        page.insert_text(
            (x, y),
            label,
            fontname=fitz_font,
            fontsize=font_size,
            color=color,
        )

        if underline:
            _draw_underline(page, x, y, text_width, font_size, color)

    out_bytes = doc.tobytes(garbage=4, deflate=True)
    doc.close()

    base = (file.filename or "document").rsplit(".", 1)[0]
    output_filename = f"{base}_numbered.pdf"
    return out_bytes, output_filename


# ── helpers ──────────────────────────────────────────────────────────────────

def _hex_to_rgb(hex_color: str) -> tuple[float, float, float]:
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return r / 255.0, g / 255.0, b / 255.0


def _resolve_font(base: str, bold: bool, italic: bool) -> str:
    """Return the correct fitz built-in font name string."""
    if base == "helv":
        if bold and italic:
            return "helv-boldoblique" if False else "hebo"   # Helvetica-BoldOblique
        elif bold:
            return "hebo"   # Helvetica-Bold (fitz alias)
        elif italic:
            return "heob"   # Helvetica-Oblique (fitz alias)
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


def _compute_position(
    rect: fitz.Rect,
    position: str,
    margin: float,
    font_size: float,
) -> tuple[float, float]:
    """
    Compute the insertion (x, y) anchor for insert_text.
    insert_text places the baseline at y, so we add font_size for top rows.
    Position codes: TL TC TR  ML MC MR  BL BC BR
    """
    row = position[0]   # T, M, B
    col = position[1]   # L, C, R

    # x anchor (for left-aligned; caller adjusts for C/R)
    if col == "L":
        x = rect.x0 + margin
    elif col == "C":
        x = rect.x0 + rect.width / 2   # will be offset by caller
    else:  # R
        x = rect.x1 - margin            # will be offset by caller

    # y: fitz default (y0 is top, y1 is bottom)
    if row == "T":
        y = rect.y0 + margin + font_size  # Near top (y baseline)
    elif row == "M":
        y = rect.y0 + rect.height / 2
    else:  # B
        y = rect.y1 - margin              # Near bottom

    return x, y


def _draw_underline(page, x, y, width, font_size, color):
    """Draw a thin line below the text to simulate underline."""
    underline_y = y + 2  # slight offset below baseline
    page.draw_line(
        fitz.Point(x, underline_y),
        fitz.Point(x + width, underline_y),
        color=color,
        width=0.8,
    )

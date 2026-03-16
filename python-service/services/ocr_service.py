"""
ocr_service.py
Converts scanned / image-only PDFs into searchable, selectable-text PDFs
using ocrmypdf (which wraps Tesseract OCR internally).

Requirements:
  - ocrmypdf  (pip install ocrmypdf)
  - Tesseract must be installed on the system:
      Windows: https://github.com/UB-Mannheim/tesseract/wiki
              (download installer, tick "Add to PATH" during setup)
  - Ghostscript (optional but recommended for PDF/A output, quality boost)
"""

import io
import os
import tempfile
import logging
import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


def _has_selectable_text(pdf_bytes: bytes) -> bool:
    """
    Quick heuristic: open the PDF with PyMuPDF and check whether any page
    contains at least one character of extractable text.
    Returns True if the doc already has real text on at least one page.
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page in doc:
            text = page.get_text("text").strip()
            if text:
                doc.close()
                return True
        doc.close()
    except Exception:
        pass
    return False


async def ocr_pdf(file, language: str = "eng", force: bool = False) -> tuple[bytes, str]:
    """
    Run OCR on an uploaded PDF file.

    Parameters
    ----------
    file        : UploadFile  – the PDF file sent by the client
    language    : str         – Tesseract language code(s), e.g. "eng", "eng+fra"
    force       : bool        – if True, re-OCR even if text is already present

    Returns
    -------
    (pdf_bytes, output_filename)
    """
    import ocrmypdf

    # Add Tesseract to PATH manually if on Windows
    # because recent Tesseract installers don't do it automatically
    if os.name == 'nt':
        tess_path = r"C:\Program Files\Tesseract-OCR"
        if os.path.exists(tess_path) and tess_path.lower() not in os.environ["PATH"].lower():
            os.environ["PATH"] += os.pathsep + tess_path

    pdf_bytes = await file.read()

    if not pdf_bytes:
        raise ValueError("Uploaded file is empty.")

    base_name = os.path.splitext(file.filename or "document")[0]
    output_filename = f"{base_name}-searchable.pdf"

    # Check if OCR is actually needed (skip if already has text and not forced)
    already_has_text = _has_selectable_text(pdf_bytes)
    if already_has_text and not force:
        logger.info(f"PDF '{file.filename}' already has selectable text. Skipping OCR.")
        # Return the original file with a note via a special header we'll set in main.py
        return pdf_bytes, output_filename, True  # type: ignore[return-value]

    # Write input to a temp file (ocrmypdf works with file paths)
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_in:
        tmp_in.write(pdf_bytes)
        tmp_in_path = tmp_in.name

    tmp_out_path = tmp_in_path.replace(".pdf", "-ocr.pdf")

    try:
        ocrmypdf.ocr(
            tmp_in_path,
            tmp_out_path,
            language=language,
            # Keep the original page images intact (don't alter visual appearance)
            skip_text=True,       # Don't re-OCR pages that already have text
            deskew=True,          # Auto-straighten skewed scans
            rotate_pages=True,    # Auto-fix rotation
            optimize=1,           # Light compression (0=none, 3=max)
            progress_bar=False,
        )

        with open(tmp_out_path, "rb") as f:
            result_bytes = f.read()

        logger.info(
            f"OCR complete: '{file.filename}' → '{output_filename}' "
            f"({len(pdf_bytes):,} → {len(result_bytes):,} bytes)"
        )
        return result_bytes, output_filename, False  # type: ignore[return-value]

    finally:
        # Clean up temp files
        try:
            os.unlink(tmp_in_path)
        except Exception:
            pass
        try:
            os.unlink(tmp_out_path)
        except Exception:
            pass

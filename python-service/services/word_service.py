import io
import os
import tempfile
import logging
from fastapi import HTTPException, UploadFile
from pdf2docx import Converter

logger = logging.getLogger(__name__)

async def convert_pdf_to_word(file: UploadFile):
    """
    Convert a PDF file to a DOCX Word document.
    Preserves layout, tables, images, fonts, and formatting using pdf2docx.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are accepted. Please upload a .pdf file.",
        )

    logger.info(f"Converting file: {file.filename}")

    # Read uploaded PDF bytes
    pdf_bytes = await file.read()

    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Use temp files because pdf2docx works with file paths, not byte streams
    with tempfile.TemporaryDirectory() as tmpdir:
        pdf_path = os.path.join(tmpdir, "input.pdf")
        docx_path = os.path.join(tmpdir, "output.docx")

        # Write PDF to temp file
        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes)

        try:
            # Convert using pdf2docx – this is the magic that preserves layout
            cv = Converter(pdf_path)
            cv.convert(docx_path, start=0, end=None)
            cv.close()
        except Exception as e:
            logger.error(f"Conversion failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Conversion failed: {str(e)}",
            )

        # Read the resulting DOCX into memory
        with open(docx_path, "rb") as f:
            docx_bytes = f.read()

    # Build the output filename
    base_name = os.path.splitext(file.filename)[0]
    output_filename = f"{base_name}.docx"

    return docx_bytes, output_filename

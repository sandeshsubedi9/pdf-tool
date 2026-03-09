import io
import os
import logging
import zipfile
from fastapi import HTTPException, UploadFile
import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

async def convert_pdf_to_images(file: UploadFile, format: str = "jpg"):
    """
    Convert a PDF file to images (JPG or PNG).
    - Single page PDFs return the raw image bytes.
    - Multi-page PDFs return a ZIP file containing all images.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are accepted. Please upload a .pdf file.",
        )

    logger.info(f"Converting to {format.upper()}: {file.filename}")

    pdf_bytes = await file.read()
    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_pages = len(doc)
        
        # Extensions mapping
        ext = "jpg" if format.lower() == "jpg" else "png"
        mime = "image/jpeg" if format.lower() == "jpg" else "image/png"
        
        base_name = os.path.splitext(file.filename)[0]

        if total_pages == 1:
            # Single page: return image directly
            page = doc.load_page(0)
            pix = page.get_pixmap(matrix=fitz.Matrix(300/72, 300/72))
            img_data = pix.tobytes(ext)
            doc.close()
            return img_data, f"{base_name}.{ext}", mime
        else:
            # Multi-page: create a ZIP in memory
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
                for i in range(total_pages):
                    page = doc.load_page(i)
                    pix = page.get_pixmap(matrix=fitz.Matrix(300/72, 300/72))
                    img_data = pix.tobytes(ext)
                    img_name = f"{base_name}-page-{i+1}.{ext}"
                    zip_file.writestr(img_name, img_data)
            
            doc.close()
            return zip_buffer.getvalue(), f"{base_name}-images.zip", "application/zip"

    except Exception as e:
        logger.error(f"Image conversion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")

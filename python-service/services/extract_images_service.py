import io
import os
import logging
import zipfile
from fastapi import HTTPException, UploadFile
import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


async def extract_images_from_pdf(file: UploadFile):
    """
    Extract all embedded images from a PDF file.
    Returns a list of (image_bytes, image_name, mime_type) tuples.
    If no images found, returns an empty list.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are accepted. Please upload a .pdf file.",
        )

    logger.info(f"Extracting images from: {file.filename}")

    pdf_bytes = await file.read()
    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        base_name = os.path.splitext(file.filename)[0]
        images_found = []

        for page_index in range(len(doc)):
            page = doc.load_page(page_index)
            image_list = page.get_images(full=True)

            for img_index, img_info in enumerate(image_list):
                xref = img_info[0]
                try:
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    image_ext = base_image["ext"]  # e.g. 'jpeg', 'png', 'jp2'

                    # Normalise extension
                    if image_ext in ("jpeg", "jpg"):
                        mime = "image/jpeg"
                        image_ext = "jpg"
                    elif image_ext == "png":
                        mime = "image/png"
                    elif image_ext in ("jp2", "jpx"):
                        mime = "image/jp2"
                        image_ext = "jp2"
                    else:
                        mime = f"image/{image_ext}"

                    img_name = f"{base_name}-page{page_index+1}-img{img_index+1}.{image_ext}"
                    images_found.append((image_bytes, img_name, mime))
                except Exception as e:
                    logger.warning(f"Could not extract image xref={xref}: {e}")
                    continue

        doc.close()
        return images_found

    except Exception as e:
        logger.error(f"Image extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


async def extract_images_as_zip(file: UploadFile):
    """
    Extract all embedded images from a PDF and return them packed in a ZIP.
    Returns (zip_bytes, zip_filename) or (None, None) if no images found.
    """
    images = await extract_images_from_pdf(file)

    if not images:
        return None, None

    base_name = os.path.splitext(file.filename)[0]
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for image_bytes, img_name, _ in images:
            zf.writestr(img_name, image_bytes)

    return zip_buffer.getvalue(), f"{base_name}-extracted-images.zip"

import io
import json
import base64
import logging
from fastapi import FastAPI, File, Form, UploadFile, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse

# Import our separate services
from services.word_service import convert_pdf_to_word
from services.excel_service import convert_pdf_to_excel
from services.pptx_service import convert_pdf_to_pptx
from services.image_service import convert_pdf_to_images
from services.extract_images_service import extract_images_from_pdf
from services.epub_service import convert_pdf_to_epub
from services.pdfa_service import convert_pdf_to_pdfa
from services.txt_service import convert_pdf_to_txt
from services.word_to_pdf_service import convert_word_to_pdf
from services.excel_to_pdf_service import convert_excel_to_pdf
from services.pptx_to_pdf_service import convert_pptx_to_pdf
from services.compress_service import compress_pdf
from services.repair_service import repair_pdf
from services.protect_service import protect_pdf
from services.unlock_service import unlock_pdf
import fitz  # PyMuPDF

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PDF Tools Microservice",
    description="Backend microservice for high-fidelity PDF conversions",
    version="1.4.0",
)

# Allow requests from the Next.js dev server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "service": "pdf-tools-microservice"}

@app.post("/convert/pdf-to-word")
async def pdf_to_word(file: UploadFile = File(...)):
    """
    Endpoint for PDF to Word conversion.
    Handled by services/word_service.py
    """
    docx_bytes, output_filename = await convert_pdf_to_word(file)
    
    logger.info(f"Successfully converted '{file.filename}' → '{output_filename}'")

    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{output_filename}"',
            "X-Original-Filename": output_filename,
        },
    )

@app.post("/convert/word-to-pdf")
async def word_to_pdf(file: UploadFile = File(...)):
    """
    Endpoint for Word to PDF conversion.
    Handled by services/word_to_pdf_service.py
    """
    pdf_bytes, output_filename = await convert_word_to_pdf(file)
    
    logger.info(f"Successfully converted '{file.filename}' → '{output_filename}'")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{output_filename}"',
            "X-Original-Filename": output_filename,
        },
    )

@app.post("/convert/pdf-to-excel")
async def pdf_to_excel(file: UploadFile = File(...)):
    """
    Endpoint for PDF to Excel conversion.
    Handled by services/excel_service.py
    """
    xlsx_bytes, output_filename = await convert_pdf_to_excel(file)

    logger.info(f"Successfully converted '{file.filename}' → '{output_filename}'")

    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{output_filename}"',
            "X-Original-Filename": output_filename,
        },
    )

@app.post("/convert/excel-to-pdf")
async def excel_to_pdf(file: UploadFile = File(...)):
    """
    Endpoint for Excel to PDF conversion.
    Handled by services/excel_to_pdf_service.py
    """
    pdf_bytes, output_filename = await convert_excel_to_pdf(file)
    
    logger.info(f"Successfully converted '{file.filename}' → '{output_filename}'")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{output_filename}"',
            "X-Original-Filename": output_filename,
        },
    )

@app.post("/convert/pdf-to-pptx")
async def pdf_to_pptx(file: UploadFile = File(...)):
    """
    Endpoint for PDF to PowerPoint conversion.
    Handled by services/pptx_service.py
    """
    pptx_bytes, output_filename = await convert_pdf_to_pptx(file)

    logger.info(f"Successfully converted '{file.filename}' → '{output_filename}'")

    return StreamingResponse(
        io.BytesIO(pptx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={
            "Content-Disposition": f'attachment; filename="{output_filename}"',
            "X-Original-Filename": output_filename,
        },
    )

@app.post("/convert/pptx-to-pdf")
async def pptx_to_pdf(file: UploadFile = File(...)):
    """
    Endpoint for PowerPoint to PDF conversion.
    Handled by services/pptx_to_pdf_service.py
    """
    pdf_bytes, output_filename = await convert_pptx_to_pdf(file)
    
    logger.info(f"Successfully converted '{file.filename}' → '{output_filename}'")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{output_filename}"',
            "X-Original-Filename": output_filename,
        },
    )

@app.post("/convert/pdf-to-epub")
async def pdf_to_epub(file: UploadFile = File(...)):
    """
    Endpoint for PDF to EPUB conversion.
    Handled by services/epub_service.py
    """
    epub_bytes, output_filename = await convert_pdf_to_epub(file)

    logger.info(f"Successfully converted '{file.filename}' → '{output_filename}'")

    return StreamingResponse(
        io.BytesIO(epub_bytes),
        media_type="application/epub+zip",
        headers={
            "Content-Disposition": f'attachment; filename="{output_filename}"',
            "X-Original-Filename": output_filename,
        },
    )

@app.post("/convert/pdf-to-image")
async def pdf_to_image(
    file: UploadFile = File(...), 
    format: str = Query("jpg", description="Output format (jpg or png)")
):
    """
    Endpoint for PDF to Image (JPG/PNG) conversion.
    Handled by services/image_service.py
    """
    img_data, output_filename, mime_type = await convert_pdf_to_images(file, format)

    logger.info(f"Successfully converted '{file.filename}' → '{output_filename}'")

    return StreamingResponse(
        io.BytesIO(img_data),
        media_type=mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{output_filename}"',
            "X-Original-Filename": output_filename,
        },
    )


@app.post("/convert/pdf-pages-to-jpg")
async def pdf_pages_to_jpg(
    file: UploadFile = File(...),
    dpi: int = Query(150, description="DPI for rendering (72–300)")
):
    """
    Render every PDF page as a JPG and return them as a JSON array.
    Each element: { pageNum, dataUrl, name }
    dataUrl is base64-encoded JPEG (data:image/jpeg;base64,...).
    """
    from fastapi import HTTPException
    import os

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await file.read()
    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        base_name = os.path.splitext(file.filename)[0]
        scale = dpi / 72.0
        matrix = fitz.Matrix(scale, scale)

        pages = []
        for i in range(len(doc)):
            page = doc.load_page(i)
            pix = page.get_pixmap(matrix=matrix)
            jpg_bytes = pix.tobytes("jpg")
            b64 = base64.b64encode(jpg_bytes).decode("utf-8")
            data_url = f"data:image/jpeg;base64,{b64}"
            pages.append({
                "pageNum": i + 1,
                "dataUrl": data_url,
                "name": f"{base_name}-page-{i+1}.jpg",
            })

        doc.close()
        logger.info(f"Rendered {len(pages)} pages from '{file.filename}'")
        return JSONResponse(content={"pages": pages, "total": len(pages)})

    except Exception as e:
        logger.error(f"Page rendering failed: {e}")
        raise HTTPException(status_code=500, detail=f"Rendering failed: {str(e)}")


@app.post("/convert/pdf-extract-images")
async def pdf_extract_images(file: UploadFile = File(...)):
    """
    Extract all embedded images from a PDF file.
    Returns a JSON array of { name, dataUrl, mimeType } objects.
    If no images found, returns { images: [], total: 0 }.
    """
    images = await extract_images_from_pdf(file)

    result = []
    for image_bytes, img_name, mime in images:
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        data_url = f"data:{mime};base64,{b64}"
        result.append({
            "name": img_name,
            "dataUrl": data_url,
            "mimeType": mime,
        })

    logger.info(f"Extracted {len(result)} images from '{file.filename}'")
    return JSONResponse(content={"images": result, "total": len(result)})

@app.post("/convert/pdf-to-pdfa")
async def pdf_to_pdfa(
    file: UploadFile = File(...),
    conformance_level: str = Form("1b"),
):
    """
    Endpoint for PDF to PDF/A conversion.
    conformance_level: one of '1b', '2b', '3b'
    Handled by services/pdfa_service.py
    """
    import io
    pdfa_bytes, output_filename = await convert_pdf_to_pdfa(file, conformance_level)

    logger.info(f"Successfully converted '{file.filename}' → '{output_filename}' (PDF/A-{conformance_level.upper()})")

    return StreamingResponse(
        io.BytesIO(pdfa_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{output_filename}"',
            "X-Original-Filename": output_filename,
        },
    )
@app.post("/compress/pdf")
async def compress_pdf_endpoint(
    file: UploadFile = File(...),
    quality: str = Form("medium"),
):
    """
    Compress a PDF file.
    quality: 'high' (aggressive), 'medium' (recommended), 'low' (light).
    Returns PDF file with X-Original-Size and X-Compressed-Size response headers.
    """
    compressed_bytes, output_filename, original_size, compressed_size = await compress_pdf(file, quality)

    logger.info(
        f"Compressed '{file.filename}' ({original_size} → {compressed_size} bytes, "
        f"{round((1 - compressed_size / original_size) * 100, 1)}% reduction)"
    )

    return StreamingResponse(
        io.BytesIO(compressed_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{output_filename}"',
            "X-Original-Filename": output_filename,
            "X-Original-Size": str(original_size),
            "X-Compressed-Size": str(compressed_size),
        },
    )

@app.post("/repair/pdf")
async def repair_pdf_endpoint(file: UploadFile = File(...)):
    """
    Repair a PDF file.
    """
    try:
        repaired_bytes, output_filename = await repair_pdf(file)
        
        logger.info(f"Successfully repaired '{file.filename}' → '{output_filename}'")

        return StreamingResponse(
            io.BytesIO(repaired_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{output_filename}"',
                "X-Original-Filename": output_filename,
            },
        )
    except Exception as e:
        from fastapi import HTTPException
        logger.error(f"Error repairing PDF: {e}")
        raise HTTPException(status_code=400, detail="The PDF is too severely damaged to be repaired.")

@app.post("/protect/pdf")
async def protect_pdf_endpoint(
    file: UploadFile = File(...),
    password: str = Form(...)
):
    """
    Protect a PDF file by setting a password.
    """
    try:
        protected_bytes, output_filename = await protect_pdf(file, password)
        
        logger.info(f"Successfully protected '{file.filename}' → '{output_filename}'")

        return StreamingResponse(
            io.BytesIO(protected_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{output_filename}"',
                "X-Original-Filename": output_filename,
            },
        )
    except Exception as e:
        from fastapi import HTTPException
        logger.error(f"Error protecting PDF: {e}")
        raise HTTPException(status_code=500, detail="Failed to protect the PDF.")

@app.post("/unlock/pdf")
async def unlock_pdf_endpoint(
    file: UploadFile = File(...),
    password: str = Form(...)
):
    """
    Unlock a password-protected PDF file.
    """
    try:
        unlocked_bytes, output_filename = await unlock_pdf(file, password)
        
        logger.info(f"Successfully unlocked '{file.filename}' → '{output_filename}'")

        return StreamingResponse(
            io.BytesIO(unlocked_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{output_filename}"',
                "X-Original-Filename": output_filename,
            },
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error unlocking PDF: {e}")
        raise HTTPException(status_code=500, detail="Failed to unlock the PDF.")

@app.post("/convert/pdf-to-txt")
async def pdf_to_txt(file: UploadFile = File(...)):
    """
    Endpoint for PDF to Text extraction.
    Handled by services/txt_service.py
    """
    txt_bytes, output_filename = await convert_pdf_to_txt(file)
    
    logger.info(f"Successfully extracted text from '{file.filename}' → '{output_filename}'")

    return StreamingResponse(
        io.BytesIO(txt_bytes),
        media_type="text/plain",
        headers={
            "Content-Disposition": f'attachment; filename="{output_filename}"',
            "X-Original-Filename": output_filename,
        },
    )

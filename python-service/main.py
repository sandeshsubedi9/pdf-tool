import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    # Uvicorn on Windows defaults to WindowsSelectorEventLoopPolicy, which doesn't support subprocesses.
    # When using reload=True, Uvicorn workers import main:app and set their own loop policy.
    # We monkey-patch Uvicorn here to prevent it from changing the policy back to Selector.
    try:
        from uvicorn.loops import asyncio as uvicorn_asyncio
        def custom_asyncio_setup(*args, **kwargs):
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        uvicorn_asyncio.asyncio_setup = custom_asyncio_setup
    except Exception:
        pass
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
from services.images_to_pdf_service import convert_images_to_pdf
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
from services.page_number_service import add_page_numbers
from services.watermark_service import add_watermark
from services.crop_service import crop_pdf
from services.translate_service import translate_pdf
from services.ocr_service import ocr_pdf
from services.url_to_pdf_service import convert_url_to_pdf, get_rendered_html
from services.edit_pdf_service import extract_pdf_content, apply_pdf_edits, render_clean_page
from services.redact_pdf_service import apply_redactions_standalone
from services.compare_pdf_service import compare_pdfs
import fitz  # PyMuPDF

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PDF Maya Service",
    description="Backend microservice for high-fidelity PDF conversions",
    version="1.4.0",
)

# Allow requests from the Next.js dev server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow web dev + mobile app (Expo tunnel)
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "service": "pdf-maya-service"}

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

@app.post("/edit/add-page-numbers")
async def add_page_numbers_endpoint(
    file: UploadFile = File(...),
    position: str = Form("BC"),
    margin: float = Form(36.0),
    first_number: int = Form(1),
    from_page: int = Form(1),
    to_page: int = Form(0),
    text_template: str = Form("Page {n}"),
    custom_text: str = Form(""),
    font_name: str = Form("Arial"),
    font_size: float = Form(12.0),
    bold: str = Form("false"),
    italic: str = Form("false"),
    underline: str = Form("false"),
    text_color: str = Form("#000000"),
):
    """
    Stamp page numbers (or custom text) onto a PDF.
    Handled by services/page_number_service.py
    """
    try:
        numbered_bytes, output_filename = await add_page_numbers(
            file=file,
            position=position,
            margin=margin,
            first_number=first_number,
            from_page=from_page,
            to_page=to_page,
            text_template=text_template,
            custom_text=custom_text,
            font_name=font_name,
            font_size=font_size,
            bold=(bold.lower() == "true"),
            italic=(italic.lower() == "true"),
            underline=(underline.lower() == "true"),
            text_color=text_color,
        )

        logger.info(f"Added page numbers to '{file.filename}' → '{output_filename}'")

        return StreamingResponse(
            io.BytesIO(numbered_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{output_filename}"',
                "X-Original-Filename": output_filename,
            },
        )
    except Exception as e:
        logger.error(f"Error adding page numbers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add page numbers: {str(e)}")


@app.post("/edit/add-watermark")
async def add_watermark_endpoint(
    file: UploadFile = File(...),
    watermark_type: str = Form("text"),
    # Text
    text: str = Form("CONFIDENTIAL"),
    font_name: str = Form("Arial"),
    font_size: float = Form(48.0),
    bold: str = Form("false"),
    italic: str = Form("false"),
    underline: str = Form("false"),
    text_color: str = Form("#000000"),
    # Image
    image_data: str = Form(""),
    image_width_pct: float = Form(30.0),
    # Shared
    position: str = Form("MC"),
    opacity: float = Form(0.5),
    rotation: float = Form(0.0),
    layer: str = Form("over"),
    page_range: str = Form("all"),
):
    """
    Stamp a text or image watermark onto a PDF.
    Handled by services/watermark_service.py
    """
    try:
        watermarked_bytes, output_filename = await add_watermark(
            file=file,
            watermark_type=watermark_type,
            text=text,
            font_name=font_name,
            font_size=font_size,
            bold=(bold.lower() == "true"),
            italic=(italic.lower() == "true"),
            underline=(underline.lower() == "true"),
            text_color=text_color,
            image_data=image_data,
            image_width_pct=image_width_pct,
            position=position,
            opacity=opacity,
            rotation=rotation,
            layer=layer,
            page_range=page_range,
        )

        logger.info(f"Added watermark to '{file.filename}' → '{output_filename}'")

        return StreamingResponse(
            io.BytesIO(watermarked_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{output_filename}"',
                "X-Original-Filename": output_filename,
            },
        )
    except Exception as e:
        logger.error(f"Error adding watermark: {e}")
        raise HTTPException(status_code=500, detail="Failed to add watermark due to an internal server error. Please try again.")

@app.post("/crop/pdf")
async def crop_pdf_endpoint(
    file: UploadFile = File(...),
    crops: str = Form(...),
):
    """
    Crop individual pages of a PDF.
    crops: JSON string of crop instructions, e.g.:
           [{"pageIndex": 0, "x": 5, "y": 5, "w": 90, "h": 90}]
    x, y, w, h are percentages (0-100) of page dimensions.
    """
    try:
        cropped_bytes, output_filename = await crop_pdf(file, crops)

        logger.info(f"Cropped '{file.filename}' → '{output_filename}'")

        return StreamingResponse(
            io.BytesIO(cropped_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{output_filename}"',
                "X-Original-Filename": output_filename,
            },
        )
    except Exception as e:
        logger.error(f"Error cropping PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to crop PDF: {str(e)}")


@app.post("/translate/pdf")
async def translate_pdf_endpoint(
    file: UploadFile = File(...),
    target_lang: str = Form("en")
):
    """
    Translates a PDF file to the specified target language while preserving layout.
    """
    try:
        translated_bytes, output_filename = await translate_pdf(file, target_lang)

        logger.info(f"Translated '{file.filename}' → '{output_filename}'")

        return StreamingResponse(
            io.BytesIO(translated_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{output_filename}"',
                "X-Original-Filename": output_filename,
            },
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error translating PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to translate PDF: {str(e)}")


@app.post("/ocr/pdf")
async def ocr_pdf_endpoint(
    file: UploadFile = File(...),
    language: str = Form("eng"),
    force: str = Form("false"),
):
    """
    Run OCR on a scanned / image-only PDF and return a searchable PDF.
    language: Tesseract language code(s), e.g. 'eng', 'eng+fra'. Defaults to 'eng'.
    force:    If 'true', re-OCR even if the PDF already has selectable text.
    """
    try:
        result = await ocr_pdf(
            file=file,
            language=language,
            force=(force.lower() == "true"),
        )
        ocr_bytes, output_filename, already_had_text = result

        logger.info(f"OCR processed '{file.filename}' → '{output_filename}' (already_had_text={already_had_text})")

        return StreamingResponse(
            io.BytesIO(ocr_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{output_filename}"',
                "X-Original-Filename": output_filename,
                "X-Already-Had-Text": "true" if already_had_text else "false",
            },
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error running OCR on PDF: {e}")
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")


@app.post("/convert/url-to-pdf")
async def url_to_pdf_endpoint(
    url: str = Form(None),
    html: str = Form(None),
    page_size: str = Form("a4"),
    orientation: str = Form("portrait"),
    margin: str = Form("none"),
    one_long_page: str = Form("false"),
    hide_cookie: str = Form("true"),
    viewport_width: str = Form("1280"),
):
    """
    Generate a PDF from a URL or raw HTML string using Playwright.
    """
    try:
        pdf_bytes, output_filename = await convert_url_to_pdf(
            url=url or "",
            html=html or "",
            page_size=page_size,
            orientation=orientation,
            margin=margin,
            one_long_page=(one_long_page.lower() == "true"),
            hide_cookie=(hide_cookie.lower() == "true"),
            viewport_width=int(viewport_width) if viewport_width and viewport_width.isdigit() else 1280
        )

        logger.info(f"Generated PDF from {'URL: ' + url if url else 'raw HTML'} → '{output_filename}'")

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{output_filename}"',
                "X-Original-Filename": output_filename,
            },
        )
    except ValueError as ve:
        logger.error(f"Validation error in URL-to-PDF: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Unexpected error in URL-to-PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


@app.post("/convert/url-to-html")
async def url_to_html_endpoint(
    url: str = Form(...),
):
    """
    Fetch the fully rendered HTML of a URL using Playwright.
    """
    try:
        html, title = await get_rendered_html(url)
        return JSONResponse(content={"html": html, "title": title, "url": url})
    except ValueError as ve:
        logger.error(f"Validation error in URL-to-HTML: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Unexpected error in URL-to-HTML: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch rendered HTML: {str(e)}")


from typing import List

@app.post("/convert/images-to-pdf")
async def images_to_pdf_endpoint(
    files: List[UploadFile] = File(...),
    page_size: str = Form("fit"),
    orientation: str = Form("portrait"),
    margin: str = Form("none"),
    merge_all: str = Form("true"),
):
    """
    Convert a list of images to a single PDF or multiple PDFs.
    """
    try:
        file_tuples = []
        for f in files:
            content = await f.read()
            file_tuples.append((f.filename, content))
        
        pdf_bytes, output_filename, mime_type = await convert_images_to_pdf(
            files=file_tuples,
            page_size=page_size,
            orientation=orientation,
            margin=margin,
            merge_all=(merge_all.lower() == "true")
        )

        logger.info(f"Generated PDF from {len(files)} images → '{output_filename}'")

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type=mime_type,
            headers={
                "Content-Disposition": f'attachment; filename="{output_filename}"',
                "X-Original-Filename": output_filename,
            },
        )
    except Exception as e:
        logger.error(f"Unexpected error in IMAGES-to-PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


@app.post("/edit/extract-content")
async def extract_content_endpoint(file: UploadFile = File(...)):
    """
    Extract text blocks and images from a PDF with their positions.
    Returns JSON that the frontend can use to create editable overlays.
    """
    try:
        result = await extract_pdf_content(file)
        logger.info(f"Extracted content from '{file.filename}': {result['total_pages']} pages")
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error extracting PDF content: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract content: {str(e)}")


@app.post("/edit/apply-edits")
async def apply_edits_endpoint(
    file: UploadFile = File(...),
    edits: str = Form(...),
):
    """
    Apply edits to a PDF: whiteout deleted/modified areas, draw new/modified content.
    edits: JSON string with { modified: [...], deleted: [...], added: [...] }
    """
    try:
        edited_bytes, output_filename = await apply_pdf_edits(file, edits)

        logger.info(f"Applied edits to '{file.filename}' → '{output_filename}'")

        return StreamingResponse(
            io.BytesIO(edited_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{output_filename}"',
                "X-Original-Filename": output_filename,
            },
        )
    except Exception as e:
        logger.error(f"Error applying PDF edits: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to apply edits: {str(e)}")


@app.post("/edit/render-clean-page")
async def render_clean_page_endpoint(
    file: UploadFile = File(...),
    page_number: int = Form(...),
    redactions: str = Form("[]"),
    dpi: int = Form(108),  # 1.5 scale of 72 DPI matches frontend SCALE=1.5
):
    """
    Renders a specific page to a base64 png dataUrl, applying any redactions (whiteouts) first.
    """
    try:
        data_url = await render_clean_page(file, page_number, redactions, dpi)
        return JSONResponse(content={"dataUrl": data_url})
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error rendering clean page: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to render page: {str(e)}")

@app.post("/redact/apply")
async def redact_apply_endpoint(
    file: UploadFile = File(...),
    redactions: str = Form("[]"),
):
    """
    Apply mathematical redactions to a PDF.
    redactions: JSON array of box objects {page, x_pct, y_pct, w_pct, h_pct}
    """
    try:
        redacted_bytes, output_filename = await apply_redactions_standalone(file, redactions)

        logger.info(f"Applied standalone redactions to '{file.filename}' → '{output_filename}'")

        return StreamingResponse(
            io.BytesIO(redacted_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{output_filename}"',
                "X-Original-Filename": output_filename,
            },
        )
    except Exception as e:
        logger.error(f"Error applying redactions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to apply redactions: {str(e)}")


@app.post("/compare/pdf")
async def compare_pdf_endpoint(
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...),
):
    """
    Compare two PDF files and return word-level diff data with normalised bounding boxes.
    file_a: The original (base) PDF.
    file_b: The modified (new) PDF.
    Returns JSON with page-by-page deletions and additions.
    """
    try:
        result = await compare_pdfs(file_a, file_b)
        logger.info(
            f"Compared '{file_a.filename}' vs '{file_b.filename}': "
            f"{result['summary']['total_deleted_words']} deletions, "
            f"{result['summary']['total_added_words']} additions across "
            f"{len(result['summary']['changed_pages'])} changed pages."
        )
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error comparing PDFs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to compare PDFs: {str(e)}")

import os
import io
import asyncio
import tempfile
import logging
from fastapi import UploadFile, HTTPException
from pdf2docx import Converter
from docx import Document
from deep_translator import GoogleTranslator

# Re-use the LibreOffice converter logic from word_to_pdf_service.py to turn the new DOCX back into a PDF
from services.word_to_pdf_service import _find_libreoffice, _run_libreoffice

logger = logging.getLogger(__name__)

async def translate_pdf(file: UploadFile, target_lang: str):
    """
    Translates a PDF document by:
    1. Converting it to a Word (.docx) document using pdf2docx.
    2. Translating the text inside the Word document using python-docx and deep_translator.
    3. Converting the translated Word document back to a PDF using LibreOffice.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    logger.info(f"Translating PDF to {target_lang}: {file.filename}")

    # Read uploaded PDF bytes
    pdf_bytes = await file.read()
    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Locate LibreOffice early to fail fast if it's missing
    try:
        soffice = _find_libreoffice()
    except RuntimeError as e:
        logger.error(str(e))
        raise HTTPException(status_code=503, detail=str(e))

    with tempfile.TemporaryDirectory() as temp_dir:
        input_pdf_path = os.path.join(temp_dir, "input.pdf")
        temp_docx_path = os.path.join(temp_dir, "temp_layout.docx")
        translated_docx_path = os.path.join(temp_dir, "translated.docx")
        final_pdf_path = os.path.join(temp_dir, "translated.pdf")

        # 1. Write PDF to temp file
        with open(input_pdf_path, "wb") as f:
            f.write(pdf_bytes)

        # 2. Convert PDF to DOCX
        try:
            logger.info("Converting PDF to DOCX (Step 1/3)...")
            cv = Converter(input_pdf_path)
            cv.convert(temp_docx_path, start=0, end=None)
            cv.close()
        except Exception as e:
            logger.error(f"PDF to DOCX conversion failed: {e}")
            raise HTTPException(
                status_code=500, 
                detail=f"Layout Extraction Failed: We couldn't parse the PDF structure. " 
                       f"This usually happens with very complex or scanned PDFs. Error: {str(e)}"
            )

        # 3. Translate the DOCX
        def do_translate():
            logger.info("Translating content (Step 2/3)...")
            # Initialize translator
            try:
                translator = GoogleTranslator(source='auto', target=target_lang)
            except Exception as e:
                logger.error(f"Failed to initialize translator: {e}")
                raise HTTPException(status_code=400, detail=f"Unsupported language code: {target_lang}")

            if not os.path.exists(temp_docx_path):
                 raise RuntimeError("Intermediate DOCX file was not found before translation.")

            doc = Document(temp_docx_path)
            
            # Helper to quickly translate text and avoid overriding blank spaces
            def xlate(text: str) -> str:
                stripped = text.strip()
                if not stripped or len(stripped) < 1:
                    return text
                try:
                    translated_val = translator.translate(stripped)
                    if not translated_val:
                        return text
                        
                    # Try to preserve starting/ending spaces simply
                    out = translated_val.strip()
                    if text.startswith(' '):
                        out = ' ' + out
                    if text.startswith('  '):
                        out = ' ' + out
                    if text.endswith(' '):
                        out = out + ' '
                    return out
                except Exception as e:
                    logger.warning(f"Translation failed for a text run: {e}")
                    return text

            # Translate Paragraphs
            for p in doc.paragraphs:
                for run in p.runs:
                    if run.text and run.text.strip():
                        run.text = xlate(run.text)

            # Translate Tables
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        for p in cell.paragraphs:
                            for run in p.runs:
                                if run.text and run.text.strip():
                                    run.text = xlate(run.text)

            # Let's save the file
            doc.save(translated_docx_path)

        # Run translation in thread pool
        try:
            await asyncio.to_thread(do_translate)
        except HTTPException as he:
            raise he
        except Exception as e:
            logger.error(f"Text translation failed (Step 2/3): {e}")
            raise HTTPException(
                status_code=500, 
                detail=f"Cloud Translation Failed: We couldn't translate the text content. "
                       f"Please try again in a few moments. Error: {str(e)}"
            )

        # 4. Convert translated DOCX back to PDF
        try:
            logger.info("Generating Final PDF (Step 3/3)...")
            if not os.path.exists(translated_docx_path):
                 raise RuntimeError("Translated DOCX file was not found.")
                 
            await asyncio.to_thread(_run_libreoffice, soffice, translated_docx_path, temp_dir)
        except Exception as e:
            logger.error(f"Final PDF generation failed (Step 3/3): {e}")
            raise HTTPException(
                status_code=500, 
                detail=f"PDF Generation Failed: We translated the text but couldn't rebuild the PDF file. "
                       f"Error: {str(e)}"
            )

        if not os.path.isfile(final_pdf_path):
            logger.error(f"Expected PDF at {final_pdf_path} not found.")
            raise HTTPException(
                status_code=500, 
                detail="System Error: The translated PDF was not generated correctly by the backend."
            )

        # Read the final PDF into memory
        with open(final_pdf_path, "rb") as f:
            pdf_bytes = f.read()

        # Build the output filename
        base_name = os.path.splitext(file.filename)[0]
        output_filename = f"{base_name}_{target_lang}.pdf"

    return pdf_bytes, output_filename

import io
import os
import tempfile
import logging
from fastapi import HTTPException, UploadFile
from pdf2docx import Converter
import mammoth
from ebooklib import epub
import re

logger = logging.getLogger(__name__)

async def convert_pdf_to_epub(file: UploadFile):
    """
    Advanced PDF to EPUB conversion via Word (DOCX).
    Logic:
    1. PDF -> DOCX (using pdf2docx for high-fidelity layout reconstruction)
    2. DOCX -> HTML (using mammoth for clean semantic HTML)
    3. HTML -> EPUB (using ebooklib to package as an e-book)
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are accepted.",
        )

    logger.info(f"Converting via DOCX pipeline: {file.filename}")
    pdf_bytes = await file.read()
    
    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_path = os.path.join(tmpdir, "input.pdf")
            docx_path = os.path.join(tmpdir, "intermediate.docx")

            # 1. Save PDF to temp file
            with open(pdf_path, "wb") as f:
                f.write(pdf_bytes)

            # 2. Convert PDF to DOCX
            # pdf2docx is the best library for recovering structure/tables
            logger.info("Step 1: PDF to DOCX...")
            cv = Converter(pdf_path)
            cv.convert(docx_path, start=0, end=None)
            cv.close()

            # 3. Convert DOCX to HTML
            logger.info("Step 2: DOCX to HTML...")
            # We'll need a place to store images temporarily if mammoth extracts them, 
            # though by default mammoth often ignores them unless we provide an image handler.
            # For now, let's just get the HTML.
            with open(docx_path, "rb") as docx_file:
                result = mammoth.convert_to_html(docx_file)
                html_content = result.value

            # 4. Package as EPUB with Multiple Chapters
            logger.info("Step 3: HTML to EPUB with splitting...")
            base_name = os.path.splitext(file.filename)[0]
            book = epub.EpubBook()
            book.set_identifier(f"pdf-tool-v3-{base_name}")
            book.set_title(base_name)
            book.set_language("en")
            book.add_author("PDF Maya")

            css_content = """
body { font-family: sans-serif; line-height: 1.5; margin: 5%; }
h1, h2, h3 { color: #2c3e50; margin-top: 1.5em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
p { margin-bottom: 1em; text-align: justify; }
table { border-collapse: collapse; width: 100%; margin: 1.5em 0; font-size: 0.9em; }
th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
th { background-color: #f8f9fa; font-weight: bold; }
img { max-width: 100%; height: auto; display: block; margin: 1em auto; }
"""
            style_item = epub.EpubItem(
                uid="style_default",
                file_name="style/default.css",
                media_type="text/css",
                content=css_content.encode("utf-8")
            )
            book.add_item(style_item)

            # --- Smart Splitting Logic ---
            # We split by major headers (h1 or h2) to create natural chapters
            parts = re.split(r'(<(?:h1|h2)[^>]*>.*?</(?:h1|h2)>)', html_content)
            
            chapters = []
            current_chapter_body = ""
            chapter_count = 0

            # If the first part isn't a header, starts as "Introduction"
            for part in parts:
                if re.match(r'<(h1|h2)', part):
                    # If we have accumulated content, save it as a chapter first
                    if current_chapter_body.strip():
                        chapter_count += 1
                        title = f"Chapter {chapter_count}"
                        c = epub.EpubHtml(title=title, file_name=f"chapter_{chapter_count}.xhtml", lang="en")
                        c.content = f"<html><body>{current_chapter_body}</body></html>".encode("utf-8")
                        c.add_item(style_item)
                        book.add_item(c)
                        chapters.append(c)
                    
                    # Start new chapter with this header
                    current_chapter_body = part
                else:
                    current_chapter_body += part

            # Add the final chapter
            if current_chapter_body.strip():
                chapter_count += 1
                c = epub.EpubHtml(title=f"Section {chapter_count}", file_name=f"chapter_{chapter_count}.xhtml", lang="en")
                c_html = f"""<?xml version='1.0' encoding='utf-8'?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><link rel="stylesheet" type="text/css" href="style/default.css" /></head>
<body>{current_chapter_body}</body>
</html>"""
                c.content = c_html.encode("utf-8")
                c.add_item(style_item)
                book.add_item(c)
                chapters.append(c)

            # Ensure we have at least one chapter if splitting failed
            if not chapters:
                c1 = epub.EpubHtml(title="Content", file_name="content.xhtml", lang="en")
                c1.content = f"<html><body>{html_content}</body></html>".encode("utf-8")
                c1.add_item(style_item)
                book.add_item(c1)
                chapters = [c1]

            book.toc = tuple(chapters)
            book.add_item(epub.EpubNcx())
            book.add_item(epub.EpubNav())
            book.spine = ["nav"] + chapters

            epub_buffer = io.BytesIO()
            epub.write_epub(epub_buffer, book, {})
            return epub_buffer.getvalue(), f"{base_name}.epub"

    except Exception as e:
        logger.error(f"EPUB conversion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Conversion pipeline failed: {str(e)}")

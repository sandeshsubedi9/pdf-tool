import fitz  # PyMuPDF
import io
import os
import zipfile
from typing import List

PAGE_SIZE_MAP = {
    "a4": (595.275, 841.889),
    "a5": (419.527, 595.275),
    "a3": (841.889, 1190.551),
    "letter": (612.0, 792.0),
    "legal": (612.0, 1008.0),
    "ledger": (792.0, 1224.0),
}

MARGIN_MAP = {
    "none": 0.0,
    "small": 36.0,  # 0.5 inch
    "large": 72.0,  # 1 inch
}

async def convert_images_to_pdf(
    files: List[tuple], # List of (filename, file_bytes)
    page_size: str = "fit",
    orientation: str = "portrait",
    margin: str = "none",
    merge_all: bool = True
) -> tuple:
    margin_pts = MARGIN_MAP.get(margin, 0.0)
    
    docs_to_generate = []
    
    if merge_all:
        docs_to_generate.append(("merged.pdf", files))
    else:
        for f in files:
            docs_to_generate.append((f"{os.path.splitext(f[0])[0]}.pdf".replace(" ", "_"), [f]))

    output_pdfs = []

    for doc_name, doc_files in docs_to_generate:
        pdf_doc = fitz.open()

        for filename, file_bytes in doc_files:
            try:
                # Use fitz to get image rect
                img_fitz = fitz.open(stream=file_bytes, filetype=filename.split(".")[-1])
                img_pdf = fitz.open("pdf", img_fitz.convert_to_pdf())
                img_rect = img_pdf[0].rect
                img_w_pt, img_h_pt = img_rect.width, img_rect.height
            except Exception:
                continue # Skip invalid images
            
            if page_size == "fit":
                page_w = img_w_pt + margin_pts * 2
                page_h = img_h_pt + margin_pts * 2
            else:
                base_w, base_h = PAGE_SIZE_MAP.get(page_size, PAGE_SIZE_MAP["a4"])
                if orientation == "landscape":
                    base_w, base_h = base_h, base_w
                page_w, page_h = base_w, base_h

            page = pdf_doc.new_page(width=page_w, height=page_h)
            
            max_w = page_w - margin_pts * 2
            max_h = page_h - margin_pts * 2
            
            scale = min(max_w / img_w_pt, max_h / img_h_pt, 1.0) if max_w > 0 and max_h > 0 else 1.0
            draw_w = img_w_pt * scale
            draw_h = img_h_pt * scale
            
            x = margin_pts + (max_w - draw_w) / 2
            y = margin_pts + (max_h - draw_h) / 2
            
            # Show image PDF page centered
            page.show_pdf_page(fitz.Rect(x, y, x + draw_w, y + draw_h), img_pdf, 0)
            img_pdf.close()
            img_fitz.close()

        if pdf_doc.page_count > 0:
            pdf_bytes = pdf_doc.write()
            output_pdfs.append((doc_name, pdf_bytes))
        pdf_doc.close()

    if not output_pdfs:
        raise Exception("No valid images found to convert.")

    if merge_all and len(output_pdfs) == 1:
        doc_name = "images.pdf"
        if len(files) == 1:
            doc_name = f"{os.path.splitext(files[0][0])[0]}.pdf".replace(" ", "_")
        return output_pdfs[0][1], doc_name, "application/pdf"
    else:
        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zipf:
            for d_name, p_bytes in output_pdfs:
                zipf.writestr(d_name, p_bytes)
        return zip_buf.getvalue(), "converted-images.zip", "application/zip"

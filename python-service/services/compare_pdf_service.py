"""
compare_pdf_service.py
Compares two PDFs at the word level using PyMuPDF + difflib.SequenceMatcher.
Returns page-by-page diff data with normalised bounding boxes so the frontend
can draw highlight overlays at any render resolution.
"""

import fitz  # PyMuPDF
from difflib import SequenceMatcher
from fastapi import UploadFile


async def compare_pdfs(file_a: UploadFile, file_b: UploadFile) -> dict:
    """
    Compare two PDF files and return diff data per page.

    Returns:
        {
            "total_pages_a": int,
            "total_pages_b": int,
            "pages": [
                {
                    "page_num": int,           # 1-indexed
                    "page_a_exists": bool,
                    "page_b_exists": bool,
                    "has_changes": bool,
                    "deletions": [             # words only in PDF A (highlighted red)
                        {"x": float, "y": float, "w": float, "h": float, "text": str}
                    ],
                    "additions": [             # words only in PDF B (highlighted green)
                        {"x": float, "y": float, "w": float, "h": float, "text": str}
                    ]
                }
            ],
            "summary": {
                "total_added_words": int,
                "total_deleted_words": int,
                "changed_pages": [int],   # 1-indexed page numbers with changes
                "total_pages": int,
            }
        }
    """
    bytes_a = await file_a.read()
    bytes_b = await file_b.read()

    doc_a = fitz.open(stream=bytes_a, filetype="pdf")
    doc_b = fitz.open(stream=bytes_b, filetype="pdf")

    total_pages_a = len(doc_a)
    total_pages_b = len(doc_b)
    max_pages = max(total_pages_a, total_pages_b)

    pages_result = []
    total_added = 0
    total_deleted = 0
    changed_pages = []

    for page_idx in range(max_pages):
        page_a_exists = page_idx < total_pages_a
        page_b_exists = page_idx < total_pages_b

        # --- Extract word tuples from each page --------------------------------
        # fitz get_text("words") returns:
        #   (x0, y0, x1, y1, "word", block_no, line_no, word_no)
        # Coordinates are in PDF user-space (origin top-left for fitz).
        raw_words_a = []
        page_a_width = 1.0
        page_a_height = 1.0

        raw_words_b = []
        page_b_width = 1.0
        page_b_height = 1.0

        if page_a_exists:
            page_a = doc_a[page_idx]
            page_a_width = max(page_a.rect.width, 1.0)
            page_a_height = max(page_a.rect.height, 1.0)
            raw_words_a = page_a.get_text("words")

        if page_b_exists:
            page_b = doc_b[page_idx]
            page_b_width = max(page_b.rect.width, 1.0)
            page_b_height = max(page_b.rect.height, 1.0)
            raw_words_b = page_b.get_text("words")

        # --- Build word-only lists for diffing --------------------------------
        words_a = [w[4] for w in raw_words_a]
        words_b = [w[4] for w in raw_words_b]

        # --- Helper: normalise a word tuple -----------------------------------
        def normalise(word_tuple, width, height):
            x0, y0, x1, y1, text = word_tuple[0], word_tuple[1], word_tuple[2], word_tuple[3], word_tuple[4]
            return {
                "x": x0 / width,
                "y": y0 / height,
                "w": max((x1 - x0) / width, 0.0),
                "h": max((y1 - y0) / height, 0.0),
                "text": text,
            }

        # --- Run diff ---------------------------------------------------------
        matcher = SequenceMatcher(None, words_a, words_b, autojunk=False)
        deletions = []
        additions = []

        for tag, a1, a2, b1, b2 in matcher.get_opcodes():
            if tag in ("delete", "replace"):
                for i in range(a1, a2):
                    deletions.append(normalise(raw_words_a[i], page_a_width, page_a_height))
                    total_deleted += 1

            if tag in ("insert", "replace"):
                for i in range(b1, b2):
                    additions.append(normalise(raw_words_b[i], page_b_width, page_b_height))
                    total_added += 1

        has_changes = bool(deletions or additions)
        if has_changes:
            changed_pages.append(page_idx + 1)

        pages_result.append({
            "page_num": page_idx + 1,
            "page_a_exists": page_a_exists,
            "page_b_exists": page_b_exists,
            "has_changes": has_changes,
            "deletions": deletions,
            "additions": additions,
        })

    doc_a.close()
    doc_b.close()

    return {
        "total_pages_a": total_pages_a,
        "total_pages_b": total_pages_b,
        "pages": pages_result,
        "summary": {
            "total_added_words": total_added,
            "total_deleted_words": total_deleted,
            "changed_pages": changed_pages,
            "total_pages": max_pages,
        },
    }

import fitz
import os

def create_corrupted_pdf():
    # 1. Create a valid PDF
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "This PDF was recovered successfully!", fontsize=20)
    page.insert_text((50, 100), "If you can read this, the repair tool worked. The original file had a broken xref table and missing EOF marker.", fontsize=12)
    
    # Get the raw bytes
    pdf_bytes = doc.write()
    doc.close()
    
    # 2. Corrupt it!
    # A PDF file ends with a cross-reference table (xref) and an %%EOF marker.
    # By truncating the last 200 bytes, we delete these critical structural elements.
    # Normal PDF readers will often fail to open it or complain it is damaged.
    corrupted_bytes = pdf_bytes[:-200]
    
    # 3. Save to disk
    output_path = "corrupted_test.pdf"
    with open(output_path, "wb") as f:
        f.write(corrupted_bytes)
        
    print(f"Created {output_path} successfully.")

if __name__ == "__main__":
    create_corrupted_pdf()

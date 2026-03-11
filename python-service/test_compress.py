import fitz
import io
import sys

def test_compress(pdf_path):
    print("Opening:", pdf_path)
    doc = fitz.open(pdf_path)
    print("Original pages:", len(doc))
    
    # Check images
    for p in range(len(doc)):
        images = doc[p].get_images(full=True)
        if images:
            print(f"Page {p} has {len(images)} images")
            for img in images:
                print(f"  Image {img[0]}")
                
    doc.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        test_compress(sys.argv[1])
    else:
        print("Provide PDF path")

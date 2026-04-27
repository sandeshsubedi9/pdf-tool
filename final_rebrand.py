import os
import glob

# Search and replace for the entire project
search_dirs = [
    r"c:\Users\Acer\OneDrive\Desktop\Fishtail-Work\pdf-editor"
]

replacements = [
    ("PDF Maya Service", "PDF Maya Service"),
    ("pdf-maya-service", "pdf-maya-service"),
    ("PDF Maya Python Service", "PDF Maya Python Service"),
    ("PDF Maya microservice", "PDF Maya microservice"),
    ("PDF Maya User", "PDF Maya User"),
    ("pdfmaya_did", "pdfmaya_did"),
    ("pdfmaya_fid", "pdfmaya_fid"),
    ("TranslatePdfMayaPage", "TranslatePdfMayaPage"),
    ("RotatePdfMayaPage", "RotatePdfMayaPage"),
    ("PDF Maya", "PDF Maya")
]

c = 0
for search_dir in search_dirs:
    files = glob.glob(search_dir + "/**/*", recursive=True)
    for path in files:
        if os.path.isdir(path): continue
        if "node_modules" in path or ".git" in path or ".next" in path: continue
        if not path.endswith((".tsx", ".ts", ".json", ".js", ".py", ".bat")): continue
        
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = content
            changed = False
            
            for old, new in replacements:
                if old in new_content:
                    new_content = new_content.replace(old, new)
                    changed = True
            
            if changed:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                c += 1
                print(f"Updated: {path}")
        except Exception as e:
            print(f"Error processing {path}: {e}")

print(f"Replaced successfully in {c} files")

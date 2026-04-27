import os
import glob

app_dir = r"c:\Users\Acer\OneDrive\Desktop\Fishtail-Work\pdf-editor\app"
files = glob.glob(app_dir + "/**/*.tsx", recursive=True)

c = 0
for path in files:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    if "SandeshPDF" in content:
        content = content.replace("SandeshPDF's", "PDF Maya's")
        content = content.replace("SandeshPDF’s", "PDF Maya’s")
        content = content.replace("SandeshPDF", "PDF Maya")
        
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        c += 1

print(f"Replaced successfully in {c} files")

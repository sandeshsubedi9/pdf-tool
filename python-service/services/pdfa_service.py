import os
import shutil
import tempfile
import subprocess
from fastapi import UploadFile, HTTPException

# Maps the user-facing level string to (GS dPDFA number, compatibility level)
LEVEL_MAP = {
    "1b": (1, "1.4"),
    "2b": (2, "1.7"),
    "3b": (3, "1.7"),
}


def find_ghostscript() -> str | None:
    """Find the Ghostscript executable on Windows or Linux."""
    for gs_name in ("gswin64c", "gswin32c", "gs"):
        path = shutil.which(gs_name)
        if path:
            return path

    # Fallback: scan common Windows install locations
    candidate_dirs = [
        r"C:\Program Files\gs",
        r"C:\Program Files (x86)\gs",
    ]
    for base_dir in candidate_dirs:
        if os.path.isdir(base_dir):
            for version_dir in sorted(os.listdir(base_dir), reverse=True):
                for gs_exe in ("gswin64c.exe", "gswin32c.exe"):
                    full = os.path.join(base_dir, version_dir, "bin", gs_exe)
                    if os.path.isfile(full):
                        return full
    return None


async def convert_pdf_to_pdfa(
    file: UploadFile,
    conformance_level: str = "1b",
) -> tuple[bytes, str]:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await file.read()
    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if conformance_level not in LEVEL_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid conformance level '{conformance_level}'. Choose from: {', '.join(LEVEL_MAP.keys())}",
        )

    gs_pdfa_num, compat_level = LEVEL_MAP[conformance_level]

    gs_path = find_ghostscript()
    if not gs_path:
        raise HTTPException(
            status_code=503,
            detail=(
                "Ghostscript is not installed on this server. "
                "Please install it from https://www.ghostscript.com/releases/gsdnld.html "
                "and restart the service."
            ),
        )

    with tempfile.TemporaryDirectory() as tmp_dir:
        input_path = os.path.join(tmp_dir, "input.pdf")
        output_path = os.path.join(tmp_dir, "output.pdf")

        with open(input_path, "wb") as f:
            f.write(pdf_bytes)

        gs_cmd = [
            gs_path,
            f"-dPDFA={gs_pdfa_num}",
            "-dBATCH",
            "-dNOPAUSE",
            "-dNOOUTERSAVE",
            f"-dCompatibilityLevel={compat_level}",
            "-sDEVICE=pdfwrite",
            "-sColorConversionStrategy=RGB",
            "-dEmbedAllFonts=true",
            "-dSubsetFonts=true",
            "-dCompressFonts=true",
            "-dAutoRotatePages=/None",
            f"-sOutputFile={output_path}",
            input_path,
        ]

        try:
            result = subprocess.run(
                gs_cmd,
                capture_output=True,
                text=True,
                timeout=120,
            )
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=500, detail="Conversion timed out (>2 min). Try a smaller file.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Ghostscript execution failed: {str(e)}")

        if result.returncode != 0:
            stderr = result.stderr[-1000:] if result.stderr else "No error output"
            print(f"DEBUG Ghostscript stderr: {stderr}")
            raise HTTPException(
                status_code=500,
                detail=f"Ghostscript conversion failed (code {result.returncode}). See server logs.",
            )

        if not os.path.isfile(output_path):
            raise HTTPException(status_code=500, detail="Ghostscript did not produce an output file.")

        with open(output_path, "rb") as f:
            out_bytes = f.read()

    base_name = os.path.splitext(file.filename)[0]
    output_filename = f"{base_name}_pdfa.pdf"

    print(f"PDF/A-{conformance_level.upper()} conversion done: '{file.filename}' → '{output_filename}' ({len(out_bytes)} bytes)")
    return out_bytes, output_filename

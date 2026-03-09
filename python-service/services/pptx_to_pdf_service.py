import os
import sys
import io
import asyncio
import tempfile
import shutil
import subprocess
import logging
from fastapi import UploadFile, HTTPException

logger = logging.getLogger(__name__)

def _find_libreoffice() -> str:
    """
    Find the LibreOffice executable on the current platform.
    """
    if sys.platform == "win32":
        candidates = [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        ]
        for path in candidates:
            if os.path.isfile(path):
                return path
        raise RuntimeError(
            "LibreOffice not found on Windows. "
            "Please install it from https://www.libreoffice.org/download/libreoffice/"
        )
    else:
        path = shutil.which("soffice") or shutil.which("libreoffice")
        if path:
            return path
        raise RuntimeError(
            "LibreOffice not found. "
            "On Ubuntu/Debian run: sudo apt-get install -y libreoffice-impress"
        )

def _run_libreoffice(soffice: str, input_path: str, output_dir: str) -> None:
    """
    Run LibreOffice headlessly to convert a file to PDF.
    """
    cmd = [
        soffice,
        "--headless",
        "--norestore",
        "--nofirststartwizard",
        "--convert-to", "pdf",
        "--outdir", output_dir,
        input_path,
    ]
    logger.info(f"Running LibreOffice for PowerPoint conversion: {' '.join(cmd)}")
    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=120,
    )
    if result.returncode != 0:
        stderr = result.stderr.decode(errors="replace")
        raise RuntimeError(f"LibreOffice exited with code {result.returncode}: {stderr}")

async def convert_pptx_to_pdf(file: UploadFile) -> tuple[bytes, str]:
    """
    Converts a PowerPoint presentation (.ppt / .pptx) to PDF using LibreOffice.
    """
    filename = file.filename or "presentation.pptx"
    base_name = os.path.splitext(filename)[0]
    output_filename = f"{base_name}.pdf"

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    try:
        soffice = _find_libreoffice()
    except RuntimeError as e:
        logger.error(str(e))
        raise HTTPException(status_code=503, detail=str(e))

    with tempfile.TemporaryDirectory() as temp_dir:
        input_path = os.path.join(temp_dir, filename)
        expected_pdf = os.path.join(temp_dir, f"{base_name}.pdf")

        with open(input_path, "wb") as f:
            f.write(content)

        try:
            await asyncio.to_thread(_run_libreoffice, soffice, input_path, temp_dir)
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail="Conversion timed out.")
        except RuntimeError as e:
            logger.error(f"PowerPoint to PDF conversion error: {e}")
            raise HTTPException(status_code=500, detail=f"Conversion failed: {e}")

        if not os.path.isfile(expected_pdf):
            raise HTTPException(status_code=500, detail="Conversion failed: PDF not produced.")

        with open(expected_pdf, "rb") as f:
            pdf_bytes = f.read()

    logger.info(f"Successfully converted PowerPoint '{filename}' to PDF")
    return pdf_bytes, output_filename

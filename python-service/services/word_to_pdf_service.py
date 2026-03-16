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
    Returns the command/path to use, or raises RuntimeError if not found.
    """
    if sys.platform == "win32":
        # Common default install paths on Windows
        candidates = [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        ]
        for path in candidates:
            if os.path.isfile(path):
                return path
        raise RuntimeError(
            "LibreOffice not found on Windows. "
            "Please download and install it from https://www.libreoffice.org/download/libreoffice/"
        )
    else:
        # Linux / macOS: check if soffice is on PATH
        path = shutil.which("soffice") or shutil.which("libreoffice")
        if path:
            return path
        raise RuntimeError(
            "LibreOffice not found. "
            "On Ubuntu/Debian run: sudo apt-get install -y libreoffice-core libreoffice-writer"
        )


def _run_libreoffice(soffice: str, input_path: str, output_dir: str) -> None:
    """
    Run LibreOffice headlessly to convert a file to PDF.
    Blocks until conversion is complete.
    We use a unique -env:UserInstallation for each call to avoid profile locking issues.
    """
    user_profile = os.path.join(output_dir, "libreoffice_profile")
    os.makedirs(user_profile, exist_ok=True)
    
    # On Windows, the path needs to be prefixed with file:/// for -env:UserInstallation
    if sys.platform == "win32":
        profile_path = "file:///" + user_profile.replace("\\", "/")
    else:
        profile_path = "file://" + user_profile

    cmd = [
        soffice,
        "--headless",
        "--invisible",
        "--norestore",
        "--nodefault",
        "--nofirststartwizard",
        f"-env:UserInstallation={profile_path}",
        "--convert-to", "pdf",
        "--outdir", output_dir,
        input_path,
    ]
    
    logger.info(f"Running LibreOffice with custom profile: {' '.join(cmd)}")
    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=150,  # 2.5-minute timeout
    )
    
    if result.returncode != 0:
        stdout = result.stdout.decode(errors="replace")
        stderr = result.stderr.decode(errors="replace")
        logger.error(f"LibreOffice failed (code {result.returncode}).")
        logger.error(f"STDOUT: {stdout}")
        logger.error(f"STDERR: {stderr}")
        raise RuntimeError(
            f"LibreOffice conversion failed (code {result.returncode}). "
            f"Make sure the input file is not corrupted and LibreOffice is correctly installed."
        )


async def convert_word_to_pdf(file: UploadFile) -> tuple[bytes, str]:
    """
    Converts a Word document (.doc / .docx) to PDF using LibreOffice.

    Works on:
      - Windows  → requires LibreOffice to be installed
      - Linux    → requires: sudo apt-get install -y libreoffice-core libreoffice-writer
      - macOS    → requires LibreOffice to be installed

    Returns (pdf_bytes, output_filename).
    """
    filename = file.filename or "document.docx"
    base_name = os.path.splitext(filename)[0]
    output_filename = f"{base_name}.pdf"

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    # Locate LibreOffice before doing anything
    try:
        soffice = _find_libreoffice()
    except RuntimeError as e:
        logger.error(str(e))
        raise HTTPException(status_code=503, detail=str(e))

    with tempfile.TemporaryDirectory() as temp_dir:
        input_path = os.path.join(temp_dir, filename)
        expected_pdf = os.path.join(temp_dir, f"{base_name}.pdf")

        # Write the uploaded bytes to disk
        with open(input_path, "wb") as f:
            f.write(content)

        try:
            # Run the blocking LibreOffice subprocess on a thread pool
            # so we don't block FastAPI's async event loop
            await asyncio.to_thread(_run_libreoffice, soffice, input_path, temp_dir)
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail="Conversion timed out (>120s).")
        except RuntimeError as e:
            logger.error(f"LibreOffice conversion error: {e}")
            raise HTTPException(status_code=500, detail=f"Conversion failed: {e}")

        if not os.path.isfile(expected_pdf):
            raise HTTPException(
                status_code=500,
                detail="LibreOffice ran but no PDF was produced. "
                       "Ensure libreoffice-writer is installed.",
            )

        with open(expected_pdf, "rb") as f:
            pdf_bytes = f.read()

    logger.info(f"Successfully converted '{filename}' to PDF ({len(pdf_bytes)} bytes)")
    return pdf_bytes, output_filename

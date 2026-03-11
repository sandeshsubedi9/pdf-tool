"""
compress_service.py
PDF Compression service using Ghostscript.

Ghostscript gives the best possible compression ratios, comparable to industry leaders.
Quality presets map to standard PDF settings:
  - high:   /screen (72 dpi, aggressive compression, very small file)
  - medium: /ebook (150 dpi, good balance, recommended)
  - low:    /printer (300 dpi, high quality, modest size reduction)
"""

import io
import os
import tempfile
import subprocess
import logging
from fastapi import UploadFile

logger = logging.getLogger(__name__)

# Map quality to Ghostscript PDFSETTINGS
PRESETS = {
    "high": "/screen",   
    "medium": "/ebook",  
    "low": "/printer",   
}

async def compress_pdf(file: UploadFile, quality: str = "medium") -> tuple[bytes, str, int, int]:
    """
    Compress a PDF file using Ghostscript.

    Returns:
        (compressed_bytes, output_filename, original_size_bytes, compressed_size_bytes)
    """
    gs_preset = PRESETS.get(quality, "/ebook")
    original_bytes = await file.read()
    original_size = len(original_bytes)

    # Use TemporaryFile for processing
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as input_temp, \
         tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as output_temp:
        
        input_temp_path = input_temp.name
        output_temp_path = output_temp.name
        
        # Write original bytes
        input_temp.write(original_bytes)
        input_temp.flush()
        
    try:
        # Construct Ghostscript command
        # Works on Windows assuming 'gswin64c' is in PATH (or 'gs' on Linux)
        gs_cmd = "gswin64c" if os.name == 'nt' else "gs"
        
        cmd = [
            gs_cmd,
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            f"-dPDFSETTINGS={gs_preset}",
            "-dNOPAUSE",
            "-dQUIET",
            "-dBATCH",
        ]
        
        if gs_preset == "/screen":
            cmd.extend([
                "-dColorImageDownsampleType=/Bicubic",
                "-dColorImageResolution=72",
                "-dGrayImageDownsampleType=/Bicubic",
                "-dGrayImageResolution=72",
                "-dMonoImageDownsampleType=/Bicubic",
                "-dMonoImageResolution=300"
            ])
        elif gs_preset == "/ebook":
            cmd.extend([
                "-dColorImageDownsampleType=/Bicubic",
                "-dColorImageResolution=150",
                "-dGrayImageDownsampleType=/Bicubic",
                "-dGrayImageResolution=150",
                "-dMonoImageDownsampleType=/Bicubic",
                "-dMonoImageResolution=300"
            ])
        else: # /printer
            cmd.extend([
                "-dColorImageDownsampleType=/Bicubic",
                "-dColorImageResolution=300",
                "-dGrayImageDownsampleType=/Bicubic",
                "-dGrayImageResolution=300",
                "-dMonoImageDownsampleType=/Bicubic",
                "-dMonoImageResolution=1200"
            ])
            
        cmd.extend([
            f"-sOutputFile={output_temp_path}",
            input_temp_path
        ])

        logger.info(f"Running Ghostscript compression: {' '.join(cmd)}")
        
        process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        if process.returncode != 0:
            logger.error(f"Ghostscript failed with code {process.returncode}: {process.stderr.decode('utf-8', errors='ignore')}")
            # Fallback to returning original file if GS fails
            return original_bytes, f"{os.path.splitext(file.filename or 'document')[0]}-compressed.pdf", original_size, original_size

        # Read compressed output
        with open(output_temp_path, "rb") as f_out:
            compressed_bytes = f_out.read()
            
    finally:
        # Cleanup temp files
        if os.path.exists(input_temp_path):
            try:
                os.remove(input_temp_path)
            except Exception:
                pass
        
        if os.path.exists(output_temp_path):
            try:
                os.remove(output_temp_path)
            except Exception:
                pass

    compressed_size = len(compressed_bytes)

    # Build output filename
    base = os.path.splitext(file.filename or "document")[0]
    output_filename = f"{base}-compressed.pdf"

    return compressed_bytes, output_filename, original_size, compressed_size

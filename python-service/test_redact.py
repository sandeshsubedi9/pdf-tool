"""Quick test: hit /redact/apply and save the output."""
import asyncio
import json
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

async def main():
    from io import BytesIO
    from fastapi import UploadFile
    from services.redact_pdf_service import apply_redactions_standalone

    pdf_path = os.path.join(os.path.dirname(__file__), "test.pdf")
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    file = UploadFile(filename="test.pdf", file=BytesIO(pdf_bytes))

    redactions = json.dumps([
        {"page": 1, "x_pct": 5, "y_pct": 5, "w_pct": 50, "h_pct": 20}
    ])

    out_bytes, out_name = await apply_redactions_standalone(file, redactions)

    out_path = os.path.join(os.path.dirname(__file__), "test_redacted_output.pdf")
    with open(out_path, "wb") as f:
        f.write(out_bytes)

    print("SUCCESS: wrote %d bytes to %s" % (len(out_bytes), out_path))

asyncio.run(main())

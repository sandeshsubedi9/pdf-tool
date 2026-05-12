"""
server.py — Entry point for the PDF Maya microservice.

On Windows, asyncio defaults to SelectorEventLoop which cannot create
subprocesses (used by Playwright to launch Chromium). We switch to
WindowsProactorEventLoopPolicy BEFORE uvicorn creates its event loop
so that all subsequent event loops — including Playwright's internal
background-thread loop — use ProactorEventLoop and support subprocesses.
"""
import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import uvicorn
import os

if __name__ == "__main__":
    # Get port from environment variable (for VPS/Docker) or fallback to 8001
    port = int(os.getenv("PORT", 8001))
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
    )

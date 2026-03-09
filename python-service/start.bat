@echo off
setlocal enabledelayedexpansion

echo ================================================
echo  PDF Tools Python Microservice
echo ================================================
echo.

REM ── Find a working Python ──────────────────────────────────────────────────
set PYTHON_EXE=

REM Try common locations in order
for %%P in (
    "python"
    "python3"
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python39\python.exe"
    "C:\Python312\python.exe"
    "C:\Python311\python.exe"
    "C:\Python310\python.exe"
) do (
    %%~P --version >nul 2>&1
    if !ERRORLEVEL! == 0 (
        set PYTHON_EXE=%%~P
        goto :found_python
    )
)

echo [ERROR] Python 3 was not found on your system.
echo.
echo Please install Python 3.9+ from https://www.python.org/downloads/
echo Make sure to check "Add Python to PATH" during installation.
echo.
pause
exit /b 1

:found_python
echo Using Python: %PYTHON_EXE%
%PYTHON_EXE% --version
echo.

REM ── Create virtual environment if needed ───────────────────────────────────
if not exist "venv\Scripts\activate.bat" (
    echo Creating virtual environment...
    %PYTHON_EXE% -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo Done.
    echo.
)

REM ── Activate virtual environment ───────────────────────────────────────────
call venv\Scripts\activate.bat

REM ── Install / upgrade dependencies ─────────────────────────────────────────
echo Installing dependencies (first run may take ~1-2 minutes)...
pip install -r requirements.txt --quiet --upgrade
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)
echo Dependencies are up to date.
echo.

REM ── Start the FastAPI server ────────────────────────────────────────────────
echo Starting PDF conversion service on http://localhost:8000
echo Press Ctrl+C to stop.
echo.
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

endlocal

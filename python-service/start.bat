@echo off
setlocal

echo ================================================
echo  PDF Tools Python Microservice
echo ================================================
echo.

set PYTHON_EXE=C:\Users\Acer\AppData\Local\Programs\Python\Python312\python.exe

echo Using Python: %PYTHON_EXE%
echo.

REM Create venv if missing
if exist "venv\Scripts\activate.bat" goto :activate

echo Creating virtual environment...
"%PYTHON_EXE%" -m venv venv

:activate
echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
python -m pip install -r requirements.txt -q

echo Installing Playwright browser...
python -m playwright install chromium

echo.
echo Starting server on http://localhost:8000
echo Press Ctrl+C to stop.
echo.
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

endlocal

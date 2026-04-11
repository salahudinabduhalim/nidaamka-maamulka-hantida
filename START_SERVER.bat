@echo off
echo Bilaabaya Nidaamka Maamulka Hantida (Local)...
cd /d "%~dp0"

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python lama helin! Fadlan install gareey Python.
    pause
    exit /b
)

:: Install dependencies
echo Hubinta asaasiga ah (Checking dependencies)...
pip install -r backend/requirements.txt

:: Start Backend
echo Server-ka backend-ka waa la kicinayaa...
echo Marku server-ku kaco, ku fur index.html browser-ka.
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

pause

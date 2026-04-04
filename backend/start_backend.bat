@echo off
title GigShield Backend
echo.
echo  ====================================
echo   GigShield Backend Starting...
echo  ====================================
echo.

cd /d "%~dp0"

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt -q

REM Copy env file if .env doesn't exist
if not exist ".env" (
    copy .env.example .env
    echo Created .env from .env.example
)

echo.
echo Starting GigShield API server...
echo  - API: http://localhost:8001
echo  - Docs: http://localhost:8001/docs
echo  - Demo credentials:
echo    Worker: 9876543210 / ravi1234
echo    Admin:  0000000000 / admin123
echo.

python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

pause

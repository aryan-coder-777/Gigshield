@echo off
title GigShield Launcher
color 0B
cd /d "%~dp0"
echo =======================================================
echo               LAUNCHING GIGSHIELD
echo =======================================================
echo.
echo Starting the Backend API in a new window...
start "GigShield API (Backend)" cmd /k "cd backend && echo Setting up Virtual Environment... && if not exist venv (python -m venv venv) && call venv\Scripts\activate && pip install -r requirements.txt && echo Starting Server... && uvicorn app.main:app --reload --port 8001"

echo Starting the Mobile App in a new window...
start "GigShield App (Frontend)" cmd /k "cd frontend && echo Installing Frontend Dependencies... && npm install && npm run start"

echo.
echo Both systems are initializing! 
echo Keep the two newly opened windows active.
echo You can close this particular window.
echo =======================================================
pause

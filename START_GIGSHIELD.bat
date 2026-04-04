@echo off
setlocal
title GigShield — Full Stack Launcher
echo.
echo  ============================================
echo   GigShield AI Parametric Insurance Platform
echo   Guidewire DEVTrails 2026
echo  ============================================
echo.
echo  Opening Backend and Frontend in separate windows...
echo.

REM Paths with spaces (e.g. D:\AI Integration\...) must be quoted
set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

start "GigShield Backend" cmd /k cd /d "%BACKEND%" ^&^& call start_backend.bat
timeout /t 4 /nobreak > NUL
start "GigShield Frontend" cmd /k cd /d "%FRONTEND%" ^&^& call start_frontend.bat

echo.
echo  Launched:
echo    - Backend window  (API on port 8001)
echo    - Frontend window (Expo / Metro on 8081)
echo.
echo  After Metro starts, press W in the Frontend window to open Web.
echo.
echo  URLs:
echo    API:  http://localhost:8001
echo    Docs: http://localhost:8001/docs
echo    Web:  http://localhost:8081
echo.
echo  Demo login:
echo    Worker: 9876543210 / ravi1234
echo    Admin:  0000000000 / admin123
echo.
pause

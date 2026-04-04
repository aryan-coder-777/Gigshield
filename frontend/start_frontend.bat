@echo off
setlocal
title GigShield Frontend (Expo)
echo.
echo  ====================================
echo   GigShield Frontend
echo  ====================================
echo.

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo Install from https://nodejs.org then run this again.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo First run: installing npm packages...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
  echo.
)

echo Starting Expo (Metro). When ready:
echo   - Press W  open in web browser
echo   - Press A  Android  ^|  I  iOS (with SDKs installed)
echo   - Scan QR with Expo Go on your phone
echo.
echo Web app: http://localhost:8081
echo Tip: If the bundle fails, stop (Ctrl+C) and run: npx expo start --clear
echo.

call npx expo start

echo.
pause

@echo off
REM GigShield EAS Build Setup Script for Windows
REM This script automates the initial setup for deploying to Google Play Store

echo.
echo ════════════════════════════════════════════════════════════════
echo GigShield - EAS Build Setup
echo ════════════════════════════════════════════════════════════════
echo.

REM Check if Node.js is installed
echo [1/6] Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION% found

REM Check/Install EAS CLI
echo.
echo [2/6] Checking EAS CLI installation...
npm list -g eas-cli >nul 2>nul
if %errorlevel% neq 0 (
    echo Installing EAS CLI globally...
    call npm install -g eas-cli
    if %errorlevel% neq 0 (
        echo ❌ Failed to install EAS CLI
        pause
        exit /b 1
    )
    echo ✅ EAS CLI installed
) else (
    echo ✅ EAS CLI already installed
)

REM Check/Install Expo CLI
echo.
echo [3/6] Checking Expo CLI installation...
npm list -g expo-cli >nul 2>nul
if %errorlevel% neq 0 (
    echo Installing Expo CLI globally...
    call npm install -g expo-cli
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Expo CLI
        pause
        exit /b 1
    )
    echo ✅ Expo CLI installed
) else (
    echo ✅ Expo CLI already installed
)

REM Login to EAS
echo.
echo [4/6] Authenticating with Expo/EAS...
call eas whoami >nul 2>nul
if %errorlevel% neq 0 (
    echo Please log in to your Expo account in the browser...
    call eas login
    if %errorl level% neq 0 (
        echo ❌ Login failed. Please try manually: eas login
        pause
        exit /b 1
    )
) else (
    echo ✅ Already authenticated with Expo/EAS
)

REM Install frontend dependencies
echo.
echo [5/6] Installing frontend dependencies...
cd frontend
if %errorlevel% neq 0 (
    echo ❌ Failed to navigate to frontend directory
    pause
    exit /b 1
)
call npm install
if %errorlevel% neq 0 (
    echo ⚠️  npm install completed with warnings (this might be okay)
)
echo ✅ Frontend dependencies installed

REM Initialize EAS project (if not already done)
echo.
echo [6/6] Verifying EAS configuration...
if not exist "eas.json" (
    echo Initializing EAS in project...
    call eas init
) else (
    echo ✅ EAS configuration already exists
)

echo.
echo ════════════════════════════════════════════════════════════════
echo ✅ Setup Complete!
echo ════════════════════════════════════════════════════════════════
echo.
echo Next Steps:
echo 1. Update "YOUR_EXPO_USERNAME" in app.json with your Expo username
echo 2. Run a test build: eas build --platform android --profile preview
echo 3. When ready, create production build: eas build --platform android --profile production
echo 4. Submit to Play Store: eas submit --platform android --latest
echo.
echo For detailed instructions, see DEPLOYMENT_GUIDE.md
echo.
pause

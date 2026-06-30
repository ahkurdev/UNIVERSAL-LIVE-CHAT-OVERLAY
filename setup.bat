@echo off
title Universal Live Chat Overlay - Setup
echo ========================================
echo  Universal Live Chat Overlay - Setup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js tidak ditemukan!
    echo.
    echo Silakan download dan install Node.js dari:
    echo https://nodejs.org/ (pilih LTS version)
    echo.
    echo Setelah install, jalankan setup.bat lagi.
    pause
    exit /b 1
)

echo [OK] Node.js terdeteksi: 
node -v

REM Check if npm is installed
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm tidak ditemukan!
    pause
    exit /b 1
)

echo [OK] npm terdeteksi: 
npm -v
echo.

REM Install dependencies
echo Sedang menginstall dependencies...
echo Ini mungkin memakan waktu 1-2 menit...
echo.
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Gagal menginstall dependencies.
    echo Coba jalankan: npm install --legacy-peer-deps
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Setup selesai!
echo ========================================
echo.
echo Jalankan start.bat untuk memulai aplikasi.
echo.
pause
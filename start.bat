@echo off
setlocal
title Universal Live Chat Overlay

cd /d "%~dp0"
if errorlevel 1 (
    echo [ERROR] Folder aplikasi tidak dapat dibuka.
    call :pause_if_needed
    exit /b 1
)

echo ========================================
echo  Universal Live Chat Overlay
echo ========================================
echo.

where.exe node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js tidak ditemukan. Jalankan setup.bat terlebih dahulu.
    call :pause_if_needed
    exit /b 1
)

where.exe npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm tidak ditemukan. Install ulang Node.js LTS.
    call :pause_if_needed
    exit /b 1
)

if not exist "node_modules\electron\package.json" (
    echo Dependencies belum terinstall. Menjalankan setup...
    call setup.bat
    if errorlevel 1 exit /b 1
)

node scripts\verify-electron.cjs >nul 2>&1
if errorlevel 1 (
    echo [WARN] Binary Electron belum lengkap. Mencoba memperbaiki...
    node -e "require('electron')"
    if errorlevel 1 (
        echo [ERROR] Electron gagal didownload. Jalankan setup.bat lagi.
        call :pause_if_needed
        exit /b 1
    )
)

node scripts\verify-electron.cjs
if errorlevel 1 (
    echo [ERROR] Electron belum siap. Jalankan setup.bat lagi.
    call :pause_if_needed
    exit /b 1
)

if /i "%~1"=="--check-only" exit /b 0

echo.
echo Sedang memulai aplikasi...
echo.
call npm run dev
set "app_exit_code=%errorlevel%"
if not "%app_exit_code%"=="0" (
    echo.
    echo [ERROR] Aplikasi berhenti dengan kode %app_exit_code%.
    echo Jalankan setup.bat jika ada dependency yang belum lengkap.
    call :pause_if_needed
)
exit /b %app_exit_code%

:pause_if_needed
if not defined CI pause
exit /b 0

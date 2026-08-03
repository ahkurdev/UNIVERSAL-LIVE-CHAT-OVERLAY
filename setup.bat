@echo off
setlocal
title Universal Live Chat Overlay - Setup

REM npm 12 rejects an inherited allow-scripts environment override when
REM package.json already defines the project-scoped allowScripts policy.
set "npm_config_allow_scripts="

cd /d "%~dp0"
if errorlevel 1 (
    echo [ERROR] Folder aplikasi tidak dapat dibuka.
    call :pause_if_needed
    exit /b 1
)

echo ========================================
echo  Universal Live Chat Overlay - Setup
echo ========================================
echo.

where.exe node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js tidak ditemukan.
    echo.
    echo Download dan install Node.js LTS dari https://nodejs.org/
    echo Setelah selesai, jalankan setup.bat lagi.
    call :pause_if_needed
    exit /b 1
)

where.exe npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm tidak ditemukan.
    echo Install ulang Node.js LTS, lalu jalankan setup.bat lagi.
    call :pause_if_needed
    exit /b 1
)

echo [OK] Node.js:
node --version
echo [OK] npm:
call npm --version
echo.

echo Sedang menginstall dependencies...
echo Download pertama dapat memakan waktu beberapa menit.
echo.
call npm install
if errorlevel 1 (
    echo.
    echo [WARN] Konfigurasi npm user mungkin konflik. Mencoba konfigurasi project...
    call npm --userconfig=NUL install
    if errorlevel 1 (
        echo.
        echo [ERROR] npm gagal menginstall dependencies.
        echo Periksa koneksi internet, antivirus, proxy, lalu jalankan setup.bat lagi.
        call :pause_if_needed
        exit /b 1
    )
)

call :ensure_electron
if errorlevel 1 (
    call :pause_if_needed
    exit /b 1
)

echo.
echo ========================================
echo  Setup selesai dan Electron siap.
echo ========================================
echo.
echo Jalankan start.bat untuk memulai aplikasi.
call :pause_if_needed
exit /b 0

:ensure_electron
node scripts\verify-electron.cjs >nul 2>&1
if not errorlevel 1 exit /b 0

echo.
echo [WARN] Binary Electron belum lengkap. Mencoba memperbaiki...
node -e "require('electron')"
if errorlevel 1 (
    echo.
    echo [ERROR] Binary Electron gagal didownload.
    echo Pastikan internet tidak memblokir GitHub atau download Electron.
    exit /b 1
)

node scripts\verify-electron.cjs
if errorlevel 1 (
    echo.
    echo [ERROR] Paket Electron ada, tetapi electron.exe masih tidak ditemukan.
    echo Hapus folder node_modules secara manual, lalu jalankan setup.bat lagi.
    exit /b 1
)

echo [OK] Binary Electron siap digunakan.
exit /b 0

:pause_if_needed
if not defined CI pause
exit /b 0

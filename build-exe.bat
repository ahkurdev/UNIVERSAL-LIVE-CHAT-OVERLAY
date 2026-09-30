@echo off
setlocal
title Build Universal Live Chat Overlay (.exe)

cd /d "%~dp0"
if errorlevel 1 (
    echo [ERROR] Folder aplikasi tidak dapat dibuka.
    pause
    exit /b 1
)

echo ===================================================
echo  Universal Live Chat Overlay - Windows .exe Builder
echo ===================================================
echo.

where.exe node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js tidak ditemukan. Silakan install Node.js LTS terlebih dahulu.
    pause
    exit /b 1
)

where.exe npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm tidak ditemukan.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [INFO] Dependencies belum ada, menjalankan npm install...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Gagal menginstall dependencies.
        pause
        exit /b 1
    )
)

echo.
echo [1/2] Sedang mengompilasi kode aplikasi dan CSS...
echo.
call npm run build
if errorlevel 1 (
    echo [ERROR] Gagal melakukan build aplikasi.
    pause
    exit /b 1
)

echo.
echo [2/2] Sedang mengemas aplikasi menjadi file .exe (Installer & Portable)...
echo.
call npx electron-builder --win
if errorlevel 1 (
    echo [ERROR] Gagal mengemas ke .exe.
    pause
    exit /b 1
)

echo.
echo ===================================================
echo  BERHASIL! File .exe sudah selesai dibuat:
echo  Buka folder "dist" untuk melihat hasilnya.
echo ===================================================
echo.
pause
exit /b 0

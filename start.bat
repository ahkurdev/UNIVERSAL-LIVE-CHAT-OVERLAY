@echo off
title Universal Live Chat Overlay
echo ========================================
echo  Universal Live Chat Overlay
echo ========================================
echo.
echo Sedang memulai aplikasi...
echo.
call npm run dev
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Gagal menjalankan aplikasi.
    echo Coba jalankan setup.bat dulu.
    pause
)
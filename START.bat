@echo off
chcp 65001 >nul
title VIBEPROMT — START
cd /d "%~dp0"

REM Надёжный запуск через PowerShell (пути с пробелами / Python вне PATH)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0START.ps1"
if errorlevel 1 pause

@echo off
chcp 65001 >nul
title VIBEPROMT — STOP
cd /d "%~dp0"

set "QUIET="
if /i "%~1"=="/quiet" set "QUIET=1"

if not defined QUIET (
  echo.
  echo  Останавливаю Backend / Bot / ngrok...
  echo.
)

taskkill /FI "WINDOWTITLE eq VIBEPROMT-Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq VIBEPROMT-Bot*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq VIBEPROMT-Tunnel*" /F >nul 2>&1
taskkill /IM ngrok.exe /F >nul 2>&1

for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
  taskkill /PID %%P /F >nul 2>&1
)

powershell -NoProfile -Command ^
  "Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | Where-Object { $_.CommandLine -match 'uvicorn|bot\\.py' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue" >nul 2>&1

if not defined QUIET (
  echo  Готово.
  timeout /t 2 /nobreak >nul
)

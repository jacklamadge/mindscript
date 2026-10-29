$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $Root

function Write-Step([string]$msg) {
    Write-Host ("  " + $msg)
}

Write-Host ""
Write-Host "  ========================================"
Write-Host "   MindScript - full start"
Write-Host "  ========================================"
Write-Host ""

$envFile = Join-Path $Root "backend\.env"
if (-not (Test-Path -LiteralPath $envFile)) {
    Write-Host "  [ERROR] Missing backend\.env"
    Read-Host "Press Enter"
    exit 1
}

$pyCandidates = @(
    (Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\Python\Python311\python.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\Python\Python310\python.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\Python\Launcher\py.exe"),
    "C:\Users\Tim\AppData\Local\Programs\Python\Python312\python.exe",
    "C:\Users\Tim\AppData\Local\Programs\Python\Python310\python.exe"
)
$PyExe = $null
foreach ($p in $pyCandidates) {
    if ($p -and (Test-Path -LiteralPath $p)) {
        $PyExe = $p
        break
    }
}
if (-not $PyExe) {
    foreach ($name in @("py", "python")) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if ($cmd -and ($cmd.Source -notmatch "WindowsApps")) {
            $PyExe = $cmd.Source
            break
        }
    }
}

$VenvPy = Join-Path $Root "backend\venv\Scripts\python.exe"
$VenvDir = Join-Path $Root "backend\venv"

$needVenv = $true
if (Test-Path -LiteralPath $VenvPy) {
    try {
        & $VenvPy -c "import sys" 2>$null
        if ($LASTEXITCODE -eq 0) { $needVenv = $false }
    } catch {
        $needVenv = $true
    }
}

if ($needVenv) {
    if (-not $PyExe) {
        Write-Host "  [ERROR] Python not found."
        Write-Host "  Install Python 3.12 from python.org and check Add to PATH"
        Read-Host "Press Enter"
        exit 1
    }
    Write-Step "[..] Python: $PyExe"
    Write-Step "[..] Creating venv + installing deps..."
    if (Test-Path -LiteralPath $VenvDir) {
        Remove-Item -LiteralPath $VenvDir -Recurse -Force
    }
    & $PyExe -m venv $VenvDir
    if (-not (Test-Path -LiteralPath $VenvPy)) {
        Write-Host "  [ERROR] Failed to create venv"
        Read-Host "Press Enter"
        exit 1
    }
    & $VenvPy -m pip install --upgrade pip
    $req = Join-Path $Root "backend\requirements.txt"
    & $VenvPy -m pip install -r $req
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERROR] pip install failed"
        Read-Host "Press Enter"
        exit 1
    }
}
Write-Step "[OK] venv"

$NgrokCmd = $null
$ngrokCmdObj = Get-Command ngrok -ErrorAction SilentlyContinue
if ($ngrokCmdObj) { $NgrokCmd = $ngrokCmdObj.Source }
if (-not $NgrokCmd) {
    $link = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links\ngrok.exe"
    if (Test-Path -LiteralPath $link) { $NgrokCmd = $link }
}
if (-not $NgrokCmd) {
    $pkgRoot = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
    if (Test-Path -LiteralPath $pkgRoot) {
        $found = Get-ChildItem -LiteralPath $pkgRoot -Filter "Ngrok.Ngrok_*" -Directory -ErrorAction SilentlyContinue |
            ForEach-Object { Join-Path $_.FullName "ngrok.exe" } |
            Where-Object { Test-Path -LiteralPath $_ } |
            Select-Object -First 1
        if ($found) { $NgrokCmd = $found }
    }
}
if (-not $NgrokCmd) {
    Write-Step "[..] Installing ngrok via winget..."
    winget install --id Ngrok.Ngrok -e --accept-source-agreements --accept-package-agreements
    $ngrokCmdObj = Get-Command ngrok -ErrorAction SilentlyContinue
    if ($ngrokCmdObj) { $NgrokCmd = $ngrokCmdObj.Source }
}
if (-not $NgrokCmd) {
    Write-Host "  [ERROR] ngrok not found. Run: winget install Ngrok.Ngrok"
    Read-Host "Press Enter"
    exit 1
}
Write-Step "[OK] ngrok: $NgrokCmd"

function Get-EnvValue([string]$key) {
    $line = Get-Content -LiteralPath $envFile | Where-Object { $_ -match ("^" + [regex]::Escape($key) + "=") } | Select-Object -First 1
    if (-not $line) { return $null }
    return ($line.Substring($key.Length + 1)).Trim()
}
$NgrokDomain = Get-EnvValue "NGROK_DOMAIN"
$MiniUrl = Get-EnvValue "MINI_APP_URL"

Write-Step "[..] Stopping old processes..."
$stopBat = Join-Path $Root "STOP.bat"
& cmd.exe /c "`"$stopBat`" /quiet"
Start-Sleep -Seconds 2

Write-Step "[1/3] Backend..."
$backendDir = Join-Path $Root "backend"
$backendCmd = "set PYTHONIOENCODING=utf-8&& set PYTHONUTF8=1&& set PYTHONUNBUFFERED=1&& `"$VenvPy`" -u -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
Start-Process -FilePath "cmd.exe" -ArgumentList @("/k", $backendCmd) -WorkingDirectory $backendDir -WindowStyle Normal

Write-Step "[..] Waiting for port 8000..."
$ok = $false
for ($i = 0; $i -lt 45; $i++) {
    $listening = netstat -ano | Select-String ":8000" | Select-String "LISTENING"
    if ($listening) { $ok = $true; break }
    Start-Sleep -Seconds 1
}
if (-not $ok) {
    Write-Host "  [ERROR] Backend did not start. Check Backend window."
    Read-Host "Press Enter"
    exit 1
}
Write-Step "[OK] http://127.0.0.1:8000"

Write-Step "[2/3] ngrok..."
if ($NgrokDomain) {
    $ngrokLine = "`"$NgrokCmd`" http --url=https://$NgrokDomain 8000"
} else {
    $ngrokLine = "`"$NgrokCmd`" http 8000"
}
Start-Process -FilePath "cmd.exe" -ArgumentList @("/k", $ngrokLine) -WindowStyle Normal
Start-Sleep -Seconds 4

Write-Step "[3/3] Telegram bot..."
$botPy = Join-Path $Root "bot\bot.py"
$botCmd = "set PYTHONIOENCODING=utf-8&& set PYTHONUTF8=1&& set PYTHONUNBUFFERED=1&& `"$VenvPy`" -u `"$botPy`""
Start-Process -FilePath "cmd.exe" -ArgumentList @("/k", $botCmd) -WorkingDirectory $Root -WindowStyle Normal

Write-Host ""
Write-Host "  ========================================"
Write-Host "   Done. 3 windows opened."
Write-Host "   Local:    http://127.0.0.1:8000"
if ($MiniUrl) { Write-Host ("   Mini App: " + $MiniUrl) }
Write-Host "   Bot:      @mindscript1_bot  /start"
Write-Host ""
Write-Host "   Stop all: STOP.bat"
Write-Host "  ========================================"
Write-Host ""
Read-Host "Press Enter"

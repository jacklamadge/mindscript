# stop-helpers.ps1 вЂ” РЅР°РґС‘Р¶РЅРѕ Р·Р°РєСЂС‹РІР°РµС‚ РІСЃРµ СЃРµСЂРІРёСЃС‹ VIBEPROMT

# 1) РћРєРЅР° СЃ РЅР°С€РёРјРё Р·Р°РіРѕР»РѕРІРєР°РјРё (РІРјРµСЃС‚Рµ СЃ РґРѕС‡РµСЂРЅРёРјРё РїСЂРѕС†РµСЃСЃР°РјРё)
Get-Process | Where-Object { $_.MainWindowTitle -like "VIBEPROMT-*" } | ForEach-Object {
    & taskkill /F /T /PID $_.Id 2>$null | Out-Null
}

# 2) ngrok вЂ” РґРѕР±РёРІР°РµРј РЅР°РїСЂСЏРјСѓСЋ
Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force

# 3) python СЃ bot.py РІ РєРѕРјР°РЅРґРЅРѕР№ СЃС‚СЂРѕРєРµ (РµСЃР»Рё РѕРєРЅРѕ СѓР¶Рµ СѓС€Р»Рѕ, Р° РїСЂРѕС†РµСЃСЃ Р¶РёРІ)
Get-CimInstance Win32_Process -Filter "Name='python.exe'" | Where-Object { $_.CommandLine -like "*bot.py*" } | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}

# 4) uvicorn РЅР° РїРѕСЂС‚Сѓ 8000 (РµСЃР»Рё РѕРєРЅРѕ СѓС€Р»Рѕ, Р° СЃРµСЂРІРµСЂ Р¶РёРІ)
Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}

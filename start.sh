#!/bin/bash
set -euo pipefail

PORT="${PORT:-8000}"
export PYTHONUNBUFFERED=1
export PYTHONPATH="/app/backend:${PYTHONPATH:-}"

cd /app/backend
uvicorn app.main:app --host 0.0.0.0 --port "$PORT" &
API_PID=$!

cd /app
python bot/bot.py &
BOT_PID=$!

cleanup() {
  kill "$API_PID" "$BOT_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Если упал любой процесс — перезапуск контейнера (restart policy)
wait -n "$API_PID" "$BOT_PID"
exit 1

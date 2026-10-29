#!/bin/bash
set -euo pipefail

PORT="${PORT:-8000}"
export PYTHONUNBUFFERED=1
export PYTHONPATH="/app/backend:${PYTHONPATH:-}"
export MINI_APP_URL="${MINI_APP_URL:-https://mindscript-64qg.onrender.com}"

echo "[start] MINI_APP_URL=$MINI_APP_URL"
echo "[start] PORT=$PORT"

start_api() {
  cd /app/backend
  uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
}

start_bot() {
  cd /app
  while true; do
    echo "[start] launching telegram bot..."
    python bot/bot.py || true
    echo "[start] bot exited, restart in 3s..."
    sleep 3
  done
}

start_api &
API_PID=$!
start_bot &
BOT_PID=$!

cleanup() {
  kill "$API_PID" "$BOT_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait -n "$API_PID" "$BOT_PID"
exit 1

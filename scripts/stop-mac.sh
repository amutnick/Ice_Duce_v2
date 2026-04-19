#!/bin/bash
set -euo pipefail

LOG_DIR="$HOME/Library/Logs/Ice Dice"
PID_FILE="$LOG_DIR/lan-server.pid"
PORT="3000"

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE" || true)"
  if [[ -n "${PID:-}" ]] && kill -0 "$PID" >/dev/null 2>&1; then
    kill "$PID"
    echo "Stopped Ice Dice LAN server (pid $PID)."
  else
    echo "No running LAN server found for stored pid."
  fi
  rm -f "$PID_FILE"
else
  echo "No launcher pid file found."
fi

PORT_PIDS="$(lsof -ti tcp:${PORT} 2>/dev/null || true)"
if [[ -n "$PORT_PIDS" ]]; then
  kill $PORT_PIDS >/dev/null 2>&1 || true
  echo "Stopped process(es) on port ${PORT}: ${PORT_PIDS}"
fi

if curl -fsS "http://127.0.0.1:${PORT}" >/dev/null 2>&1; then
  echo "A process is still listening on http://localhost:${PORT}."
fi

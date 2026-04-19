#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$HOME/Library/Logs/Ice Dice"
PID_FILE="$LOG_DIR/lan-server.pid"
LOG_FILE="$LOG_DIR/lan-server.log"
PORT="3000"

mkdir -p "$LOG_DIR"
cd "$ROOT_DIR"

find_host_name() {
  if [[ -n "${ICE_DICE_HOST:-}" ]]; then
    printf '%s' "$ICE_DICE_HOST"
    return
  fi

  local iface ip
  for iface in en0 en1; do
    ip="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
    if [[ -n "$ip" ]]; then
      printf '%s' "$ip"
      return
    fi
  done

  ip="$(route -n get default 2>/dev/null | awk '/interface: / {print $2; exit}' || true)"
  if [[ -n "$ip" ]]; then
    ip="$(ipconfig getifaddr "$ip" 2>/dev/null || true)"
    if [[ -n "$ip" ]]; then
      printf '%s' "$ip"
      return
    fi
  fi

  printf '%s.local' "$(scutil --get LocalHostName 2>/dev/null || hostname)"
}

server_is_up() {
  curl -fsS "http://127.0.0.1:${PORT}" >/dev/null 2>&1
}

HOST_NAME="$(find_host_name)"

restart_server() {
  local pids
  pids="$(lsof -ti tcp:${PORT} 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "Stopping existing process on port ${PORT}..."
    kill $pids >/dev/null 2>&1 || true
    sleep 1
  fi
}

if server_is_up; then
  restart_server
fi

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies..."
  npm install
fi

if [[ ! -f dist/index.html ]]; then
  echo "Building the browser app..."
  npm run build
fi

echo "Starting Ice Dice LAN server..."
ICE_DICE_HOST="$HOST_NAME" nohup npm run serve:lan >"$LOG_FILE" 2>&1 &
echo $! >"$PID_FILE"

for _ in {1..30}; do
  if server_is_up; then
    break
  fi
  sleep 1
done

open "http://localhost:${PORT}"
echo "Ice Dice is open in your browser."
echo "LAN address advertised as http://${HOST_NAME}:${PORT}"
echo "Server log: $LOG_FILE"

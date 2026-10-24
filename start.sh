#!/bin/sh
# Runs the OS from a local web server and opens it in your browser.
# YouTube videos (and Purble Place in some browsers) only work this way, not when
# index.html is opened as a file. Press Ctrl+C (or close this window) to stop.
cd "$(dirname "$0")" || exit 1
PORT="${PORT:-8000}"
URL="http://localhost:$PORT/"

open_browser() {
  xdg-open "$URL" 2>/dev/null || open "$URL" 2>/dev/null || echo "Open $URL in your browser"
}

# Already running (e.g. started twice)? Just open it again.
if python3 -c "import socket,sys; s=socket.socket(); sys.exit(0 if s.connect_ex(('127.0.0.1', $PORT)) == 0 else 1)"; then
  echo "The OS is already running at $URL"
  open_browser
  exit 0
fi

(sleep 1; open_browser) &
echo "Serving the OS at $URL (close this window to stop)"
python3 addons/serve.py "$PORT"

#!/bin/sh
# Runs the OS from a local web server and opens it in your browser.
# YouTube videos (and Purble Place in some browsers) only work this way, not when
# index.html is opened as a file. Press Ctrl+C to stop.
cd "$(dirname "$0")" || exit 1
PORT="${PORT:-8000}"
URL="http://localhost:$PORT/"
(sleep 1; xdg-open "$URL" 2>/dev/null || open "$URL" 2>/dev/null || echo "Open $URL in your browser") &
echo "Serving the OS at $URL"
python3 -m http.server "$PORT"

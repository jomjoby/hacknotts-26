"""Serves the OS from this folder on http://localhost:PORT/ without browser caching.

Python's plain `http.server` lets browsers keep old copies of files, so after a
`git pull` you could be running yesterday's index.js. This one tells the browser
not to keep copies, so a normal reload always shows the latest code.
Used by start.sh, start.bat and Start OS (Mac).command.
"""
import functools
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    handler = functools.partial(NoCacheHandler, directory=root)
    with http.server.ThreadingHTTPServer(("", port), handler) as server:
        print(f"Serving the OS at http://localhost:{port}/ (Ctrl+C to stop)")
        server.serve_forever()

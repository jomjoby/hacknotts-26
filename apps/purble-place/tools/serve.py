#!/usr/bin/env python3
"""Tiny static dev server for Purble Place (ES modules need http://, not file://).

    python tools/serve.py            # http://localhost:8765/
    python tools/serve.py 9000       # another port

Sends `Cache-Control: no-store` so edits show up on a normal reload, and makes sure
.js/.mjs/.css/.svg are served with the MIME types browsers require for modules.
"""
import http.server
import mimetypes
import os
import socketserver
import sys

mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/javascript", ".mjs")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("image/svg+xml", ".svg")

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):  # keep the console quiet; errors still show
        if args and str(args[1]).startswith(("4", "5")):
            super().log_message(fmt, *args)


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    with Server(("127.0.0.1", port), Handler) as httpd:
        print(f"Purble Place dev server: http://localhost:{port}/  (Ctrl+C to stop)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass

"""Sert dist/fil-patterns/browser avec la CSP de production (lue dans vercel.json).

Usage : python3 .claude/skills/relecture-fiche/serve-csp.py [port]   (défaut 4321)
"""
import functools, http.server, json, os, sys

ROOT = 'dist/fil-patterns/browser'
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4321
CSP = next(
    h['value']
    for rule in json.load(open('vercel.json'))['headers']
    for h in rule['headers']
    if h['key'] == 'Content-Security-Policy'
)


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Content-Security-Policy', CSP)
        super().end_headers()

    def translate_path(self, path):
        full = super().translate_path(path)
        return os.path.join(full, 'index.html') if os.path.isdir(full) else full

    def log_message(self, *args):
        pass


http.server.ThreadingHTTPServer(
    ('127.0.0.1', PORT), functools.partial(Handler, directory=os.path.abspath(ROOT))
).serve_forever()

// Sert le build statique (dist/fil-patterns/browser) pour les tests
// d'accessibilité Playwright. Ce script n'est jamais embarqué dans
// l'application : c'est un outil de test, pas un serveur applicatif.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = join(import.meta.dirname, '..', 'dist', 'fil-patterns', 'browser');
const PORT = Number(process.argv[2] ?? 4310);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

async function resolveFile(pathname) {
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const candidates = [
    join(ROOT, safePath),
    join(ROOT, safePath, 'index.html'),
    join(ROOT, 'index.html'),
  ];
  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch {
      // essaie le candidat suivant
    }
  }
  return null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const file = await resolveFile(decodeURIComponent(url.pathname));
  if (!file) {
    res.writeHead(404);
    res.end('Introuvable');
    return;
  }
  const body = await readFile(file);
  res.writeHead(200, { 'Content-Type': MIME_TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(body);
});

server.listen(PORT, () => {
  console.log(`Build statique servi sur http://localhost:${PORT}`);
});

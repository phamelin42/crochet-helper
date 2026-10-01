// Sert le build statique d'une application pour les tests Playwright.
// Jamais embarqué : c'est un outil de test, pas un serveur applicatif.
//   node e2e/static-server.mjs <dossier dist/<app>/browser> <port>
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve(process.argv[2] ?? 'dist');
const PORT = Number(process.argv[3] ?? 4310);

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
  for (const candidate of [
    join(ROOT, safePath),
    join(ROOT, safePath, 'index.html'),
    join(ROOT, 'index.html'),
  ]) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // candidat suivant
    }
  }
  return null;
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const file = await resolveFile(decodeURIComponent(url.pathname));
  if (!file) {
    res.writeHead(404);
    res.end('Introuvable');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME_TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
}).listen(PORT, () => console.log(`${ROOT} servi sur http://localhost:${PORT}`));

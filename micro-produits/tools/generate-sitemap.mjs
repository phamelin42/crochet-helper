// `sitemap.xml` et `robots.txt` d'une application, déduits des pages
// réellement pré-rendues : ajouter une route suffit à l'y faire entrer, une
// page `noindex` en est exclue (Search Console signale en erreur une URL
// soumise mais interdite). `<lastmod>` vient du dernier commit qui a touché
// le produit ou les bibliothèques (jamais la date du build, que Google
// ignore) ; absent sur un clone superficiel.
//   node tools/generate-sitemap.mjs <app>
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { application } from './apps.mjs';
import { pagesPrerendues } from './pages.mjs';

const app = application(process.argv[2]);
const produit = JSON.parse(await readFile(join(app.racine, 'produit.json'), 'utf8'));
const ORIGIN = process.env['SITE_ORIGIN'] ?? `https://${produit.domaine}`;

function lastmod() {
  try {
    const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
    if (git('rev-parse', '--is-shallow-repository') === 'true') return null;
    return git('log', '-1', '--format=%cs', '--', app.racine, 'libs') || null;
  } catch {
    return null;
  }
}

const date = lastmod();
const routes = [];
for (const route of await pagesPrerendues(app.dist)) {
  const html = await readFile(join(app.dist, route, 'index.html'), 'utf8');
  if (!/<meta name="robots" content="[^"]*noindex/.test(html)) routes.push(route);
}

const corps = routes
  .map((r) =>
    [
      '  <url>',
      `    <loc>${ORIGIN}${r}</loc>`,
      date ? `    <lastmod>${date}</lastmod>` : '',
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n'),
  )
  .join('\n');

await writeFile(
  join(app.dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${corps}\n</urlset>\n`,
);
await writeFile(
  join(app.dist, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`,
);
console.log(`${app.nom} — sitemap.xml : ${routes.length} pages (${ORIGIN})`);

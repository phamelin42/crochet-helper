import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Vérifie que chaque URL annoncée dans `sitemap.xml` correspond à une page
 * réellement pré-rendue, et que cette page porte bien ses métadonnées.
 *
 * Pourquoi dériver du sitemap plutôt que d'énumérer les pages. La CI tenait
 * jusqu'ici une liste écrite à la main (`lecteur/index.html`,
 * `en/reader/index.html`…). Elle a cessé d'être vraie dès que le lecteur a
 * changé d'URL, et l'échec ne disait rien du vrai problème : la liste, pas le
 * build. Le sitemap étant lui-même déduit de la sortie du build, ce contrôle
 * suit désormais toute évolution des routes sans intervention.
 */

const ROOT = 'dist/fil-patterns/browser';

const sitemap = await readFile(join(ROOT, 'sitemap.xml'), 'utf8');
const origin = sitemap.match(/<loc>(https?:\/\/[^/]+)/)?.[1];
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

if (!locs.length) {
  console.error('sitemap.xml ne déclare aucune URL.');
  process.exit(1);
}

const missing = [];
for (const loc of locs) {
  const route = loc.slice(origin.length).replace(/^\/|\/$/g, '');
  const file = join(ROOT, route, 'index.html');
  try {
    await access(file);
    const html = await readFile(file, 'utf8');
    if (!html.includes('rel="canonical"')) missing.push(`${file} — pas de canonical`);
  } catch {
    missing.push(`${file} — absent`);
  }
}

if (missing.length) {
  console.error(`\nPages annoncées au sitemap mais introuvables :\n${missing.join('\n')}\n`);
  process.exit(1);
}

console.log(`Pré-rendu : ${locs.length} pages annoncées, toutes présentes et canoniques.`);

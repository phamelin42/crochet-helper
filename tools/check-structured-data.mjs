/**
 * Données structurées de chaque page du sitemap : JSON valide, et rien que la
 * page ne montre (FAQ reprise mot pour mot, fil d'Ariane visible, dates des
 * articles). Voir `structured-data.mjs`.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { structuredDataProblems } from './structured-data.mjs';

const ROOT = 'dist/fil-patterns/browser';
const sitemap = await readFile(join(ROOT, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const pages = new Set(locs);
const origin = new URL(locs[0]).origin;

const errors = [];
let typed = 0;
for (const loc of locs) {
  const html = await readFile(join(ROOT, loc.slice(origin.length), 'index.html'), 'utf8');
  if (html.includes('application/ld+json')) typed++;
  for (const problem of structuredDataProblems(html, pages)) errors.push(`${loc} : ${problem}`);
}

if (errors.length) {
  console.error(
    `\nDonnées structurées sans contenu visible ou invalides :\n${errors.join('\n')}\n`,
  );
  process.exit(1);
}
console.log(
  `Données structurées : ${typed}/${locs.length} pages balisées, toutes reflètent leur contenu.`,
);

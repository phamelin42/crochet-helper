/**
 * Balises de chaque page du sitemap, lues dans le HTML pré-rendu (ce que voit
 * un robot sans JavaScript) : un seul h1, titre et description dans leurs
 * bornes, robots, canonique auto-référente, hreflang en/fr/x-default
 * réciproques, contenu principal présent. Voir `seo.mjs`.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { seoOf, seoProblems } from './seo.mjs';

const ROOT = 'dist/fil-patterns/browser';
const sitemap = await readFile(join(ROOT, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const origin = new URL(locs[0]).origin;

const pages = new Map();
for (const loc of locs) {
  const route = loc.slice(origin.length) || '/';
  pages.set(loc, seoOf(await readFile(join(ROOT, route, 'index.html'), 'utf8')));
}

const errors = [];
const short = [];
for (const [loc, seo] of pages) {
  for (const problem of seoProblems(loc, seo, (url) => pages.get(url)?.alternates)) {
    errors.push(`${loc} : ${problem}`);
  }
  if (seo.title.length < 50) short.push(`${loc} (${seo.title.length})`);
}

if (errors.length) {
  console.error(`\nBalises SEO à corriger :\n${errors.join('\n')}\n`);
  process.exit(1);
}
console.log(
  `SEO : ${pages.size} pages, un h1, titre ≤ 60, description 110-160, canonique et hreflang réciproques.` +
    (short.length ? ` Titres de moins de 50 caractères : ${short.length}.` : ''),
);

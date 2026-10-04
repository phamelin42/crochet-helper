/**
 * Compare le sitemap publié à celui que produit le dépôt (`npm run build`
 * d'abord) : URL en trop, URL en moins, balises que le dépôt ne produit plus.
 *
 *   node tools/diff-sitemap.mjs                       # https://patternreader.com/sitemap.xml
 *   node tools/diff-sitemap.mjs <url-ou-fichier.xml>
 *
 * Outil de poste, hors build : il lit le réseau, ce que le build ne fait pas.
 */
import { readFile } from 'node:fs/promises';
import { diffLocs, locsOf } from './sitemap.mjs';

const source = process.argv[2] ?? 'https://patternreader.com/sitemap.xml';
async function download(url) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${url} : HTTP ${response.status}`);
  return response.text();
}
const published = /^https?:/.test(source) ? await download(source) : await readFile(source, 'utf8');
const generated = await readFile('dist/fil-patterns/browser/sitemap.xml', 'utf8');

const a = locsOf(published);
const b = locsOf(generated);
const { onlyPublished, onlyGenerated } = diffLocs(a, b);
const count = (xml, tag) => (xml.match(new RegExp(`<${tag}>`, 'g')) ?? []).length;

console.log(`Publié : ${a.length} URL — dépôt : ${b.length} URL`);
for (const tag of ['lastmod', 'priority', 'changefreq']) {
  const n = count(published, tag);
  if (n) console.log(`Publié : ${n} <${tag}> (le dépôt n'en produit plus)`);
}
console.log(`\nEn ligne seulement (${onlyPublished.length}) :`);
for (const url of onlyPublished) console.log(`  - ${url}`);
console.log(`\nDépôt seulement, pas encore publiées (${onlyGenerated.length}) :`);
for (const url of onlyGenerated) console.log(`  + ${url}`);
process.exitCode = onlyPublished.length || onlyGenerated.length ? 1 : 0;

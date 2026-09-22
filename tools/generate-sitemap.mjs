/**
 * Génère `sitemap.xml` à partir des pages réellement pré-rendues.
 *
 * Le sitemap se déduit de la sortie du build plutôt que d'une liste tenue à la
 * main : ajouter une route suffit à l'y faire apparaître, et une route qui
 * cesse d'être pré-rendue en disparaît au lieu de renvoyer un 404 aux robots.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const ORIGIN = process.env['SITE_ORIGIN'] ?? 'https://patternreader.com';
const ROOT = 'dist/fil-patterns/browser';

/**
 * Correspondance entre une page anglaise (à la racine) et son équivalent
 * français (sous `/fr`), lue depuis la même table que l'application. Elle était
 * auparavant recopiée ici, et avait divergé dès que le lecteur a changé d'URL.
 */
const PATHS = JSON.parse(await readFile('src/app/core/i18n/route-paths.json', 'utf8'));
const ALTERNATES = new Map(
  Object.values(PATHS).map(({ fr, en }) => [en, fr === '/' ? '/fr' : `/fr${fr}`]),
);

async function findPages(dir) {
  const pages = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      pages.push(...(await findPages(full)));
    } else if (entry.name === 'index.html') {
      const route = `/${relative(ROOT, dir).split(sep).join('/')}`.replace(/\/$|^\/\.$/, '') || '/';
      pages.push(route);
    }
  }
  return pages;
}

/**
 * Paire anglais / français d'une route. Une sous-page hérite de la
 * correspondance de sa section, suffixe identique dans les deux langues :
 * `/glossary/sc` ↔ `/fr/glossaire/sc`.
 */
function pairFor(route) {
  for (const [en, fr] of ALTERNATES) {
    if (route === en || route === fr) return [en, fr];
    if (en === '/') continue;
    if (route.startsWith(`${en}/`)) return [route, `${fr}${route.slice(en.length)}`];
    if (route.startsWith(`${fr}/`)) return [`${en}${route.slice(fr.length)}`, route];
  }
  return null;
}

function alternatesFor(route) {
  const pair = pairFor(route);
  if (!pair) return '';
  const [en, fr] = pair;
  return [
    `    <xhtml:link rel="alternate" hreflang="en" href="${ORIGIN}${en === '/' ? '' : en}"/>`,
    `    <xhtml:link rel="alternate" hreflang="fr" href="${ORIGIN}${fr}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}${en === '/' ? '' : en}"/>`,
  ].join('\n');
}

/**
 * Une page marquée `noindex` (« Mes projets », propre à chaque appareil) n'a
 * rien à faire au sitemap : Search Console signale en erreur toute URL soumise
 * qu'on lui interdit d'indexer.
 */
async function isIndexable(route) {
  const html = await readFile(join(ROOT, route, 'index.html'), 'utf8');
  return !/<meta name="robots" content="[^"]*noindex/.test(html);
}

const allRoutes = (await findPages(ROOT)).sort();
const routes = [];
for (const route of allRoutes) if (await isIndexable(route)) routes.push(route);
const today = new Date().toISOString().slice(0, 10);

const body = routes
  .map((route) => {
    const alternates = alternatesFor(route);
    return [
      '  <url>',
      `    <loc>${ORIGIN}${route === '/' ? '/' : route}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      `    <changefreq>weekly</changefreq>`,
      `    <priority>${route === '/' ? '1.0' : '0.8'}</priority>`,
      alternates,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n');
  })
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>
`;

await writeFile(join(ROOT, 'sitemap.xml'), xml, 'utf8');
console.log(`sitemap.xml : ${routes.length} pages`);

// `robots.txt` doit désigner le même domaine que le sitemap et les URL
// canoniques. Le laisser statique dans `public/` garantissait qu'il finirait
// par diverger — c'est exactement ce qui s'est produit après le passage de
// Netlify à Vercel. Il est donc écrit ici, depuis la même origine.
const robots = `User-agent: *
Allow: /

Sitemap: ${ORIGIN}/sitemap.xml
`;
await writeFile(join(ROOT, 'robots.txt'), robots, 'utf8');
console.log(`robots.txt : ${ORIGIN}`);

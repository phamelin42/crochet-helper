/**
 * Génère `sitemap.xml` à partir des pages réellement pré-rendues.
 *
 * Le sitemap se déduit de la sortie du build plutôt que d'une liste tenue à la
 * main : ajouter une route suffit à l'y faire apparaître, et une route qui
 * cesse d'être pré-rendue en disparaît au lieu de renvoyer un 404 aux robots.
 */
import { readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const ORIGIN = process.env['SITE_ORIGIN'] ?? 'https://crochet-helper.vercel.app';
const ROOT = 'dist/fil-patterns/browser';

/** Correspondance entre une page française et son équivalent anglais. */
const ALTERNATES = new Map([
  ['/', '/en'],
  ['/lecteur', '/en/reader'],
  ['/glossaire', '/en/glossary'],
]);

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

function alternatesFor(route) {
  for (const [fr, en] of ALTERNATES) {
    if (route === fr || route === en) {
      return [
        `    <xhtml:link rel="alternate" hreflang="fr" href="${ORIGIN}${fr === '/' ? '' : fr}"/>`,
        `    <xhtml:link rel="alternate" hreflang="en" href="${ORIGIN}${en}"/>`,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}${fr === '/' ? '' : fr}"/>`,
      ].join('\n');
    }
  }
  return '';
}

const routes = (await findPages(ROOT)).sort();
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

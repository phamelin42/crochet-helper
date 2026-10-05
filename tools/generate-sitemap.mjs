/**
 * Génère `sitemap.xml` à partir des pages réellement pré-rendues.
 *
 * Une seule source : la sortie du build. Chaque page pré-rendue et indexable
 * y entre, avec les hreflang que déclare son propre `<head>` ; une route
 * ajoutée y apparaît d'elle-même, une page passée en `noindex` ou redirigée en
 * sort, et l'URL annoncée ne peut pas différer de la canonique de la page.
 *
 * Ni `<lastmod>`, ni `<priority>`, ni `<changefreq>` :
 * - Google ignore `priority` et `changefreq` ;
 * - `lastmod` n'est utile que s'il est vrai. La date du dernier commit sur
 *   les sources d'une page ne l'est pas (un changement de code n'est pas un
 *   changement de contenu, et toutes les pages du glossaire partagent un
 *   fichier), et l'hébergeur construit sur un clone superficiel où elle est
 *   inconnaissable. Mieux vaut aucune date qu'une date fausse : Google cesse
 *   de lire un `lastmod` qu'il a trouvé faux.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { linkProblems, linksOf } from './sitemap.mjs';

const ORIGIN = process.env['SITE_ORIGIN'] ?? 'https://patternreader.com';
const ROOT = 'dist/fil-patterns/browser';

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

/** Langue d'une route : tout ce qui vit sous `/fr` est français. */
const localeOf = (route) => (route === '/fr' || route.startsWith('/fr/') ? 'fr' : 'en');
const locOf = (route) => `${ORIGIN}${route}`;

/**
 * Les hreflang d'une page, recopiés de son `<head>` : une seule source pour la
 * page et le sitemap. Une page dont la canonique ou le hreflang qui la désigne
 * diffèrent de son `<loc>` fait échouer le build plutôt que d'être annoncée
 * sous deux formes.
 */
const incoherent = [];
async function alternatesFor(route) {
  const html = await readFile(join(ROOT, route, 'index.html'), 'utf8');
  const links = linksOf(html);
  for (const problem of linkProblems(locOf(route), localeOf(route), links)) {
    incoherent.push(`${route} : ${problem}`);
  }
  return links.alternates
    .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}"/>`)
    .join('\n');
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

const entries = [];
for (const route of routes) entries.push([route, await alternatesFor(route)]);
if (incoherent.length) {
  console.error(`\nURL incohérentes entre la page et le sitemap :\n${incoherent.join('\n')}\n`);
  process.exit(1);
}

const body = entries
  .map(([route, alternates]) =>
    ['  <url>', `    <loc>${locOf(route)}</loc>`, alternates, '  </url>']
      .filter(Boolean)
      .join('\n'),
  )
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

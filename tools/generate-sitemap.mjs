/**
 * Génère `sitemap.xml` à partir des pages réellement pré-rendues.
 *
 * Le sitemap se déduit de la sortie du build plutôt que d'une liste tenue à la
 * main : ajouter une route suffit à l'y faire apparaître, et une route qui
 * cesse d'être pré-rendue en disparaît au lieu de renvoyer un 404 aux robots.
 *
 * `<lastmod>` vient de la date du dernier commit qui a touché les sources
 * d'une route (`git log -1 --format=%cs`), jamais de la date du build : un
 * `lastmod` toujours égal à aujourd'hui n'est pas un signal, Google l'ignore.
 * Le CI clone en profondeur 1 (`actions/checkout` sans `fetch-depth`) : sur un
 * dépôt superficiel, ou sans `git` du tout, la date est absente plutôt que
 * fausse. `<changefreq>` a disparu : Google ne le lit pas. Les fonctions qui
 * décident de tout ça vivent dans `sitemap.mjs`, testées séparément
 * (`sitemap.test.mjs`) sans dépendre d'un build ni d'un vrai dépôt.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import {
  familiesFrom,
  isShallowRepository,
  lastmodFor,
  linkProblems,
  linksOf,
  sourcesFor,
} from './sitemap.mjs';

const ORIGIN = process.env['SITE_ORIGIN'] ?? 'https://patternreader.com';
const ROOT = 'dist/fil-patterns/browser';

/**
 * Correspondance entre une page anglaise (à la racine) et son équivalent
 * français (sous `/fr`), lue depuis la même table que l'application. Elle était
 * auparavant recopiée ici, et avait divergé dès que le lecteur a changé d'URL.
 */
const PATHS = JSON.parse(await readFile('src/app/core/i18n/route-paths.json', 'utf8'));
const FAMILIES = familiesFrom(PATHS);

/**
 * Chemins source dont un commit fait avancer le `lastmod` d'une route. Une
 * sous-page (`/glossary/sc`) hérite de la famille de sa section, sauf le
 * glossaire : chaque page-abréviation vient du moteur partagé, pas de la page
 * de liste (`glossary-page.ts`).
 */
const SOURCE_PATHS = {
  reader: ['src/app/features/reader'],
  glossary: ['src/app/features/glossary/glossary-page.ts'],
  format: ['src/app/features/format'],
  converter: ['src/app/features/converter'],
  guideReadingPattern: ['src/app/features/guides/pages/reading-pattern-page.ts'],
  guideReadingChart: ['src/app/features/guides/pages/reading-chart-page.ts'],
  guideCrochetOrKnitting: ['src/app/features/guides/pages/crochet-or-knitting-page.ts'],
  imageGrid: ['src/app/features/tools/pages/image-grid-page.ts'],
  forDesigners: ['src/app/features/designers'],
};
const GLOSSARY_TERM_SOURCES = [
  'src/app/features/reader/data/glossary.ts',
  'src/app/features/glossary/pages/term-page.ts',
];

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
const shallow = isShallowRepository();
let dated = 0;

const entries = [];
for (const route of routes) entries.push([route, await alternatesFor(route)]);
if (incoherent.length) {
  console.error(`\nURL incohérentes entre la page et le sitemap :\n${incoherent.join('\n')}\n`);
  process.exit(1);
}

const body = entries
  .map(([route, alternates]) => {
    const lastmod = shallow
      ? null
      : lastmodFor(sourcesFor(FAMILIES, SOURCE_PATHS, GLOSSARY_TERM_SOURCES, route));
    if (lastmod) dated++;
    return [
      '  <url>',
      `    <loc>${locOf(route)}</loc>`,
      lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
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
console.log(
  shallow
    ? `sitemap.xml : ${routes.length} pages, dépôt superficiel — sans lastmod`
    : `sitemap.xml : ${routes.length} pages, ${dated} datée(s)`,
);

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

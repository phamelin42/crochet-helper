// `sitemap.xml` et `robots.txt` déduits des pages réellement pré-rendues :
// ajouter une route suffit à l'y faire entrer, une page `noindex` en est
// exclue (Search Console signale en erreur une URL soumise mais interdite).
// `<lastmod>` vient du dernier commit qui a touché `src/` (jamais la date du
// build, que Google ignore) ; absent sur un clone superficiel.
import { execFileSync } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const produit = JSON.parse(await readFile('produit.json', 'utf8'));
const ORIGIN = process.env['SITE_ORIGIN'] ?? `https://${produit.domaine}`;
const ROOT = 'dist/app/browser';

async function pages(dir) {
  const trouvees = [];
  for (const entree of await readdir(dir, { withFileTypes: true })) {
    const chemin = join(dir, entree.name);
    if (entree.isDirectory()) trouvees.push(...(await pages(chemin)));
    else if (entree.name === 'index.html') {
      trouvees.push(`/${relative(ROOT, dir).split(sep).join('/')}`.replace(/\/$/, '') || '/');
    }
  }
  return trouvees;
}

function lastmod() {
  try {
    if (
      execFileSync('git', ['rev-parse', '--is-shallow-repository'], { encoding: 'utf8' }).trim() ===
      'true'
    ) {
      return null;
    }
    return (
      execFileSync('git', ['log', '-1', '--format=%cs', '--', 'src'], {
        encoding: 'utf8',
      }).trim() || null
    );
  } catch {
    return null;
  }
}

const date = lastmod();
const routes = [];
for (const route of (await pages(ROOT)).sort()) {
  const html = await readFile(join(ROOT, route, 'index.html'), 'utf8');
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
  join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${corps}\n</urlset>\n`,
);
await writeFile(
  join(ROOT, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`,
);
console.log(`sitemap.xml : ${routes.length} pages (${ORIGIN})`);

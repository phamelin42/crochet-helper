import { access, readdir, readFile } from 'node:fs/promises';
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

/*
 * `pages.css` est hors du bundle initial : une page ne l'a que si sa route la
 * demande (`styled()` dans `app.routes.ts`), qui la lie alors dans le HTML
 * pré-rendu. Une page qui emploie une de ses classes sans la lier s'affiche
 * sans style — sur une page qu'aucun test n'ouvre, personne ne le verrait.
 */
const pagesCss = (await readFile('src/styles/pages.css', 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
const classesOf = (css) => [...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]);
// Seules comptent les classes que `pages.css` est seule à définir : `.card`
// ou `.step-body`, qu'elle précise, sont déjà stylées par `styles.css`.
const global = new Set(
  classesOf(
    (
      await Promise.all(
        ['hanami.css', 'lecteur.css'].map((f) => readFile(join('src/styles', f), 'utf8')),
      )
    ).join('\n'),
  ),
);
const pageClasses = new Set(classesOf(pagesCss).filter((name) => !global.has(name)));
const unstyled = [];
for (const entry of await readdir(ROOT, { recursive: true })) {
  if (!entry.endsWith('index.html')) continue;
  const html = await readFile(join(ROOT, entry), 'utf8');
  if (/<link[^>]+href="pages\.css"/.test(html)) continue;
  const used = [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
  const found = [...new Set(used.filter((name) => pageClasses.has(name)))];
  if (found.length) unstyled.push(`${entry} — ${found.join(', ')}`);
}
if (unstyled.length) {
  console.error(
    `\nPages qui emploient des classes de pages.css sans la lier (route à déclarer avec styled()) :\n${unstyled.join('\n')}\n`,
  );
  process.exit(1);
}
console.log('Pré-rendu : chaque page qui emploie pages.css la lie.');

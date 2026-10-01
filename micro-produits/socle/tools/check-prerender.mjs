// Contrainte « tout est pré-rendu » : chaque route déclarée existe en HTML
// complet, avec son titre, sa description, son URL canonique et un <h1> non
// vide. Une page dont le contenu n'apparaît qu'après le JavaScript est un bug
// de référencement — c'est ici qu'il fait échouer le build.
import { readFile, readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const ROOT = 'dist/app/browser';
const ATTENDUES = ['/', '/mentions-legales', '/confidentialite'];

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

const problemes = [];
const routes = await pages(ROOT);
for (const r of ATTENDUES) if (!routes.includes(r)) problemes.push(`${r} : non pré-rendue`);

for (const route of routes) {
  const html = await readFile(join(ROOT, route, 'index.html'), 'utf8');
  if (!/<h1[^>]*>\s*[^<\s][^<]*<\/h1>/.test(html)) problemes.push(`${route} : <h1> absent ou vide`);
  if (!/<meta name="description" content="[^"]{50,}"/.test(html)) {
    problemes.push(`${route} : description absente ou trop courte`);
  }
  if (!/<link rel="canonical" href="https:\/\/[^"]+"/.test(html))
    problemes.push(`${route} : canonique absente`);
}

if (problemes.length) {
  console.error(`Pré-rendu incomplet :\n${problemes.join('\n')}`);
  process.exit(1);
}
console.log(`Pré-rendu : ${routes.length} pages complètes.`);

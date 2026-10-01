// Contrainte « tout est pré-rendu » : chaque route attendue existe en HTML
// complet, avec titre, description, URL canonique et un <h1> non vide. Une
// page dont le contenu n'apparaît qu'après le JavaScript est un bug de
// référencement — c'est ici qu'il fait échouer le build.
//   node tools/check-prerender.mjs <app>
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { application } from './apps.mjs';
import { pagesPrerendues } from './pages.mjs';

const app = application(process.argv[2]);
const ATTENDUES =
  app.nom === 'vitrine' ? ['/'] : ['/', '/aide', '/mentions-legales', '/confidentialite'];

const problemes = [];
const routes = await pagesPrerendues(app.dist);
for (const r of ATTENDUES) if (!routes.includes(r)) problemes.push(`${r} : non pré-rendue`);

for (const route of routes) {
  const html = await readFile(join(app.dist, route, 'index.html'), 'utf8');
  if (!/<h1[^>]*>\s*[^<\s][^<]*<\/h1>/.test(html)) problemes.push(`${route} : <h1> absent ou vide`);
  if (!/<meta name="description" content="[^"]{50,}"/.test(html)) {
    problemes.push(`${route} : description absente ou trop courte`);
  }
  if (!/<link rel="canonical" href="https:\/\/[^"]+"/.test(html)) {
    problemes.push(`${route} : canonique absente`);
  }
}

if (problemes.length) {
  console.error(`${app.nom} — pré-rendu incomplet :\n${problemes.join('\n')}`);
  process.exit(1);
}
console.log(`${app.nom} — pré-rendu : ${routes.length} pages complètes.`);

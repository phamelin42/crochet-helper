// Un composant ajouté à libs/ui entre dans la vitrine : sinon personne ne le
// voit dans ses états avant de l'utiliser. Les composants de layout sont
// montrés par la coquille, que la vitrine utilise.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const page = await readFile('projects/vitrine/src/app/vitrine-page.ts', 'utf8');
const shell = await readFile('libs/ui/src/layout/shell.ts', 'utf8');
const header = await readFile('libs/ui/src/layout/site-header.ts', 'utf8');
// Un composant employé par un autre composant montré (mp-paragraphes) est montré aussi.
const sections = await Promise.all(
  (await readdir('libs/ui/src/sections')).map((f) =>
    readFile(join('libs/ui/src/sections', f), 'utf8'),
  ),
);
const visibles = [page, shell, header, ...sections].join('\n');
const manquants = [];

for (const dossier of ['libs/ui/src/sections', 'libs/ui/src/layout']) {
  for (const f of await readdir(dossier)) {
    if (!f.endsWith('.ts') || f.endsWith('.spec.ts')) continue;
    const source = await readFile(join(dossier, f), 'utf8');
    const selecteur = /selector: '([a-z-]+)'/.exec(source)?.[1];
    if (selecteur && selecteur !== 'mp-shell' && !visibles.includes(`<${selecteur}`)) {
      manquants.push(`${selecteur} (${join(dossier, f)})`);
    }
  }
}

if (manquants.length) {
  console.error(`Absents de la vitrine :\n- ${manquants.join('\n- ')}`);
  process.exit(1);
}
console.log('Vitrine : chaque composant partagé y figure.');

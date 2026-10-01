// Pages pré-rendues d'un build : chaque `index.html` de dist/<app>/browser.
import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

export async function pagesPrerendues(racine, dir = racine) {
  const trouvees = [];
  for (const entree of await readdir(dir, { withFileTypes: true })) {
    const chemin = join(dir, entree.name);
    if (entree.isDirectory()) trouvees.push(...(await pagesPrerendues(racine, chemin)));
    else if (entree.name === 'index.html') {
      trouvees.push(`/${relative(racine, dir).split(sep).join('/')}`.replace(/\/$/, '') || '/');
    }
  }
  return trouvees.sort();
}

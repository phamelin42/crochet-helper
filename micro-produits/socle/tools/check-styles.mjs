// Règle « aucune valeur brute de style » (CLAUDE.md) : ni `styles:` ni
// `style="…"` dans les composants, aucune couleur brute hors de tokens.css.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function* fichiers(dir) {
  for (const entree of await readdir(dir, { withFileTypes: true })) {
    const chemin = join(dir, entree.name);
    if (entree.isDirectory()) yield* fichiers(chemin);
    else yield chemin;
  }
}

const problemes = [];
for await (const f of fichiers('src/app')) {
  if (!f.endsWith('.ts') || f.endsWith('.spec.ts')) continue;
  (await readFile(f, 'utf8')).split('\n').forEach((ligne, i) => {
    if (/^\s*styles:\s*[`[]/.test(ligne)) problemes.push(`${f}:${i + 1} — \`styles:\` local`);
    if (/\sstyle="/.test(ligne)) problemes.push(`${f}:${i + 1} — attribut style="…"`);
  });
}
for await (const f of fichiers('src/styles')) {
  if (!f.endsWith('.css') || f.endsWith('tokens.css')) continue;
  (await readFile(f, 'utf8')).split('\n').forEach((ligne, i) => {
    if (/#[0-9a-f]{3,8}\b|rgba?\(/i.test(ligne.replace(/\/\*.*?\*\//g, ''))) {
      problemes.push(`${f}:${i + 1} — valeur brute, utiliser un jeton de tokens.css`);
    }
  });
}

if (problemes.length) {
  console.error(`Styles hors règle :\n${problemes.join('\n')}`);
  process.exit(1);
}
console.log('Styles : aucun style local, aucune couleur brute hors tokens.css.');

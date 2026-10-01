// Règle « aucune valeur brute de style » (CLAUDE.md) : ni `styles:` ni
// `style="…"` dans un composant, aucune couleur brute hors de tokens.css, et
// aucune liaison de style hors de la coquille. Les couleurs d'un produit
// vivent dans son produit.json ; seule `mp-shell` les pose. Aucun produit ne
// définit ses propres styles.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const IGNORES = new Set(['node_modules', 'dist', '.angular', 'schematics', 'test-results']);

async function fichiers(dir, garder) {
  const liste = [];
  for (const entree of await readdir(dir, { withFileTypes: true })) {
    const chemin = join(dir, entree.name);
    if (entree.isDirectory()) {
      if (!IGNORES.has(entree.name)) liste.push(...(await fichiers(chemin, garder)));
    } else if (garder(chemin)) liste.push(chemin);
  }
  return liste;
}

const problemes = [];
const composants = [
  ...(await fichiers('libs', (f) => f.endsWith('.ts'))),
  ...(await fichiers('projects', (f) => f.endsWith('.ts'))),
].filter((f) => !f.endsWith('.spec.ts'));

for (const f of composants) {
  const coquille = f.endsWith(join('layout', 'shell.ts'));
  (await readFile(f, 'utf8')).split('\n').forEach((ligne, i) => {
    if (/^\s*styles:\s*[`[]/.test(ligne)) problemes.push(`${f}:${i + 1} — \`styles:\` local`);
    if (/\sstyle="/.test(ligne)) problemes.push(`${f}:${i + 1} — attribut style="…"`);
    if (!coquille && /\[style[\].]/.test(ligne)) {
      problemes.push(`${f}:${i + 1} — liaison de style : seule la coquille pose le thème`);
    }
  });
}

for (const f of await fichiers('.', (f) => f.endsWith('.css'))) {
  if (f.endsWith('tokens.css')) continue;
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

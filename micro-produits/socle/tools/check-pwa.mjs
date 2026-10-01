// PWA installable et hors ligne : les icônes du manifeste existent (sinon
// Chrome ne propose pas l'installation), et `ngsw.json` est régénéré après
// toute réécriture de dist/ (sinon le worker passe en mode dégradé).
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = 'dist/app/browser';
const problemes = [];

const manifeste = JSON.parse(await readFile(join(ROOT, 'manifest.webmanifest'), 'utf8'));
for (const icone of manifeste.icons ?? []) {
  try {
    await stat(join(ROOT, icone.src));
  } catch {
    problemes.push(`icône absente : ${icone.src} (lancer npm run icones)`);
  }
}
if (!(manifeste.icons ?? []).some((i) => i.sizes === '512x512' && i.purpose === 'maskable')) {
  problemes.push('icône maskable 512 × 512 absente du manifeste');
}

const ngsw = JSON.parse(await readFile(join(ROOT, 'ngsw.json'), 'utf8'));
for (const [url, empreinte] of Object.entries(ngsw.hashTable ?? {})) {
  try {
    const reelle = createHash('sha1')
      .update(await readFile(join(ROOT, url)))
      .digest('hex');
    if (reelle !== empreinte)
      problemes.push(`ngsw.json périmé pour ${url} (régénérer après réécriture)`);
  } catch {
    problemes.push(`ngsw.json cite un fichier absent : ${url}`);
  }
}

if (problemes.length) {
  console.error(`PWA :\n${problemes.join('\n')}`);
  process.exit(1);
}
console.log('PWA : icônes présentes, ngsw.json à jour.');

// PWA installable et hors ligne : les icônes du manifeste existent (sinon
// Chrome ne propose pas l'installation), et `ngsw.json` est régénéré après
// toute réécriture de dist/ (sinon le worker passe en mode dégradé).
//   node tools/check-pwa.mjs <app>
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { application } from './apps.mjs';

const app = application(process.argv[2]);
const problemes = [];

const manifeste = JSON.parse(await readFile(join(app.dist, 'manifest.webmanifest'), 'utf8'));
for (const icone of manifeste.icons ?? []) {
  try {
    await stat(join(app.dist, icone.src));
  } catch {
    problemes.push(`icône absente : ${icone.src} (npm run icones -- ${app.nom})`);
  }
}
if (!(manifeste.icons ?? []).some((i) => i.sizes === '512x512' && i.purpose === 'maskable')) {
  problemes.push('icône maskable 512 × 512 absente du manifeste');
}

const ngsw = JSON.parse(await readFile(join(app.dist, 'ngsw.json'), 'utf8'));
for (const [url, empreinte] of Object.entries(ngsw.hashTable ?? {})) {
  try {
    const reelle = createHash('sha1')
      .update(await readFile(join(app.dist, url)))
      .digest('hex');
    if (reelle !== empreinte) problemes.push(`ngsw.json périmé pour ${url}`);
  } catch {
    problemes.push(`ngsw.json cite un fichier absent : ${url}`);
  }
}

if (problemes.length) {
  console.error(`${app.nom} — PWA :\n${problemes.join('\n')}`);
  process.exit(1);
}
console.log(`${app.nom} — PWA : icônes présentes, ngsw.json à jour.`);

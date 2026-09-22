/**
 * Vérifie que chaque fichier annoncé dans \`ngsw.json\` a bien l'empreinte que
 * le service worker attend.
 *
 * Pourquoi : \`ng build\` calcule ces empreintes, puis nos scripts de
 * post-traitement (\`strip-event-dispatch.mjs\`) réécrivent le HTML. Une seule
 * empreinte fausse suffit pour que le service worker passe en mode dégradé
 * (\`EXISTING_CLIENTS_ONLY\`) et ne serve plus rien hors ligne — sans aucune
 * erreur visible au build. Le build régénère donc \`ngsw.json\` après le
 * post-traitement ; ce contrôle garantit que personne ne l'oublie.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = 'dist/fil-patterns/browser';
const manifest = JSON.parse(await readFile(join(ROOT, 'ngsw.json'), 'utf8'));
const stale = [];

for (const [url, expected] of Object.entries(manifest.hashTable)) {
  const actual = createHash('sha1')
    .update(await readFile(join(ROOT, decodeURIComponent(url))))
    .digest('hex');
  if (actual !== expected) stale.push(url);
}

if (stale.length) {
  console.error(
    `ngsw.json : ${stale.length} empreinte(s) périmée(s), le service worker serait dégradé :\n` +
      stale.slice(0, 10).join('\n') +
      '\nRégénérer ngsw.json après tout post-traitement (ngsw-config).\n',
  );
  process.exit(1);
}
console.log(`ngsw.json : ${Object.keys(manifest.hashTable).length} empreintes à jour.`);

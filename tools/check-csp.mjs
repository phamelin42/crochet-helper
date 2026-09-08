import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Vérifie que le HTML pré-rendu ne contient aucun gestionnaire d'événement
 * inline (`onload=`, `onclick=`…).
 *
 * Pourquoi ce garde-fou : l'optimisation `inlineCritical` d'Angular diffère la
 * feuille de style avec `media="print" onload="this.media='all'"`. Notre CSP
 * porte `script-src 'self'`, et un handler inline relève de `script-src`, pas
 * de `style-src` : il est donc bloqué, la feuille reste en `media="print"`, et
 * le site s'affiche sans style. Le symptôme est discret — tout va bien en
 * développement, où aucune CSP ne s'applique.
 *
 * Le jour où une mise à jour d'Angular réactive l'inlining, le build échoue
 * ici plutôt qu'en production.
 */

const ROOT = 'dist/fil-patterns/browser';
const INLINE_HANDLER = /\son[a-z]+\s*=\s*["']/i;

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return path.endsWith('.html') ? [path] : [];
  });
}

const offenders = htmlFiles(ROOT).filter((path) => INLINE_HANDLER.test(readFileSync(path, 'utf8')));

if (offenders.length) {
  console.error(
    `\nGestionnaire d'événement inline détecté dans ${offenders.length} page(s) :\n` +
      offenders.map((p) => `  ${p}`).join('\n') +
      `\n\nLa CSP du site (script-src 'self') le bloquera. Vérifier\n` +
      `optimization.styles.inlineCritical dans angular.json.\n`,
  );
  process.exit(1);
}

console.log(`CSP : aucun handler inline dans ${htmlFiles(ROOT).length} pages pré-rendues.`);

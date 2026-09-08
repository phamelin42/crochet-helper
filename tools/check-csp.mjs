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

/** `onload="…"`, `onclick="…"` : relèvent de `script-src`, pas de `style-src`. */
const INLINE_HANDLER = /\son[a-z]+\s*=\s*["']/i;

/**
 * Bloc `<script>` sans `src`. Les types non exécutables sont tolérés :
 * `application/json` (état d'hydratation) et `application/ld+json` (données
 * structurées) ne sont pas évalués comme du script.
 */
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)([^>]*)>/gi;
const HARMLESS_TYPE = /type\s*=\s*["'](application\/(ld\+)?json)["']/i;

function inlineScripts(html) {
  return [...html.matchAll(INLINE_SCRIPT)]
    .map((match) => match[1])
    .filter((attrs) => !HARMLESS_TYPE.test(attrs));
}

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return path.endsWith('.html') ? [path] : [];
  });
}

const pages = htmlFiles(ROOT);
const offenders = pages.flatMap((path) => {
  const html = readFileSync(path, 'utf8');
  const problems = [];
  if (INLINE_HANDLER.test(html)) problems.push("gestionnaire d'événement inline");
  const scripts = inlineScripts(html);
  if (scripts.length) problems.push(`${scripts.length} script(s) inline : ${scripts.join(' | ')}`);
  return problems.length ? [`  ${path}\n    ${problems.join('\n    ')}`] : [];
});

if (offenders.length) {
  console.error(
    `\nCode inline détecté dans ${offenders.length} page(s) pré-rendue(s) :\n` +
      offenders.join('\n') +
      `\n\nLa CSP du site (script-src 'self') le bloquera silencieusement.\n` +
      `Pistes : optimization.styles.inlineCritical dans angular.json,\n` +
      `withEventReplay() dans app.config.ts.\n`,
  );
  process.exit(1);
}

console.log(`CSP : aucun code inline dans ${pages.length} pages pré-rendues.`);

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Retire du HTML pré-rendu les deux scripts inline du rejeu d'événements.
 *
 * Pourquoi c'est nécessaire. `@angular/build` injecte `ng-event-dispatch-contract`
 * et l'appel à `__jsaction_bootstrap` dès qu'il produit du contenu SSR — c'est
 * un greffon de la chaîne de build, pas une conséquence de `withEventReplay()`,
 * et aucune option ne le désactive :
 *
 *     if (options.generateDedicatedSSRContent) {
 *       this.ssrPlugins.push(addEventDispatchContractPlugin(), addNoncePlugin());
 *     }
 *
 * Ces scripts sont inline, donc bloqués par notre `script-src 'self'`, et la
 * console se remplit de violations à chaque page.
 *
 * Pourquoi les supprimer plutôt que les autoriser. Inscrire leurs empreintes
 * SHA-256 dans la CSP supposerait de régénérer l'en-tête à chaque build : or
 * Vercel lit `vercel.json` depuis le dépôt, pas depuis la sortie du build. Une
 * empreinte calculée ici n'atteindrait jamais l'en-tête servi.
 *
 * Pourquoi c'est sans effet de bord. `app.config.ts` ne fournit pas
 * `withEventReplay()` : rien côté client ne lit ce contrat. Les scripts sont
 * du poids mort avant même d'être bloqués.
 */

const ROOT = 'dist/fil-patterns/browser';

const PATTERNS = [
  /<script\b[^>]*\bid="ng-event-dispatch-contract"[^>]*>[\s\S]*?<\/script>/gi,
  /<script\b(?![^>]*\bsrc=)[^>]*>\s*window\.__jsaction_bootstrap\([\s\S]*?<\/script>/gi,
];

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return path.endsWith('.html') ? [path] : [];
  });
}

let removed = 0;
let touched = 0;

for (const path of htmlFiles(ROOT)) {
  const before = readFileSync(path, 'utf8');
  let after = before;
  for (const pattern of PATTERNS) {
    after = after.replace(pattern, () => {
      removed++;
      return '';
    });
  }
  if (after !== before) {
    writeFileSync(path, after);
    touched++;
  }
}

console.log(`Rejeu d'événements : ${removed} script(s) retiré(s) dans ${touched} page(s).`);

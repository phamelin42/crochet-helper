/**
 * Vérifie les redirections sur le build, avant publication :
 *
 * - `vercel.json` et `netlify.toml` déclarent les mêmes règles, dans le même
 *   ordre (le premier hébergeur servi ne doit pas en savoir plus que l'autre) ;
 * - chaque ancienne URL connue répond par un 301, en une seule étape, vers une
 *   page réellement pré-rendue — jamais une chaîne, jamais un 404 ;
 * - aucune page du sitemap n'est masquée par une redirection.
 *
 * Les URL essayées viennent des règles elles-mêmes : chaque source exacte, et
 * pour une règle générique (`/en/*`), chaque page du sitemap qu'elle peut
 * atteindre. Une règle ajoutée est donc vérifiée sans liste à tenir.
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { applyRules, netlifyRules, redirectProblems, vercelRules } from './redirects.mjs';

const ROOT = 'dist/fil-patterns/browser';
const vercel = vercelRules(JSON.parse(await readFile('vercel.json', 'utf8')));
const netlify = netlifyRules(await readFile('netlify.toml', 'utf8'));
const sitemap = await readFile(join(ROOT, 'sitemap.xml'), 'utf8');
const pages = [...sitemap.matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)].map((m) => m[1]);
const isPage = (path) => existsSync(join(ROOT, path, 'index.html'));

const errors = [];
if (JSON.stringify(vercel) !== JSON.stringify(netlify)) {
  const max = Math.max(vercel.length, netlify.length);
  for (let i = 0; i < max; i++) {
    if (JSON.stringify(vercel[i]) !== JSON.stringify(netlify[i])) {
      errors.push(
        `règle ${i + 1} : vercel.json ${JSON.stringify(vercel[i])} ≠ netlify.toml ${JSON.stringify(netlify[i])}`,
      );
      break;
    }
  }
}

// Une règle générique couvre un ancien arbre d'une seule langue : `/en/*`
// l'anglais d'aujourd'hui (hors `/fr`), `/glossaire/*` le glossaire français.
// On y essaie chaque page actuelle de cet arbre, et chaque graphie redirigée
// (`/glossary/slst`) : son ancienne URL doit aller droit à la page du concept.
const current = [
  ...pages,
  ...vercel.map((r) => r.from).filter((from) => /^\/(fr\/glossaire|glossary)\/[^/*]+$/.test(from)),
];
const tried = new Set();
for (const rule of vercel) {
  if (!rule.from.endsWith('/*')) {
    tried.add(rule.from);
    continue;
  }
  const base = rule.from.slice(0, -2);
  const target = rule.to.replace(/\/?:splat$/, '');
  for (const path of current) {
    if (path === '/' || path === '/fr' || path.startsWith('/fr/') !== target.startsWith('/fr')) {
      continue;
    }
    if (target === '' || path.startsWith(`${target}/`)) {
      tried.add(`${base}/${path.slice(target.length + 1)}`);
    }
  }
}

for (const path of [...tried].sort()) {
  const result = redirectProblems(vercel, path, isPage);
  if (!result) continue;
  for (const problem of result.problems) errors.push(`${path} → ${result.to} : ${problem}`);
}
for (const page of pages) {
  if (applyRules(vercel, page)) errors.push(`${page} est au sitemap mais redirigée`);
}

if (errors.length) {
  console.error(`\nRedirections incorrectes :\n${errors.join('\n')}\n`);
  process.exit(1);
}
console.log(
  `Redirections : ${vercel.length} règles identiques sur Vercel et Netlify, ${tried.size} URL en 301 directe vers une page.`,
);

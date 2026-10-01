// Crée un produit : le schematic, puis Prettier sur ce qu'il a écrit (les
// schematics n'en passent pas, et `format:check` est requis en CI).
//   npm run nouveau-produit -- <slug>
import { spawnSync } from 'node:child_process';

const slug = process.argv[2];
if (!slug || !/^[a-z][a-z0-9-]*$/.test(slug)) {
  console.error('Usage : npm run nouveau-produit -- <slug de produits.json>');
  process.exit(1);
}

function lancer(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

lancer('npx', ['ng', 'generate', './schematics/collection.json:produit', slug]);
lancer('npx', [
  'prettier',
  '--write',
  '--log-level',
  'warn',
  'angular.json',
  `projects/${slug}`,
  `prompts/${slug}`,
]);
console.log(`
${slug} créé. Ensuite :
  npm run icones -- ${slug}
  npm run build -- ${slug}
Puis prompts/${slug}/01-module-metier.md et 02-contenu-editorial.md, et docs/lancement.md.`);

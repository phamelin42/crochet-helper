// Lance une cible Angular (`lint`, `test`…) sur chaque projet du workspace
// qui la déclare, bibliothèques puis produits. S'arrête au premier échec.
//   node tools/ng-tous.mjs test --no-watch
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [cible, ...options] = process.argv.slice(2);
const { projects } = JSON.parse(readFileSync('angular.json', 'utf8'));
const ordre = Object.entries(projects).sort(
  ([, a], [, b]) => (a.projectType === 'library' ? 0 : 1) - (b.projectType === 'library' ? 0 : 1),
);

for (const [nom, projet] of ordre) {
  if (!projet.architect?.[cible]) continue;
  console.log(`\n── ${cible} ${nom}`);
  const r = spawnSync('npx', ['ng', cible, nom, ...options], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

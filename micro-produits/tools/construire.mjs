// Build de production de chaque application (ou de celle nommée), puis les
// étapes qui suivent `ng build`, dans cet ordre : sitemap, régénération de
// `ngsw.json` (toujours après toute réécriture de dist/), contrôles.
//   node tools/construire.mjs [app]
import { spawnSync } from 'node:child_process';
import { application, applications } from './apps.mjs';

function lancer(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const nom = process.argv[2];
const cibles = nom ? [application(nom)] : applications();

lancer('node', ['tools/check-styles.mjs']);
lancer('node', ['tools/check-contenu.mjs']);
lancer('node', ['tools/check-vitrine.mjs']);
for (const app of cibles) {
  console.log(`\n── build ${app.nom}`);
  lancer('npx', ['ng', 'build', app.nom]);
  lancer('node', ['tools/generate-sitemap.mjs', app.nom]);
  lancer('npx', ['ngsw-config', app.dist, 'ngsw-config.json', '/']);
  lancer('node', ['tools/check-prerender.mjs', app.nom]);
  lancer('node', ['tools/check-pwa.mjs', app.nom]);
}

// Branche les hooks git du depot sur le poste courant, en posant
// `core.hooksPath` sur `.githooks`.
//
// Appele par le script npm `prepare`, donc a chaque `npm install` : un hook
// commite mais non branche ne garde rien (« Un garde-fou non branche ne garde
// rien », CLAUDE.md). Ne fait jamais echouer l'installation : hors depot git
// (installation depuis une archive) ou sur un runner, il n'y a rien a brancher.

import { execFileSync } from 'node:child_process';

const SILENCIEUX = { stdio: ['ignore', 'pipe', 'ignore'] };

function git(...args) {
  return execFileSync('git', args, SILENCIEUX).toString().trim();
}

if (process.env.CI === 'true') {
  process.exit(0);
}

try {
  if (git('rev-parse', '--is-inside-work-tree') !== 'true') {
    process.exit(0);
  }
} catch {
  // Pas un depot git : rien a brancher, et surtout pas une erreur.
  process.exit(0);
}

try {
  const actuel = (() => {
    try {
      return git('config', '--local', '--get', 'core.hooksPath');
    } catch {
      return '';
    }
  })();

  if (actuel !== '.githooks') {
    git('config', '--local', 'core.hooksPath', '.githooks');
    console.log('Hooks git branches sur .githooks (verify avant chaque push).');
  }
} catch (erreur) {
  console.warn(`Hooks git non branches : ${erreur.message}`);
  console.warn('A brancher a la main : git config core.hooksPath .githooks');
}

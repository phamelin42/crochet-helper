import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

/**
 * Charge `renderPattern` et `CHART_SYMBOLS` de l'application depuis `tools/` :
 * Node ne résout pas les imports sans extension de `chart-composer.ts`. On les
 * transpile donc vers `tools/charts/out/.build/`, sans réécrire ni dupliquer la
 * logique (l'étude mesure la sortie réelle du composeur, pas une copie).
 */

const ROOT = resolve('.');
const DATA = join(ROOT, 'src/app/features/reader/data');
const BUILD = join(ROOT, 'tools/charts/out/.build');

const SOURCES = [
  [join(ROOT, 'src/app/core/i18n/locale.ts'), 'locale.mjs'],
  [join(DATA, 'chart-symbols.ts'), 'chart-symbols.mjs'],
  [join(DATA, 'chart-composer.ts'), 'chart-composer.mjs'],
];

function transpile(source) {
  return ts
    .transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: 'ES2022' } })
    .outputText.replace(/from '\.\.\/\.\.\/\.\.\/core\/i18n\/locale'/g, "from './locale.mjs'")
    .replace(/from '\.\/chart-symbols'/g, "from './chart-symbols.mjs'");
}

export async function loadComposer() {
  mkdirSync(BUILD, { recursive: true });
  for (const [from, to] of SOURCES) {
    writeFileSync(join(BUILD, to), transpile(readFileSync(from, 'utf8')));
  }
  const composer = await import(pathToFileURL(join(BUILD, 'chart-composer.mjs')).href);
  const symbols = await import(pathToFileURL(join(BUILD, 'chart-symbols.mjs')).href);
  return { ...composer, CHART_SYMBOLS: symbols.CHART_SYMBOLS };
}

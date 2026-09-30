import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { loadComposer } from './composer.mjs';
import { recognizeImages } from './recognize.mjs';
import { score } from './study.mjs';

const FIXTURES = resolve('tools/fixtures/charts');

// Ce que la lectrice doit obtenir : la transcription écrite du diagramme, à la lettre.
const SIMPLE = ['ring-1', 'ring-2', 'flat-1'];

test('trois diagrammes simples sont transcrits exactement, sans requête réseau', async () => {
  const { renderPattern } = await loadComposer();
  const { results, attempted } = await recognizeImages(
    SIMPLE.map((n) => join(FIXTURES, `${n}.png`)),
  );

  SIMPLE.forEach((name, i) => {
    const expected = readFileSync(join(FIXTURES, `${name}.expected.txt`), 'utf8').trim();
    assert.equal(renderPattern(results[i].rounds, 'US'), expected, name);
  });
  assert.equal(attempted, 0, 'le prototype ne doit émettre aucune requête');
});

test('le score compte la bonne classe à la bonne place, pas seulement le bon total', () => {
  const round = (ids) => ({
    kind: 'round',
    groups: [{ tokens: ids.map((symbol) => ({ symbol, count: 1 })), repeat: 1 }],
  });
  const s = score([round(['sc', 'dc', 'sc'])], [round(['dc', 'sc', 'sc'])]);
  assert.equal(s.right, 1);
  assert.equal(s.symbols, 3);
});

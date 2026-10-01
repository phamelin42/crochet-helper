// Un événement se déclare deux fois : dans `EVENEMENTS` côté application et
// dans `EVENEMENTS` de tools/umami.mjs. Sinon il est collecté mais absent de
// tout rapport.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { EVENEMENTS } from './umami.mjs';

test('les événements de l’application et du rapport concordent', async () => {
  const source = await readFile('libs/core/src/analytics/evenements.ts', 'utf8');
  const bloc = /EVENEMENTS = \[([\s\S]*?)\] as const/.exec(source)?.[1] ?? '';
  const application = [...bloc.matchAll(/^\s*'([a-z0-9_]+)',/gm)].map((m) => m[1]);
  assert.ok(application.length > 0);
  assert.deepEqual([...application].sort(), [...EVENEMENTS].sort());
});

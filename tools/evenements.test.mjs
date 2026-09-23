// Un événement ajouté à AnalyticsEvent mais pas à EVENEMENTS est collecté par
// Umami et n'apparaît dans aucun rapport ; l'inverse fait écrire « 0 » chaque
// matin pour un événement qui n'existe pas. Les deux listes doivent être égales.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { EVENEMENTS } from './umami.mjs';

test('EVENEMENTS de tools/umami.mjs = union AnalyticsEvent du service', () => {
  const source = readFileSync(
    new URL('../src/app/core/analytics/analytics.service.ts', import.meta.url),
    'utf8',
  );
  const union = /export type AnalyticsEvent =([\s\S]*?);/.exec(source);
  assert.ok(union, 'type AnalyticsEvent introuvable');
  const declares = [...union[1].matchAll(/\|\s*'([a-z_]+)'/g)].map((m) => m[1]);
  assert.ok(declares.length > 0, 'aucun événement lu dans AnalyticsEvent');
  assert.deepEqual([...declares].sort(), [...EVENEMENTS].sort());
});

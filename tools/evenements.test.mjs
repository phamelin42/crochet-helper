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
  const declares = [...union[1].matchAll(/\|\s*'([a-z0-9_]+)'/g)].map((m) => m[1]);
  assert.ok(declares.length > 0, 'aucun événement lu dans AnalyticsEvent');
  assert.deepEqual([...declares].sort(), [...EVENEMENTS].sort());
});

// La page de confidentialité énumère les événements : un oubli la rendrait fausse.
// Le type `Record<AnalyticsEvent, Record<Locale, string>>` garantit déjà les deux langues.
test('PRIVACY_EVENTS décrit exactement les événements de AnalyticsEvent', () => {
  const source = readFileSync(
    new URL('../src/app/features/legal/data/privacy-events.ts', import.meta.url),
    'utf8',
  );
  const body = /PRIVACY_EVENTS[^=]*=\s*\{([\s\S]*?)\n\};/.exec(source);
  assert.ok(body, 'PRIVACY_EVENTS introuvable');
  const described = [...body[1].matchAll(/^ {2}([a-z0-9_]+): \{/gm)].map((m) => m[1]);
  assert.deepEqual([...described].sort(), [...EVENEMENTS].sort());
});

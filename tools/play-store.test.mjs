import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PACKAGE_NAME } from './assetlinks.mjs';

// Limites de la console Play : le nom est compté à 30, la courte à 80, la longue à 4 000.
const LIMITES = { Name: 30, 'Short description': 80, 'Full description': 4000 };
const fiche = readFileSync('docs/play-store.md', 'utf8');

function bloc(titre, langue) {
  const apres = fiche.split(`#### ${titre} (${langue})`)[1];
  assert.ok(apres, `section « ${titre} (${langue}) » absente`);
  const texte = apres.match(/```text\n([\s\S]*?)\n```/)?.[1];
  assert.ok(texte, `bloc de « ${titre} (${langue}) » absent`);
  return texte;
}

for (const langue of ['en', 'fr']) {
  for (const [titre, limite] of Object.entries(LIMITES)) {
    test(`${titre} (${langue}) tient dans ${limite} caractères`, () => {
      const longueur = [...bloc(titre, langue)].length;
      assert.ok(longueur > 0 && longueur <= limite, `${longueur} caractères pour ${limite}`);
    });
  }
}

test('le projet TWA vise le bon paquet, porte l’UTM et ne contient aucun secret', () => {
  const brut = readFileSync('twa/twa-manifest.json', 'utf8');
  const twa = JSON.parse(brut);
  assert.equal(twa.packageId, PACKAGE_NAME);
  assert.equal(twa.host, 'patternreader.com');
  assert.equal(twa.startUrl, '/?mode=app&utm_source=play_store&utm_medium=app');
  assert.equal(twa.enableNotifications, false);
  assert.equal(twa.fallbackType, 'customtabs');
  assert.doesNotMatch(brut, /password|BEGIN .*PRIVATE/i);
});

test('le manifeste du site est prêt pour la TWA', () => {
  const m = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
  assert.equal(m.id, '/');
  assert.equal(m.scope, '/');
  assert.equal(m.orientation, 'any');
  assert.deepEqual(m.categories, ['lifestyle', 'productivity']);
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
  assert.ok(m.screenshots.length >= 2);
  assert.ok(m.screenshots.every((s) => s.form_factor === 'narrow'));
});

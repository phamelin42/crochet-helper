import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { ETAPES, VISITEURS_MIN, evaluerTunnel } from './tunnel.mjs';
import { EVENEMENTS } from './umami.mjs';

const pourcent = (x) => `${String(Number((x * 100).toFixed(1))).replace('.', ',')}\u00a0%`;

test('docs/tunnel.md annonce les seuils du code, cran par cran', async () => {
  const doc = await readFile('docs/tunnel.md', 'utf8');
  for (const e of ETAPES) {
    const ligne = doc.split('\n').find((l) => l.includes(`\`${e.cle}\``));
    assert.ok(ligne, `cran ${e.cle} absent de docs/tunnel.md`);
    assert.ok(ligne.includes(pourcent(e.sain)), `${e.cle} : seuil sain ${pourcent(e.sain)}`);
    assert.ok(
      ligne.includes(pourcent(e.alerte)),
      `${e.cle} : seuil d'alerte ${pourcent(e.alerte)}`,
    );
  }
  assert.ok(doc.includes(String(VISITEURS_MIN)));
});

test('chaque cran ne cite que des événements déclarés', () => {
  for (const e of ETAPES) {
    const noms = [...e.numerateur, ...(Array.isArray(e.denominateur) ? e.denominateur : [])];
    for (const n of noms) assert.ok(EVENEMENTS.includes(n), `${e.cle} : ${n}`);
    assert.ok(e.alerte < e.sain, `${e.cle} : alerte sous le seuil sain`);
  }
});

test('verdicts : sain, à surveiller, alerte, insuffisant', () => {
  const ev = Object.fromEntries(EVENEMENTS.map((n) => [n, 0]));
  assert.equal(evaluerTunnel(1000, { ...ev, outil_commence: 500 })[0].verdict, 'sain');
  assert.equal(evaluerTunnel(1000, { ...ev, outil_commence: 300 })[0].verdict, 'a_surveiller');
  assert.equal(evaluerTunnel(1000, { ...ev, outil_commence: 100 })[0].verdict, 'alerte');
  assert.equal(
    evaluerTunnel(VISITEURS_MIN - 1, { ...ev, outil_commence: 199 })[0].verdict,
    'insuffisant',
  );
  // Dénominateur nul : pas de taux, jamais une division par zéro.
  const resultat = evaluerTunnel(1000, ev).find((c) => c.cle === 'resultat');
  assert.equal(resultat.taux, null);
  assert.equal(resultat.verdict, 'insuffisant');
});

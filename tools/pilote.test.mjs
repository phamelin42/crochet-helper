// Lancé par `npm run test:tools` : les gardes décident si l'agent est appelé.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  PLANCHER_VISITES,
  fichesAFaire,
  gardeHebdo,
  gardeLot,
  gardeRapport,
  ligneCout,
  ordreDesFiches,
} from './pilote.mjs';

function umami({ ok = true, periode = 10, reference = 20, pages = 30, evenements = 0 } = {}) {
  const fenetre = (sessions) => ({
    stats: { visiteurs: sessions, sessions, pages_vues: pages },
    evenements: { pattern_parsed: evenements },
  });
  return ok
    ? { ok, fin: '2026-09-23', periode: fenetre(periode), reference: fenetre(reference) }
    : { ok, fin: '2026-09-23', erreur: 'API Umami : HTTP 401', periode: null, reference: null };
}

test('rapport : sans données, pas d’agent, rapport de deux lignes avec l’erreur', () => {
  const g = gardeRapport(umami({ ok: false }));
  assert.equal(g.agir, false);
  assert.match(g.rapport, /^# Rapport du 23\/09\/2026\n\nPas de données : API Umami : HTTP 401/);
});

test('rapport : sous le plancher sur 8 jours, constat écrit sans agent', () => {
  const g = gardeRapport(umami({ periode: 10, reference: PLANCHER_VISITES - 11, evenements: 2 }));
  assert.equal(g.agir, false);
  assert.match(g.rapport, /10 visiteuses, 30 pages vues, 2 événements/);
  assert.doesNotMatch(g.rapport, /Entonnoir vide/);
});

test('rapport : sous le plancher, l’entonnoir vide est quand même signalé', () => {
  const g = gardeRapport(umami({ evenements: 0, pages: 12 }));
  assert.match(g.rapport, /Entonnoir vide malgré des pages vues/);
});

test('rapport : au plancher, l’agent est appelé', () => {
  const g = gardeRapport(umami({ periode: 10, reference: PLANCHER_VISITES - 10 }));
  assert.equal(g.agir, true);
});

const AVANCEMENT = `| Fiche | État | PR | Date |
| --- | --- | --- | --- |
| 17 — Tailles | À faire | — | — |
| 18 — Matériel | À faire | — | — |
| 20 — Comptes | Bloquée : lot 8 gelé | — | — |
| 21 — Retour | À faire | — | — |
| 16 — Projets | Terminée | — | 2026-09-22 |
`;

const README = `# Fiches
## Ordre d'exécution

| #   | Fiche | Pourquoi |
| --- | ----- | -------- |
| 16  | Projets | … |
| 21  | Retour | … |
| 18  | Matériel | … |
| 20  | Comptes | … |
| 17  | Tailles | … |
`;

test('avancement : seules les fiches « À faire » comptent, jamais une bloquée', () => {
  assert.deepEqual(fichesAFaire(AVANCEMENT), ['17', '18', '21']);
  assert.deepEqual(ordreDesFiches(README), ['16', '21', '18', '20', '17']);
});

test('lot : la première fiche de l’ordre, à faire et sans branche', () => {
  assert.equal(gardeLot(README, AVANCEMENT, '').raison, 'fiche 21');
  assert.equal(gardeLot(README, AVANCEMENT, '').fiche, '21');
  assert.equal(
    gardeLot(README, AVANCEMENT, 'origin/main origin/21-mesure-retour').raison,
    'fiche 18',
  );
  assert.equal(gardeLot(README, AVANCEMENT, 'origin/21-a').fiche, '18');
  const rien = gardeLot(README, AVANCEMENT, 'origin/21-a origin/18-b origin/17-c');
  assert.equal(rien.agir, false);
  assert.equal(rien.fiche, undefined);
});

test('lot : les tables réelles du dépôt sont cohérentes, avancement compris', () => {
  const readme = readFileSync(new URL('../prompts/README.md', import.meta.url), 'utf8');
  const avancement = readFileSync(new URL('../automation/avancement.md', import.meta.url), 'utf8');
  const ordre = ordreDesFiches(readme);
  const aFaire = fichesAFaire(avancement);
  assert.ok(ordre.length > 0, 'la table d’ordre est lisible');
  for (const fiche of aFaire) {
    assert.ok(ordre.includes(fiche), `la fiche ${fiche} « À faire » figure dans la table d’ordre`);
  }
  const g = gardeLot(readme, avancement, '');
  assert.notEqual(g.fiche, '20', 'la 20 est bloquée');
  // Toutes les fiches terminées : ne rien faire est alors la bonne réponse.
  assert.equal(g.agir, aFaire.length > 0, g.raison);
});

test('hebdo : faible trafic et file pleine → pas d’agent ; file courte → agent', () => {
  assert.equal(gardeHebdo(umami({ periode: 40 }), AVANCEMENT).agir, false);
  assert.equal(gardeHebdo(umami({ periode: 40 }), '| 17 — X | À faire | — | — |').agir, true);
  assert.equal(gardeHebdo(umami({ periode: PLANCHER_VISITES }), AVANCEMENT).agir, true);
  assert.equal(gardeHebdo(umami({ ok: false }), AVANCEMENT).agir, false);
});

test('coût : tours et coût du dernier résultat, ou « agent sauté »', () => {
  const execution = [{ type: 'system' }, { type: 'result', num_turns: 4, total_cost_usd: 0.1004 }];
  assert.equal(
    ligneCout({ date: '2026-09-23', workflow: 'rapport', execution }),
    '| 2026-09-23 | rapport | 4 tours | 0.10 $ | — |',
  );
  assert.equal(
    ligneCout({ date: '2026-09-23', workflow: 'lot', execution: null, raison: 'rien' }),
    '| 2026-09-23 | lot | agent sauté | — | rien |',
  );
});

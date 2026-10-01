import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EVENEMENTS, bornesMois, collecter, lireStats, moisPrecedent } from './umami.mjs';

test('mois précédent, passage d’année compris', () => {
  assert.equal(moisPrecedent(Date.UTC(2026, 9, 1)), '2026-09');
  assert.equal(moisPrecedent(Date.UTC(2027, 0, 15)), '2026-12');
});

test('bornes d’un mois : premier jour, nombre de jours, février bissextile', () => {
  assert.deepEqual(
    [bornesMois('2026-02').debut, bornesMois('2026-02').jours, bornesMois('2028-02').jours],
    ['2026-02-01', 28, 29],
  );
});

test('statistiques Umami 2 et Umami 3 lues pareil', () => {
  const v2 = lireStats({
    visitors: { value: 10 },
    visits: { value: 12 },
    pageviews: { value: 30 },
    bounces: { value: 6 },
  });
  const v3 = lireStats({ visitors: 10, visits: 12, pageviews: 30, bounces: 6 });
  assert.deepEqual(v2, v3);
  assert.equal(v3.taux_rebond, 0.5);
});

test('sans secrets : ok false, pas d’exception', async () => {
  const sortie = await collecter({
    mois: '2026-09',
    env: {},
    fetch: () => assert.fail('aucun appel'),
  });
  assert.equal(sortie.ok, false);
  assert.match(sortie.erreur, /Secrets/);
});

test('chaque événement apparaît, à 0 s’il n’a pas eu lieu ; le jeton ne fuit pas', async () => {
  const fetch = async (url) => {
    const corps = url.includes('/stats')
      ? { visitors: 400, visits: 500, pageviews: 900, bounces: 100 }
      : url.includes('type=event')
        ? [
            { x: 'outil_commence', y: 200 },
            { x: 'inconnu', y: 3 },
          ]
        : [];
    return new Response(JSON.stringify(corps), { status: 200 });
  };
  const env = { UMAMI_URL: 'https://u.test', UMAMI_TOKEN: 'secret', UMAMI_WEBSITE_ID: 'site' };
  const sortie = await collecter({ mois: '2026-09', env, fetch });
  assert.equal(sortie.ok, true);
  for (const nom of EVENEMENTS) assert.equal(typeof sortie.periode.evenements[nom], 'number', nom);
  assert.equal(sortie.periode.evenements.outil_commence, 200);
  assert.equal('inconnu' in sortie.periode.evenements, false);
  assert.equal(sortie.periode.tunnel[0].verdict, 'sain');

  const enPanne = await collecter({
    mois: '2026-09',
    env,
    fetch: async () => {
      throw new Error('refus pour secret');
    },
  });
  assert.equal(enPanne.ok, false);
  assert.doesNotMatch(enPanne.erreur, /secret/);
});

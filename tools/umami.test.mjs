// Lancé par `npm run verify` (`npm run test:tools`) : le rapport quotidien lit
// ce que ce script imprime, il doit rester juste quand Umami change.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { EVENEMENTS, collecter, fenetres, minuitParis, structure } from './umami.mjs';

const ENV = {
  UMAMI_URL: 'https://analytics.example/',
  UMAMI_TOKEN: 'jeton-secret',
  UMAMI_WEBSITE_ID: 'site-1',
};

function faussesApi(repondre) {
  const appels = [];
  const fetch = async (url) => {
    const u = new URL(url);
    appels.push(u);
    const [statut, corps] = repondre(u);
    return { ok: statut < 400, status: statut, text: async () => JSON.stringify(corps) };
  };
  return { fetch, appels };
}

const STATS_V2 = {
  pageviews: { value: 120, prev: 0 },
  visitors: { value: 40, prev: 0 },
  visits: { value: 50, prev: 0 },
  bounces: { value: 20, prev: 0 },
  totaltime: { value: 5000, prev: 0 },
};
const STATS_V3 = { pageviews: 120, visitors: 40, visits: 50, bounces: 20, totaltime: 5000 };

function umami(stats, typePage) {
  return (u) => {
    if (u.pathname.endsWith('/stats')) return [200, stats];
    const type = u.searchParams.get('type');
    if (type === 'event')
      return [
        200,
        [
          { x: 'pattern_pasted', y: 30 },
          { x: 'pattern_parsed', y: 25 },
          { x: 'step_advanced', y: 200 },
          { x: 'inconnu', y: 3 },
        ],
      ];
    if (type === 'referrer') return [200, [{ x: 'google.com', y: 9 }]];
    if (type === typePage) return [200, [{ x: '/', y: 80 }]];
    return [400, { error: 'bad type' }];
  };
}

test('sans secrets : ok false, forme complète, aucun appel réseau', async () => {
  const { fetch, appels } = faussesApi(() => [200, {}]);
  const r = await collecter({ mode: 'quotidien', date: '2026-09-22', env: {}, fetch });
  assert.equal(r.ok, false);
  assert.match(r.erreur, /UMAMI_URL/);
  assert.equal(r.periode, null);
  assert.equal(appels.length, 0);
});

test('Umami 2 et Umami 3 donnent la même sortie', async () => {
  const v2 = await collecter({
    mode: 'quotidien',
    date: '2026-09-22',
    env: ENV,
    fetch: faussesApi(umami(STATS_V2, 'url')).fetch,
    maintenant: 0,
  });
  const v3 = await collecter({
    mode: 'quotidien',
    date: '2026-09-22',
    env: ENV,
    fetch: faussesApi(umami(STATS_V3, 'path')).fetch,
    maintenant: 0,
  });
  assert.equal(v2.ok, true, v2.erreur);
  assert.deepEqual(v2, v3);
  assert.deepEqual(v2.periode.stats, {
    visiteurs: 40,
    sessions: 50,
    pages_vues: 120,
    sessions_par_visiteur: 1.25,
    taux_rebond: 0.4,
    duree_moyenne_session_s: 100,
  });
  assert.deepEqual(v2.periode.pages, [{ nom: '/', nombre: 80 }]);
});

test('chaque événement instrumenté est présent, à 0 par défaut ; les inconnus sont écartés', async () => {
  const r = await collecter({
    mode: 'quotidien',
    date: '2026-09-22',
    env: ENV,
    fetch: faussesApi(umami(STATS_V3, 'path')).fetch,
  });
  assert.deepEqual(Object.keys(r.periode.evenements), EVENEMENTS);
  for (const e of EVENEMENTS) assert.equal(typeof r.periode.evenements[e], 'number', e);
  assert.equal(r.periode.evenements.pdf_imported, 0);
  assert.equal(r.periode.evenements.pattern_pasted, 30);
  assert.ok(!('inconnu' in r.periode.evenements));
});

test('la référence précède la période sans la contenir', () => {
  for (const mode of ['quotidien', 'hebdo']) {
    const f = fenetres(mode, '2026-09-22');
    assert.equal(f.periode.fin, '2026-09-22', mode);
    assert.equal(f.reference.jours, 7, mode);
    assert.ok(f.reference.endAt < f.periode.startAt, mode);
    assert.equal(f.reference.endAt + 1, f.periode.startAt, `${mode} : pas de trou`);
  }
  assert.equal(fenetres('hebdo', '2026-09-22').mois.jours, 28);
});

test('les jours suivent l’heure de Paris, y compris au changement d’heure', () => {
  assert.equal(new Date(minuitParis('2026-09-22')).toISOString(), '2026-09-21T22:00:00.000Z');
  assert.equal(new Date(minuitParis('2026-01-15')).toISOString(), '2026-01-14T23:00:00.000Z');
  assert.equal(new Date(minuitParis('2026-03-29')).toISOString(), '2026-03-28T23:00:00.000Z');
  assert.equal(new Date(minuitParis('2026-10-25')).toISOString(), '2026-10-24T22:00:00.000Z');
  const f = fenetres('quotidien', '2026-03-29').periode;
  assert.equal(f.endAt + 1 - f.startAt, 23 * 3600_000, 'jour de 23 h');
});

test('par défaut, la période est hier à Paris', async () => {
  // 23 septembre, 00 h 30 à Paris = 22 septembre 22 h 30 UTC.
  const r = await collecter({
    mode: 'quotidien',
    env: {},
    fetch: null,
    maintenant: Date.parse('2026-09-22T22:30:00Z'),
  });
  assert.equal(r.fin, '2026-09-22');
});

test('une API en échec ne lève jamais et ne divulgue pas le jeton', async () => {
  const cas = [
    () => [401, { error: 'jeton-secret refusé' }],
    () => [200, 'pas un objet'],
    () => {
      throw new Error('réseau coupé pour jeton-secret');
    },
  ];
  for (const repondre of cas) {
    const r = await collecter({
      mode: 'hebdo',
      date: '2026-09-22',
      env: ENV,
      fetch: faussesApi(repondre).fetch,
    });
    assert.equal(r.ok, false);
    assert.equal(r.periode, null);
    assert.ok(!r.erreur.includes('jeton-secret'), r.erreur);
  }
});

test('une erreur réseau dit sa cause, pas seulement « fetch failed »', async () => {
  const fetch = async () => {
    const cause = Object.assign(new Error('getaddrinfo ENOTFOUND analytics.example'), {
      code: 'ENOTFOUND',
    });
    throw new TypeError('fetch failed', { cause });
  };
  const r = await collecter({ mode: 'quotidien', date: '2026-09-22', env: ENV, fetch });
  assert.equal(r.ok, false);
  assert.match(r.erreur, /fetch failed \(ENOTFOUND /);
});

test('une réponse démesurée est refusée', async () => {
  const fetch = async () => ({ ok: true, status: 200, text: async () => 'x'.repeat(2_000_000) });
  const r = await collecter({ mode: 'quotidien', date: '2026-09-22', env: ENV, fetch });
  assert.equal(r.ok, false);
  assert.match(r.erreur, /trop grande/);
});

// Données figées dans la forme réelle de l'instance (Umami 3) : si Umami ou
// le script changent, c'est ici que ça casse, sans réseau.
const FIGE = JSON.parse(readFileSync(new URL('./fixtures/umami-v3.json', import.meta.url), 'utf8'));

function instanceFigee(u) {
  if (u.pathname.endsWith('/stats')) return [200, FIGE.stats];
  const rep = FIGE.metrics[u.searchParams.get('type')];
  return typeof rep === 'string' ? [400, { error: rep }] : [200, rep];
}

/** Clés et types de la sortie, dans l'ordre : c'est le contrat lu par les agents. */
const FORME_FENETRE = {
  debut: 'string',
  fin: 'string',
  jours: 'number',
  stats: {
    visiteurs: 'number',
    sessions: 'number',
    pages_vues: 'number',
    sessions_par_visiteur: 'number',
    taux_rebond: 'number',
    duree_moyenne_session_s: 'number',
  },
  moyenne_journaliere: { visiteurs: 'number', sessions: 'number', pages_vues: 'number' },
  evenements: Object.fromEntries(EVENEMENTS.map((e) => [e, 'number'])),
  entonnoir: ['4 éléments', { cran: 'string', nombre: 'number', taux_depuis_precedent: 'null' }],
};
const ENTETE = {
  ok: 'boolean',
  erreur: 'null',
  mode: 'string',
  fin: 'string',
  fuseau: 'string',
  genere_le: 'string',
};
const LIMITES = ['3 éléments', 'string'];

test('forme de sortie figée, quotidien et hebdo, contre la forme réelle d’Umami 3', async () => {
  const pages = ['5 éléments', { nom: 'string', nombre: 'number' }];
  const attendu = {
    quotidien: {
      ...ENTETE,
      periode: { ...FORME_FENETRE, pages, provenances: [] },
      reference: { ...FORME_FENETRE, pages: 'null', provenances: 'null' },
      mois: 'null',
      limites: LIMITES,
    },
    hebdo: {
      ...ENTETE,
      periode: { ...FORME_FENETRE, pages, provenances: [] },
      reference: { ...FORME_FENETRE, pages: 'null', provenances: 'null' },
      mois: { ...FORME_FENETRE, pages, provenances: [] },
      limites: LIMITES,
    },
  };
  for (const mode of ['quotidien', 'hebdo']) {
    const r = await collecter({
      mode,
      date: '2026-09-22',
      env: ENV,
      fetch: faussesApi(instanceFigee).fetch,
    });
    assert.equal(r.ok, true, r.erreur);
    // JSON.stringify compare aussi l'ordre des clés.
    assert.equal(JSON.stringify(structure(r)), JSON.stringify(attendu[mode]), mode);
  }
});

test('Umami 3 : les chiffres figés arrivent aux bons endroits', async () => {
  const r = await collecter({
    mode: 'quotidien',
    date: '2026-09-22',
    env: ENV,
    fetch: faussesApi(instanceFigee).fetch,
  });
  assert.deepEqual(r.periode.stats, {
    visiteurs: 3,
    sessions: 3,
    pages_vues: 11,
    sessions_par_visiteur: 1,
    taux_rebond: 0,
    duree_moyenne_session_s: 5,
  });
  assert.equal(r.periode.evenements.pattern_pasted, 2);
  assert.deepEqual(r.periode.pages[1], { nom: '/fr/glossaire/ms', nombre: 2 });
  assert.deepEqual(
    r.periode.entonnoir.map((c) => c.nombre),
    [3, 2, 2, 9],
  );
});

test('sortie en échec : mêmes clés de premier niveau, dans le même ordre', async () => {
  const ok = await collecter({
    mode: 'hebdo',
    date: '2026-09-22',
    env: ENV,
    fetch: faussesApi(instanceFigee).fetch,
  });
  const ko = await collecter({ mode: 'hebdo', date: '2026-09-22', env: {}, fetch: null });
  assert.deepEqual(Object.keys(ko), Object.keys(ok));
  for (const k of ['periode', 'reference', 'mois']) assert.equal(ko[k], null, k);
});

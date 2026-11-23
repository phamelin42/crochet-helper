import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  exchangeCode,
  getPattern,
  getProjects,
  refreshTokens,
  searchPatterns,
} from './ravelry-client';

const BASE = 'https://fil-ia.example/ravelry';

const LISTE = {
  patrons: [
    {
      id: 1,
      nom: 'Sapin',
      designer: 'Cam',
      vignette: 'https://images4-g.ravelrycache.com/a.jpg',
      lien: 'https://www.ravelry.com/patterns/library/sapin',
    },
  ],
  page: 1,
  pages: 3,
};
const FICHE = {
  id: 1,
  nom: 'Sapin',
  designer: 'Cam',
  description: 'Texte',
  photos: ['https://images4-g.ravelrycache.com/a.jpg'],
  craft: 'Crochet',
  poidsFil: 'DK',
  difficulte: 2.5,
  telechargement: null,
  source: null,
  lien: 'https://www.ravelry.com/patterns/library/sapin',
};

function simuler(reponse: Response | Error | DOMException) {
  const fetchSimule = vi.fn(async (...args: [string, RequestInit?]) => {
    void args;
    if (!(reponse instanceof Response)) throw reponse;
    return reponse.clone();
  });
  vi.stubGlobal('fetch', fetchSimule);
  return fetchSimule;
}

afterEach(() => vi.unstubAllGlobals());

describe('searchPatterns', () => {
  it('appelle le Worker en GET, hors service worker, avec la demande encodée', async () => {
    const f = simuler(Response.json(LISTE));
    const r = await searchPatterns(BASE, { q: 'christmas tree & co', craft: 'crochet', page: 2 });
    expect(r).toEqual({ ok: true, data: LISTE });
    const [url, init] = f.mock.calls[0];
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe('https://fil-ia.example/ravelry/recherche');
    expect(u.searchParams.get('q')).toBe('christmas tree & co');
    expect(u.searchParams.get('craft')).toBe('crochet');
    expect(u.searchParams.get('page')).toBe('2');
    expect(u.searchParams.get('ngsw-bypass')).toBe('true');
    expect(init?.method ?? 'GET').toBe('GET');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    ['rien', {}],
    ['un tableau', []],
    ['des patrons mal formés', { patrons: [{ id: 'x' }], page: 1, pages: 1 }],
    ['une page absente', { patrons: [] }],
    [
      'un lien hors de Ravelry',
      { ...LISTE, patrons: [{ ...LISTE.patrons[0], lien: 'https://evil.example/x' }] },
    ],
    [
      'une vignette en http',
      { ...LISTE, patrons: [{ ...LISTE.patrons[0], vignette: 'http://x.example/a.jpg' }] },
    ],
  ])('refuse une réponse 200 qui contient %s', async (_nom, corps) => {
    simuler(Response.json(corps));
    expect(await searchPatterns(BASE, { q: 'a', craft: 'crochet', page: 1 })).toEqual({
      ok: false,
      raison: 'indisponible',
      detail: 'reponse',
    });
  });
});

describe('getPattern', () => {
  it('lit la fiche', async () => {
    const f = simuler(Response.json(FICHE));
    expect(await getPattern(BASE, 1)).toEqual({ ok: true, data: FICHE });
    expect(new URL(f.mock.calls[0][0]).pathname).toBe('/ravelry/patron/1');
  });

  it('refuse une fiche dont un lien sort de https', async () => {
    simuler(Response.json({ ...FICHE, telechargement: 'javascript:alert(1)' }));
    const r = await getPattern(BASE, 1);
    expect(r).toMatchObject({ ok: false, raison: 'indisponible' });
  });

  it('refuse une description démesurée', async () => {
    simuler(Response.json({ ...FICHE, description: 'x'.repeat(20_000) }));
    expect(await getPattern(BASE, 1)).toMatchObject({ ok: false });
  });
});

describe('refus nommés, jamais d’exception', () => {
  const refus: [number, string, string][] = [
    [400, 'requete', 'requete'],
    [404, 'introuvable', 'introuvable'],
    [429, 'trop-de-demandes', 'trop-de-demandes'],
    [429, 'quota-jour', 'quota-jour'],
    [503, 'indisponible', 'indisponible'],
  ];
  it.each(refus)('Worker %i « %s »', async (statut, raison, attendu) => {
    simuler(Response.json({ raison }, { status: statut }));
    for (const appel of [
      () => searchPatterns(BASE, { q: 'a', craft: 'knitting', page: 1 }),
      () => getPattern(BASE, 1),
    ]) {
      expect(await appel()).toMatchObject({ ok: false, raison: attendu });
    }
  });

  it('relaie Retry-After d’un 429, en secondes bornées', async () => {
    simuler(
      Response.json(
        { raison: 'trop-de-demandes' },
        { status: 429, headers: { 'Retry-After': '17' } },
      ),
    );
    expect(await getPattern(BASE, 1)).toEqual({
      ok: false,
      raison: 'trop-de-demandes',
      attente: 17,
    });
    simuler(
      Response.json(
        { raison: 'trop-de-demandes' },
        { status: 429, headers: { 'Retry-After': '99999' } },
      ),
    );
    expect(await getPattern(BASE, 1)).not.toHaveProperty('attente');
  });

  it('un détail court est relayé, une phrase non', async () => {
    simuler(Response.json({ raison: 'indisponible', detail: 'ravelry-504' }, { status: 503 }));
    expect(await getPattern(BASE, 1)).toMatchObject({ detail: 'ravelry-504' });
    simuler(
      Response.json(
        { raison: 'indisponible', detail: 'Une longue phrase avec <b>html</b>' },
        { status: 503 },
      ),
    );
    expect(await getPattern(BASE, 1)).toEqual({ ok: false, raison: 'indisponible' });
  });

  it('une raison inconnue devient « indisponible » avec le statut', async () => {
    simuler(Response.json({ raison: 'surprise' }, { status: 418 }));
    expect(await getPattern(BASE, 1)).toEqual({
      ok: false,
      raison: 'indisponible',
      detail: 'http-418',
    });
  });

  it('une page d’erreur qui n’est pas du JSON devient « indisponible »', async () => {
    simuler(new Response('<html>oops</html>', { status: 502 }));
    expect(await getPattern(BASE, 1)).toEqual({
      ok: false,
      raison: 'indisponible',
      detail: 'http-502',
    });
  });

  it('le faux 504 du service worker est un échec de réseau', async () => {
    simuler(new Response('', { status: 504, statusText: 'Gateway Timeout' }));
    expect(await getPattern(BASE, 1)).toMatchObject({ ok: false, raison: 'reseau' });
  });

  it('réseau coupé : « reseau » ; délai : « delai »', async () => {
    simuler(new TypeError('Failed to fetch'));
    expect(await getPattern(BASE, 1)).toMatchObject({ ok: false, raison: 'reseau' });
    simuler(new DOMException('trop long', 'TimeoutError'));
    expect(await getPattern(BASE, 1)).toEqual({ ok: false, raison: 'delai' });
  });

  it('refuse une réponse démesurée avant de la lire', async () => {
    simuler(new Response('{}', { headers: { 'Content-Length': String(5_000_000) } }));
    expect(await getPattern(BASE, 1)).toMatchObject({ ok: false, raison: 'indisponible' });
  });
});

describe('au nom de la lectrice connectée (fiche 62)', () => {
  const AUCUN = (init?: RequestInit) => new Headers(init?.headers).get('Authorization');

  it('envoie le jeton en Bearer, dans l’en-tête seulement, sans cache de navigateur', async () => {
    const f = simuler(Response.json(LISTE));
    await searchPatterns(BASE, { q: 'a', craft: 'crochet', page: 1 }, 'at-secret');
    const [url, init] = f.mock.calls[0];
    expect(AUCUN(init)).toBe('Bearer at-secret');
    expect(init?.cache).toBe('no-store');
    expect(url).not.toContain('at-secret');
  });

  it('sans jeton, n’envoie aucun en-tête Authorization', async () => {
    const f = simuler(Response.json(FICHE));
    await getPattern(BASE, 1);
    await getPattern(BASE, 1, null);
    for (const [, init] of f.mock.calls) expect(AUCUN(init)).toBeNull();
  });

  it.each([
    [403, 'connexion-requise'],
    [401, 'session-expiree'],
  ])('un %s du Worker (« %s ») est un refus dit', async (statut, raison) => {
    simuler(Response.json({ raison }, { status: statut }));
    expect(await getPattern(BASE, 1, 'at')).toEqual({ ok: false, raison });
  });

  describe('galerie', () => {
    const GALERIE = {
      projets: [
        {
          photo: 'https://images4-g.ravelrycache.com/p.jpg',
          lien: 'https://www.ravelry.com/projects/lectrice/ouvrage',
        },
      ],
      page: 1,
      pages: 2,
    };

    it('demande la page avec le jeton et rend photo et lien', async () => {
      const f = simuler(Response.json(GALERIE));
      expect(await getProjects(BASE, 7, 2, 'at')).toEqual({ ok: true, data: GALERIE });
      const [url, init] = f.mock.calls[0];
      const u = new URL(url);
      expect(u.pathname).toBe('/ravelry/patron/7/projets');
      expect(u.searchParams.get('page')).toBe('2');
      expect(AUCUN(init)).toBe('Bearer at');
    });

    it.each([
      [
        'un champ en trop (nom de la personne)',
        { ...GALERIE, projets: [{ ...GALERIE.projets[0], nom: 'Zoé' }] },
      ],
      [
        'un lien hors des projets Ravelry',
        { ...GALERIE, projets: [{ ...GALERIE.projets[0], lien: 'https://evil.example/' }] },
      ],
      [
        'une photo en http',
        { ...GALERIE, projets: [{ ...GALERIE.projets[0], photo: 'http://x.example/a.jpg' }] },
      ],
      ['plus de 24 ouvrages', { ...GALERIE, projets: Array(25).fill(GALERIE.projets[0]) }],
      ['pas de page', { projets: [] }],
    ])('refuse une réponse 200 qui contient %s', async (_n, corps) => {
      simuler(Response.json(corps));
      expect(await getProjects(BASE, 7, 1, 'at')).toEqual({
        ok: false,
        raison: 'indisponible',
        detail: 'reponse',
      });
    });
  });

  describe('jetons', () => {
    const BONS = { access_token: 'at-1', refresh_token: 'rt-1', expires_in: 3600 };

    it('échange le code : POST JSON vers le Worker, jamais dans l’adresse', async () => {
      const f = simuler(Response.json(BONS));
      const r = await exchangeCode(BASE, {
        code: 'c1',
        verifier: 'v'.repeat(43),
        redirectUri: 'https://patternreader.com/ravelry-callback',
      });
      expect(r).toEqual({
        ok: true,
        data: { accessToken: 'at-1', refreshToken: 'rt-1', expiresIn: 3600 },
      });
      const [url, init] = f.mock.calls[0];
      expect(new URL(url).pathname).toBe('/ravelry/oauth/jeton');
      expect(url).not.toContain('c1');
      expect(init?.method).toBe('POST');
      expect(init?.cache).toBe('no-store');
      expect(JSON.parse(String(init?.body))).toEqual({
        code: 'c1',
        code_verifier: 'v'.repeat(43),
        redirect_uri: 'https://patternreader.com/ravelry-callback',
      });
    });

    it('renouvelle : refresh_token en POST JSON ; sans nouveau jeton de rafraîchissement, null', async () => {
      const f = simuler(Response.json({ access_token: 'at-2', expires_in: 3600 }));
      const r = await refreshTokens(BASE, 'rt-1');
      expect(r).toEqual({
        ok: true,
        data: { accessToken: 'at-2', refreshToken: null, expiresIn: 3600 },
      });
      const [url, init] = f.mock.calls[0];
      expect(new URL(url).pathname).toBe('/ravelry/oauth/rafraichir');
      expect(JSON.parse(String(init?.body))).toEqual({ refresh_token: 'rt-1' });
    });

    it.each([
      ['sans jeton d’accès', { expires_in: 3600 }],
      ['durée nulle', { access_token: 'a', expires_in: 0 }],
      ['durée de plus d’un jour', { access_token: 'a', expires_in: 86_401 }],
      ['durée textuelle', { access_token: 'a', expires_in: '3600' }],
      ['jeton avec espace', { access_token: 'a b', expires_in: 3600 }],
      ['jeton de 4097 caractères', { access_token: 'a'.repeat(4097), expires_in: 3600 }],
      [
        'rafraîchissement de 2049 caractères',
        { access_token: 'a', expires_in: 3600, refresh_token: 'a'.repeat(2049) },
      ],
    ])('refuse une réponse 200 : %s', async (_n, corps) => {
      simuler(Response.json(corps));
      const r = await refreshTokens(BASE, 'rt');
      expect(r).toMatchObject({ ok: false, raison: 'indisponible' });
    });

    it('un session-expiree du Worker reste un refus dit', async () => {
      simuler(Response.json({ raison: 'session-expiree' }, { status: 401 }));
      expect(await refreshTokens(BASE, 'rt')).toEqual({ ok: false, raison: 'session-expiree' });
    });
  });
});

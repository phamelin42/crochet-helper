import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPattern, searchPatterns } from './ravelry-client';

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
  const fetchSimule = vi.fn(async (_url: string, _init?: RequestInit) => {
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

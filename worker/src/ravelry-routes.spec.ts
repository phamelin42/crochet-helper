import { afterEach, describe, expect, it, vi } from 'vitest';
import { Deps, Env, Kv, ReponseClaude, traiter } from './index';
import { cleRavelry, dateUtc, empreinte } from './quota';

const ORIGINE = 'https://patternreader.com';
const DATE = new Date('2026-11-23T10:00:00Z');

const ENV: Env = {
  QUOTAS: undefined as unknown as KVNamespace,
  ANTHROPIC_API_KEY: 'cle',
  SEL_QUOTA: 'sel',
  MODELE: 'm',
  EFFORT: 'low',
  PRIX_ENTREE_MTOK_USD: '1',
  PRIX_SORTIE_MTOK_USD: '1',
  BUDGET_MOIS_USD: '7',
  QUOTA_JOUR: '3',
  ORIGINES: ORIGINE,
  MAX_CARACTERES: '60000',
  RAVELRY_USER: 'utilisateur-test',
  RAVELRY_KEY: 'cle-test',
  RAVELRY_ACCES: 'ouvert',
  QUOTA_RAVELRY_JOUR: '3',
};

// Réponses d'exemple écrites pour ces tests, aucune donnée réelle de Ravelry.
const LISTE = {
  patterns: [
    { id: 1, name: 'Sapin', permalink: 'sapin', free: true, pattern_author: { name: 'Cam' } },
    { id: 2, name: 'Payant', permalink: 'payant', free: false },
  ],
  paginator: { page: 1, page_count: 2 },
};
const FICHE = { pattern: { id: 1, name: 'Sapin', permalink: 'sapin', free: true, notes: 'Texte' } };

type Fetch = NonNullable<Deps['fetch']>;

function monter(reponse: () => Response | Promise<Response> = () => Response.json(LISTE)) {
  const donnees = new Map<string, string>();
  const kv: Kv = {
    get: async (c) => donnees.get(c) ?? null,
    put: async (c, v) => void donnees.set(c, v),
  };
  const fetchSimule = vi.fn<Fetch>(async () => reponse());
  const claude = vi.fn(async (): Promise<ReponseClaude> => {
    throw new Error('jamais appelé');
  });
  const deps: Deps = { kv, claude, maintenant: () => DATE, fetch: fetchSimule };
  return { donnees, fetchSimule, claude, deps };
}

function get(chemin: string, options: { origine?: string | null; methode?: string } = {}) {
  const entetes: Record<string, string> = { 'CF-Connecting-IP': '203.0.113.7' };
  const origine = options.origine === undefined ? ORIGINE : options.origine;
  if (origine !== null) entetes['Origin'] = origine;
  return new Request(`https://fil-ia.example${chemin}`, {
    method: options.methode ?? 'GET',
    headers: entetes,
  });
}

describe('GET /ravelry/recherche', () => {
  it('répond avec les patrons gratuits réduits, en cache court, avec CORS', async () => {
    const { deps, fetchSimule, claude } = monter();
    const r = await traiter(
      get('/ravelry/recherche?q=christmas%20tree&craft=crochet&page=2'),
      ENV,
      deps,
    );
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe('public, max-age=300');
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe(ORIGINE);
    expect(r.headers.get('Vary')).toContain('Origin');
    const corps = (await r.json()) as { patrons: { id: number }[]; page: number; pages: number };
    expect(corps.patrons.map((p) => p.id)).toEqual([1]);
    expect(corps.pages).toBe(2);

    const [url, init] = fetchSimule.mock.calls[0];
    const u = new URL(url);
    expect(u.hostname).toBe('api.ravelry.com');
    expect(u.searchParams.get('query')).toBe('christmas tree');
    expect(u.searchParams.get('page')).toBe('2');
    expect(new Headers(init.headers).get('Authorization')).toBe(
      `Basic ${btoa('utilisateur-test:cle-test')}`,
    );
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(claude).not.toHaveBeenCalled();
  });

  it('retire les espaces autour du terme avant de l’envoyer', async () => {
    const { deps, fetchSimule } = monter();
    await traiter(get('/ravelry/recherche?q=%20%20sapin%20%20&craft=knitting&page=1'), ENV, deps);
    expect(new URL(fetchSimule.mock.calls[0][0]).searchParams.get('query')).toBe('sapin');
  });

  it('la page vaut 1 par défaut', async () => {
    const { deps, fetchSimule } = monter();
    await traiter(get('/ravelry/recherche?q=a&craft=crochet'), ENV, deps);
    expect(new URL(fetchSimule.mock.calls[0][0]).searchParams.get('page')).toBe('1');
  });

  const invalides: [string, string][] = [
    ['terme absent', '/ravelry/recherche?craft=crochet&page=1'],
    ['terme vide', '/ravelry/recherche?q=&craft=crochet&page=1'],
    ['terme d’espaces', '/ravelry/recherche?q=%20%20&craft=crochet&page=1'],
    ['terme de 101 caractères', `/ravelry/recherche?q=${'a'.repeat(101)}&craft=crochet&page=1`],
    ['craft absent', '/ravelry/recherche?q=a&page=1'],
    ['craft hors liste', '/ravelry/recherche?q=a&craft=sewing&page=1'],
    ['craft en majuscules', '/ravelry/recherche?q=a&craft=Crochet&page=1'],
    ['page 0', '/ravelry/recherche?q=a&craft=crochet&page=0'],
    ['page 51', '/ravelry/recherche?q=a&craft=crochet&page=51'],
    ['page négative', '/ravelry/recherche?q=a&craft=crochet&page=-1'],
    ['page décimale', '/ravelry/recherche?q=a&craft=crochet&page=1.5'],
    ['page texte', '/ravelry/recherche?q=a&craft=crochet&page=abc'],
    ['page exponentielle', '/ravelry/recherche?q=a&craft=crochet&page=1e1'],
    ['page vide', '/ravelry/recherche?q=a&craft=crochet&page='],
  ];
  it.each(invalides)('refuse 400 « requete » : %s', async (_nom, chemin) => {
    const { deps, fetchSimule } = monter();
    const r = await traiter(get(chemin), ENV, deps);
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ raison: 'requete' });
    expect(fetchSimule).not.toHaveBeenCalled();
  });

  it('accepte les bornes : terme de 100 caractères, pages 1 et 50', async () => {
    for (const page of [1, 50]) {
      const { deps } = monter();
      const r = await traiter(
        get(`/ravelry/recherche?q=${'a'.repeat(100)}&craft=crochet&page=${page}`),
        ENV,
        deps,
      );
      expect(r.status).toBe(200);
    }
  });
});

describe('GET /ravelry/patron/:id', () => {
  it('répond avec la fiche réduite', async () => {
    const { deps, fetchSimule } = monter(() => Response.json(FICHE));
    const r = await traiter(get('/ravelry/patron/1'), ENV, deps);
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe('public, max-age=300');
    expect(await r.json()).toMatchObject({ id: 1, nom: 'Sapin', description: 'Texte' });
    expect(fetchSimule.mock.calls[0][0]).toBe('https://api.ravelry.com/patterns/1.json');
  });

  it('un patron payant est « introuvable », même si Ravelry le renvoie', async () => {
    const { deps } = monter(() => Response.json({ pattern: { ...FICHE.pattern, free: false } }));
    const r = await traiter(get('/ravelry/patron/1'), ENV, deps);
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ raison: 'introuvable' });
  });

  it.each(['0', '-3', 'abc', '1.5', '1e3', '007x', '99999999999999999999', ''])(
    'refuse 400 un identifiant invalide : %j',
    async (id) => {
      const { deps, fetchSimule } = monter();
      const r = await traiter(get(`/ravelry/patron/${id}`), ENV, deps);
      expect([400, 404]).toContain(r.status);
      expect(fetchSimule).not.toHaveBeenCalled();
    },
  );
});

describe('erreurs amont : refus nommés, jamais d’exception', () => {
  const cas: [number, number, string][] = [
    [404, 404, 'introuvable'],
    [429, 429, 'trop-de-demandes'],
    [400, 503, 'indisponible'],
    [401, 503, 'indisponible'],
    [403, 503, 'indisponible'],
    [500, 503, 'indisponible'],
    [503, 503, 'indisponible'],
    [504, 503, 'indisponible'],
  ];
  it.each(cas)('Ravelry répond %i : %i « %s »', async (amont, statut, raison) => {
    const { deps } = monter(() => new Response('{}', { status: amont }));
    for (const chemin of ['/ravelry/recherche?q=a&craft=crochet&page=1', '/ravelry/patron/1']) {
      const r = await traiter(get(chemin), ENV, deps);
      expect(r.status).toBe(statut);
      const corps = (await r.json()) as { raison: string };
      expect(corps.raison).toBe(raison);
      expect(r.headers.get('Cache-Control')).toBeNull();
      expect(r.headers.get('Access-Control-Allow-Origin')).toBe(ORIGINE);
    }
  });

  it('un 429 amont porte Retry-After (celui de Ravelry, sinon 60 s)', async () => {
    const avec = monter(
      () => new Response('{}', { status: 429, headers: { 'Retry-After': '17' } }),
    );
    const r1 = await traiter(get('/ravelry/patron/1'), ENV, avec.deps);
    expect(r1.headers.get('Retry-After')).toBe('17');
    const sans = monter(() => new Response('{}', { status: 429 }));
    const r2 = await traiter(get('/ravelry/patron/1'), ENV, sans.deps);
    expect(r2.headers.get('Retry-After')).toBe('60');
  });

  it('un Retry-After absurde est remplacé', async () => {
    const m = monter(
      () => new Response('{}', { status: 429, headers: { 'Retry-After': 'demain' } }),
    );
    const r = await traiter(get('/ravelry/patron/1'), ENV, m.deps);
    expect(r.headers.get('Retry-After')).toBe('60');
  });

  it('réseau coupé ou délai dépassé : « indisponible » avec un code court', async () => {
    for (const [erreur, detail] of [
      [new TypeError('fetch failed'), 'reseau'],
      [new DOMException('trop long', 'TimeoutError'), 'delai'],
    ] as const) {
      const { deps } = monter(() => {
        throw erreur;
      });
      const r = await traiter(get('/ravelry/patron/1'), ENV, deps);
      expect(r.status).toBe(503);
      expect(await r.json()).toEqual({ raison: 'indisponible', detail });
    }
  });

  it.each([
    ['du texte', () => new Response('<html>erreur</html>')],
    ['un JSON de forme inattendue', () => Response.json({ rien: true })],
    ['un tableau', () => Response.json([1, 2])],
  ])('Ravelry répond 200 avec %s : « indisponible »', async (_nom, reponse) => {
    const { deps } = monter(reponse);
    for (const chemin of ['/ravelry/recherche?q=a&craft=crochet&page=1', '/ravelry/patron/1']) {
      const r = await traiter(get(chemin), ENV, deps);
      expect(r.status).toBe(503);
      expect(await r.json()).toEqual({ raison: 'indisponible', detail: 'reponse' });
    }
  });

  it('refuse une réponse de plus de 2 Mo, annoncée ou non', async () => {
    const gros = 'x'.repeat(2 * 1024 * 1024 + 10);
    const annoncee = monter(
      () => new Response('{}', { headers: { 'Content-Length': String(gros.length) } }),
    );
    const sansEntete = monter(() => new Response(gros));
    for (const m of [annoncee, sansEntete]) {
      const r = await traiter(get('/ravelry/patron/1'), ENV, m.deps);
      expect(r.status).toBe(503);
      expect(await r.json()).toEqual({ raison: 'indisponible', detail: 'taille' });
    }
  });
});

describe('secrets, origine et méthodes', () => {
  it.each([
    ['RAVELRY_USER', { RAVELRY_USER: undefined }],
    ['RAVELRY_KEY', { RAVELRY_KEY: undefined }],
    ['les deux, vides', { RAVELRY_USER: '', RAVELRY_KEY: '' }],
  ])('secrets absents (%s) : 503 « indisponible », sans appeler Ravelry', async (_n, surcharge) => {
    const { deps, fetchSimule } = monter();
    const r = await traiter(get('/ravelry/patron/1'), { ...ENV, ...surcharge }, deps);
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ raison: 'indisponible', detail: 'secrets' });
    expect(fetchSimule).not.toHaveBeenCalled();
  });

  it('expose Retry-After au navigateur, sans quoi la page ne peut pas le lire', async () => {
    const { deps } = monter(
      () => new Response('{}', { status: 429, headers: { 'Retry-After': '9' } }),
    );
    const r = await traiter(get('/ravelry/patron/1'), ENV, deps);
    expect(r.headers.get('Access-Control-Expose-Headers')).toBe('Retry-After');
    const ok = await traiter(
      get('/ravelry/patron/1'),
      ENV,
      monter(() => Response.json(FICHE)).deps,
    );
    expect(ok.headers.get('Access-Control-Expose-Headers')).toBe('Retry-After');
  });

  it('une origine non autorisée ou absente reçoit 403, sans appel amont', async () => {
    for (const origine of ['https://autre.example', null]) {
      const { deps, fetchSimule } = monter();
      const r = await traiter(get('/ravelry/patron/1', { origine }), ENV, deps);
      expect(r.status).toBe(403);
      expect(fetchSimule).not.toHaveBeenCalled();
    }
  });

  it('OPTIONS annonce GET', async () => {
    const { deps } = monter();
    const r = await traiter(get('/ravelry/recherche', { methode: 'OPTIONS' }), ENV, deps);
    expect(r.status).toBe(204);
    expect(r.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe(ORIGINE);
  });

  it.each(['POST', 'PUT', 'DELETE'])('refuse %s sur les routes Ravelry', async (methode) => {
    const { deps, fetchSimule } = monter();
    const requete = new Request('https://fil-ia.example/ravelry/patron/1', {
      method: methode,
      headers: { Origin: ORIGINE },
      body: '{}',
    });
    const r = await traiter(requete, ENV, deps);
    expect(r.status).toBe(404);
    expect(fetchSimule).not.toHaveBeenCalled();
  });

  it('une route inconnue sous /ravelry/ répond 404', async () => {
    const { deps } = monter();
    const r = await traiter(get('/ravelry/autre'), ENV, deps);
    expect(r.status).toBe(404);
  });
});

describe('quota par personne et par jour', () => {
  it('refuse au-delà de QUOTA_RAVELRY_JOUR, avec Retry-After, sans appel amont', async () => {
    const m = monter(() => Response.json(FICHE));
    for (let i = 0; i < 3; i++) {
      expect((await traiter(get('/ravelry/patron/1'), ENV, m.deps)).status).toBe(200);
    }
    const r = await traiter(get('/ravelry/patron/1'), ENV, m.deps);
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ raison: 'quota-jour' });
    expect(Number(r.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(m.fetchSimule).toHaveBeenCalledTimes(3);
  });

  it('une autre personne a son propre compteur', async () => {
    const m = monter(() => Response.json(FICHE));
    for (let i = 0; i < 3; i++) await traiter(get('/ravelry/patron/1'), ENV, m.deps);
    const autre = new Request('https://fil-ia.example/ravelry/patron/1', {
      headers: { Origin: ORIGINE, 'CF-Connecting-IP': '198.51.100.9' },
    });
    expect((await traiter(autre, ENV, m.deps)).status).toBe(200);
  });

  it('la clé est une empreinte salée : jamais l’adresse IP en clair', async () => {
    const m = monter(() => Response.json(FICHE));
    await traiter(get('/ravelry/patron/1'), ENV, m.deps);
    const date = dateUtc(DATE);
    const cle = cleRavelry(date, await empreinte(ENV.SEL_QUOTA, date, '203.0.113.7'));
    expect(m.donnees.get(cle)).toBe('1');
    expect([...m.donnees.keys()].join()).not.toContain('203.0.113.7');
  });

  it('le quota se règle par QUOTA_RAVELRY_JOUR et vaut 120 par défaut', async () => {
    const un = monter(() => Response.json(FICHE));
    const env1 = { ...ENV, QUOTA_RAVELRY_JOUR: '1' };
    await traiter(get('/ravelry/patron/1'), env1, un.deps);
    expect((await traiter(get('/ravelry/patron/1'), env1, un.deps)).status).toBe(429);

    const defaut = monter(() => Response.json(FICHE));
    const envSans = { ...ENV, QUOTA_RAVELRY_JOUR: undefined };
    const date = dateUtc(DATE);
    defaut.donnees.set(
      cleRavelry(date, await empreinte(ENV.SEL_QUOTA, date, '203.0.113.7')),
      '119',
    );
    expect((await traiter(get('/ravelry/patron/1'), envSans, defaut.deps)).status).toBe(200);
    expect((await traiter(get('/ravelry/patron/1'), envSans, defaut.deps)).status).toBe(429);
  });

  it('une requête refusée par validation ne consomme rien', async () => {
    const m = monter(() => Response.json(FICHE));
    await traiter(get('/ravelry/recherche?q=&craft=crochet'), ENV, m.deps);
    expect(m.donnees.size).toBe(0);
  });

  it('ne touche ni au budget d’IA ni au quota de mise en forme', async () => {
    const m = monter(() => Response.json(FICHE));
    await traiter(get('/ravelry/patron/1'), ENV, m.deps);
    expect([...m.donnees.keys()].every((c) => c.startsWith('ravelry:'))).toBe(true);
  });
});

describe('la route POST /mise-en-forme reste en place', () => {
  it('répond toujours 400 à un corps vide, et 404 à un GET', async () => {
    const m = monter();
    const post = new Request('https://fil-ia.example/mise-en-forme', {
      method: 'POST',
      headers: { Origin: ORIGINE },
      body: '{}',
    });
    expect((await traiter(post, ENV, m.deps)).status).toBe(400);
    expect((await traiter(get('/mise-en-forme'), ENV, m.deps)).status).toBe(404);
  });
});

// --- Connexion Ravelry (fiche 62) : jeton de la lectrice, mode d'accès, galerie ---

const BEARER = { Authorization: 'Bearer at-exemple-1' };

function getAvec(chemin: string, entetes: Record<string, string> = {}) {
  return new Request(`https://fil-ia.example${chemin}`, {
    headers: { Origin: ORIGINE, 'CF-Connecting-IP': '203.0.113.7', ...entetes },
  });
}

// Réponse d'exemple écrite pour ces tests : 30 projets, dont un sans photo.
const PROJETS = {
  projects: [
    ...Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      permalink: `ouvrage-${i + 1}`,
      user: { username: `lectrice${i + 1}`, id: 99 },
      notes: 'Notes privées',
      name: `Nom ${i + 1}`,
      first_photo: { medium_url: 'https://images4-g.ravelrycache.com/uploads/x/y_medium.jpg' },
    })),
    { id: 99, permalink: 'sans-photo', user: { username: 'zoe' }, first_photo: null },
  ],
  paginator: { page: 2, page_count: 5 },
};

afterEach(() => vi.restoreAllMocks());

describe('jeton de la lectrice (Authorization: Bearer)', () => {
  it.each(['/ravelry/recherche?q=a&craft=crochet', '/ravelry/patron/1'])(
    'transmet le jeton à Ravelry à la place de la clé en lecture seule : %s',
    async (chemin) => {
      const { deps, fetchSimule } = monter(() =>
        Response.json(chemin.includes('patron') ? FICHE : LISTE),
      );
      const r = await traiter(getAvec(chemin, BEARER), ENV, deps);
      expect(r.status).toBe(200);
      const [, init] = fetchSimule.mock.calls[0];
      expect(new Headers(init.headers).get('Authorization')).toBe('Bearer at-exemple-1');
    },
  );

  it('fonctionne même sans clé en lecture seule', async () => {
    const { deps, fetchSimule } = monter(() => Response.json(FICHE));
    const env = { ...ENV, RAVELRY_USER: undefined, RAVELRY_KEY: undefined };
    const r = await traiter(getAvec('/ravelry/patron/1', BEARER), env, deps);
    expect(r.status).toBe(200);
    expect(fetchSimule).toHaveBeenCalledTimes(1);
  });

  it('la réponse à une lectrice connectée n’est jamais mise en cache partagé', async () => {
    const { deps } = monter(() => Response.json(FICHE));
    const r = await traiter(getAvec('/ravelry/patron/1', BEARER), ENV, deps);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect(r.headers.get('Vary')).toContain('Authorization');
  });

  it.each([
    ['sans le mot Bearer', 'at-exemple-1'],
    ['en Basic', 'Basic abc'],
    ['vide', 'Bearer '],
    ['avec espace dans le jeton', 'Bearer a b'],
    ['de plus de 4096 caractères', `Bearer ${'a'.repeat(4097)}`],
    ['avec caractères interdits', 'Bearer a;b'],
  ])('un en-tête Authorization %s est refusé en 400, sans appel amont', async (_n, valeur) => {
    const { deps, fetchSimule } = monter();
    const r = await traiter(getAvec('/ravelry/patron/1', { Authorization: valeur }), ENV, deps);
    expect(r.status).toBe(400);
    expect(fetchSimule).not.toHaveBeenCalled();
  });

  it('un 401 de Ravelry sur un jeton devient « session-expiree »', async () => {
    const { deps } = monter(() => new Response('{}', { status: 401 }));
    const r = await traiter(getAvec('/ravelry/patron/1', BEARER), ENV, deps);
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ raison: 'session-expiree' });
  });

  it('un 401 de Ravelry sur la clé en lecture seule reste « indisponible » (ce n’est pas la lectrice)', async () => {
    const { deps } = monter(() => new Response('{}', { status: 401 }));
    const r = await traiter(get('/ravelry/patron/1'), ENV, deps);
    expect(r.status).toBe(503);
  });

  it('ne conserve ni ne journalise le jeton', async () => {
    const espions = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => undefined),
    );
    const { deps, donnees } = monter(() => Response.json(FICHE));
    const r = await traiter(getAvec('/ravelry/patron/1', BEARER), ENV, deps);
    expect(JSON.stringify(espions.flatMap((e) => e.mock.calls))).not.toContain('at-exemple-1');
    expect(JSON.stringify([...donnees])).not.toContain('at-exemple-1');
    expect(await r.text()).not.toContain('at-exemple-1');
  });

  it('les réponses CORS autorisent l’en-tête Authorization', async () => {
    const { deps } = monter();
    const r = await traiter(get('/ravelry/recherche', { methode: 'OPTIONS' }), ENV, deps);
    expect(r.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    expect(r.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
  });
});

describe('mode d’accès du Worker (RAVELRY_ACCES)', () => {
  const routes = ['/ravelry/recherche?q=a&craft=crochet', '/ravelry/patron/1'];

  it.each(
    routes.flatMap(
      (c) =>
        [
          ['compte', c],
          [undefined, c],
        ] as const,
    ),
  )(
    'mode %s sans jeton : 403 « connexion-requise », sans appel amont : %s',
    async (acces, chemin) => {
      const { deps, fetchSimule } = monter();
      const r = await traiter(get(chemin), { ...ENV, RAVELRY_ACCES: acces }, deps);
      expect(r.status).toBe(403);
      expect(await r.json()).toEqual({ raison: 'connexion-requise' });
      expect(r.headers.get('Access-Control-Allow-Origin')).toBe(ORIGINE);
      expect(fetchSimule).not.toHaveBeenCalled();
    },
  );

  it('mode compte : une valeur inconnue vaut « compte », jamais « ouvert »', async () => {
    const { deps, fetchSimule } = monter();
    const r = await traiter(get('/ravelry/patron/1'), { ...ENV, RAVELRY_ACCES: 'OUVERT ' }, deps);
    expect(r.status).toBe(403);
    expect(fetchSimule).not.toHaveBeenCalled();
  });

  it('mode compte : le refus passe avant le contrôle des secrets', async () => {
    const { deps } = monter();
    const env = { ...ENV, RAVELRY_ACCES: 'compte', RAVELRY_USER: undefined };
    expect((await traiter(get('/ravelry/patron/1'), env, deps)).status).toBe(403);
  });

  it.each(routes)('mode compte avec jeton : passe : %s', async (chemin) => {
    const { deps } = monter(() => Response.json(chemin.includes('patron') ? FICHE : LISTE));
    const r = await traiter(getAvec(chemin, BEARER), { ...ENV, RAVELRY_ACCES: 'compte' }, deps);
    expect(r.status).toBe(200);
  });

  it.each(routes)('mode ouvert sans jeton : comme au lot 5 : %s', async (chemin) => {
    const { deps, fetchSimule } = monter(() =>
      Response.json(chemin.includes('patron') ? FICHE : LISTE),
    );
    const r = await traiter(get(chemin), { ...ENV, RAVELRY_ACCES: 'ouvert' }, deps);
    expect(r.status).toBe(200);
    expect(new Headers(fetchSimule.mock.calls[0][1].headers).get('Authorization')).toMatch(
      /^Basic /,
    );
  });
});

describe('GET /ravelry/patron/:id/projets (galerie)', () => {
  it.each(['ouvert', 'compte'])(
    'sans jeton : 403 « connexion-requise » en mode %s, sans appel amont',
    async (acces) => {
      const { deps, fetchSimule } = monter();
      const r = await traiter(
        get('/ravelry/patron/1/projets?page=1'),
        { ...ENV, RAVELRY_ACCES: acces },
        deps,
      );
      expect(r.status).toBe(403);
      expect(await r.json()).toEqual({ raison: 'connexion-requise' });
      expect(fetchSimule).not.toHaveBeenCalled();
    },
  );

  it('ne se sert jamais de la clé en lecture seule', async () => {
    const { deps, fetchSimule } = monter(() => Response.json(PROJETS));
    await traiter(getAvec('/ravelry/patron/1/projets?page=1', BEARER), ENV, deps);
    expect(new Headers(fetchSimule.mock.calls[0][1].headers).get('Authorization')).toBe(
      'Bearer at-exemple-1',
    );
  });

  it('réduit à photo et lien, 24 au plus, sans nom, notes ni identifiant', async () => {
    const { deps, fetchSimule } = monter(() => Response.json(PROJETS));
    const r = await traiter(getAvec('/ravelry/patron/7/projets?page=2', BEARER), ENV, deps);
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    const corps = (await r.json()) as {
      projets: { photo: string; lien: string }[];
      page: number;
      pages: number;
    };
    expect(Object.keys(corps).sort()).toEqual(['page', 'pages', 'projets']);
    expect(corps.projets).toHaveLength(24);
    expect(corps.page).toBe(2);
    expect(corps.pages).toBe(5);
    for (const p of corps.projets) {
      expect(Object.keys(p).sort()).toEqual(['lien', 'photo']);
      expect(p.photo).toMatch(/^https:\/\/[^/]+\.ravelrycache\.com\//);
      expect(p.lien).toMatch(/^https:\/\/www\.ravelry\.com\/projects\//);
    }
    const texte = JSON.stringify(corps);
    expect(texte).not.toContain('Notes privées');
    expect(texte).not.toContain('Nom 1');
    expect(texte).not.toContain('sans-photo');
    const u = new URL(fetchSimule.mock.calls[0][0]);
    expect(u.hostname).toBe('api.ravelry.com');
    expect(u.pathname).toContain('/7');
    expect(u.searchParams.get('page')).toBe('2');
  });

  it('un projet sans photo https de Ravelry est écarté, une photo d’un autre hôte aussi', async () => {
    const { deps } = monter(() =>
      Response.json({
        projects: [
          {
            id: 1,
            permalink: 'a',
            user: { username: 'u' },
            first_photo: { medium_url: 'https://evil.example/x.jpg' },
          },
          {
            id: 2,
            permalink: 'b',
            user: { username: 'u' },
            first_photo: { medium_url: 'http://x.ravelrycache.com/x.jpg' },
          },
        ],
      }),
    );
    const r = await traiter(getAvec('/ravelry/patron/1/projets?page=1', BEARER), ENV, deps);
    expect(((await r.json()) as { projets: unknown[] }).projets).toEqual([]);
  });

  it.each(['0', '51', 'a', '1.5', '-1', '01'])('page « %s » refusée en 400', async (page) => {
    const { deps, fetchSimule } = monter();
    const r = await traiter(getAvec(`/ravelry/patron/1/projets?page=${page}`, BEARER), ENV, deps);
    expect(r.status).toBe(400);
    expect(fetchSimule).not.toHaveBeenCalled();
  });

  it('identifiant invalide : 400', async () => {
    const { deps } = monter();
    const r = await traiter(getAvec('/ravelry/patron/abc/projets?page=1', BEARER), ENV, deps);
    expect(r.status).toBe(400);
  });

  it('401 de Ravelry : « session-expiree » ; 404 : « introuvable »', async () => {
    for (const [statut, raison] of [
      [401, 'session-expiree'],
      [404, 'introuvable'],
    ] as const) {
      const { deps } = monter(() => new Response('{}', { status: statut }));
      const r = await traiter(getAvec('/ravelry/patron/1/projets?page=1', BEARER), ENV, deps);
      expect(((await r.json()) as { raison: string }).raison).toBe(raison);
    }
  });

  it('compte dans le quota du jour', async () => {
    const { deps, fetchSimule } = monter(() => Response.json(PROJETS));
    for (let i = 0; i < 3; i++)
      await traiter(getAvec('/ravelry/patron/1/projets?page=1', BEARER), ENV, deps);
    const r = await traiter(getAvec('/ravelry/patron/1/projets?page=1', BEARER), ENV, deps);
    expect(r.status).toBe(429);
    expect(fetchSimule).toHaveBeenCalledTimes(3);
  });
});

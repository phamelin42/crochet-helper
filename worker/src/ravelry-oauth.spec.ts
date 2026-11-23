import { afterEach, describe, expect, it, vi } from 'vitest';
import { Deps, Env, Kv, ReponseClaude, traiter } from './index';

const ORIGINE = 'https://patternreader.com';
const RETOUR = 'https://patternreader.com/ravelry-callback';
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
  RAVELRY_OAUTH_ID: 'client-test',
  RAVELRY_OAUTH_SECRET: 'secret-test',
  RAVELRY_REDIRECT_URIS: RETOUR,
  RAVELRY_ACCES: 'compte',
  QUOTA_RAVELRY_JOUR: '3',
};

// Réponse d'exemple écrite pour ces tests : aucun jeton réel, des champs en trop exprès.
const JETONS = {
  access_token: 'at-exemple-1',
  refresh_token: 'rt-exemple-1',
  expires_in: 3600,
  token_type: 'bearer',
  scope: 'offline_access',
  id_token: 'ne-doit-pas-sortir',
};
const VERIFIER = 'a'.repeat(43);

type Fetch = NonNullable<Deps['fetch']>;

function monter(reponse: () => Response | Promise<Response> = () => Response.json(JETONS)) {
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
  return { donnees, fetchSimule, deps };
}

function post(
  chemin: string,
  corps: unknown,
  options: { origine?: string | null; brut?: string } = {},
) {
  const entetes: Record<string, string> = {
    'CF-Connecting-IP': '203.0.113.7',
    'Content-Type': 'application/json',
  };
  const origine = options.origine === undefined ? ORIGINE : options.origine;
  if (origine !== null) entetes['Origin'] = origine;
  return new Request(`https://fil-ia.example${chemin}`, {
    method: 'POST',
    headers: entetes,
    body: options.brut ?? JSON.stringify(corps),
  });
}

const jeton = (surcharge: Record<string, unknown> = {}) =>
  post('/ravelry/oauth/jeton', {
    code: 'code-exemple',
    code_verifier: VERIFIER,
    redirect_uri: RETOUR,
    ...surcharge,
  });
const rafraichir = (surcharge: Record<string, unknown> = {}) =>
  post('/ravelry/oauth/rafraichir', { refresh_token: 'rt-exemple-1', ...surcharge });

afterEach(() => vi.restoreAllMocks());

describe('POST /ravelry/oauth/jeton', () => {
  it('échange le code chez Ravelry avec le secret en Basic, en formulaire', async () => {
    const { deps, fetchSimule } = monter();
    const r = await traiter(jeton(), ENV, deps);
    expect(r.status).toBe(200);
    const [url, init] = fetchSimule.mock.calls[0];
    expect(url).toBe('https://auth.ravelry.com/oauth2/token');
    expect(init.method).toBe('POST');
    const h = new Headers(init.headers);
    expect(h.get('Authorization')).toBe(`Basic ${btoa('client-test:secret-test')}`);
    expect(h.get('Content-Type')).toBe('application/x-www-form-urlencoded');
    const corps = new URLSearchParams(String(init.body));
    expect(Object.fromEntries(corps)).toEqual({
      grant_type: 'authorization_code',
      code: 'code-exemple',
      code_verifier: VERIFIER,
      redirect_uri: RETOUR,
    });
    // Le secret ne se met jamais dans le corps : seulement dans l'en-tête.
    expect(String(init.body)).not.toContain('secret-test');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('ne renvoie que access_token, refresh_token et expires_in, sans mise en cache', async () => {
    const { deps } = monter();
    const r = await traiter(jeton(), ENV, deps);
    expect(await r.json()).toEqual({
      access_token: 'at-exemple-1',
      refresh_token: 'rt-exemple-1',
      expires_in: 3600,
    });
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe(ORIGINE);
  });

  it('ne conserve rien : aucune écriture KV', async () => {
    const { deps, donnees } = monter();
    await traiter(jeton(), ENV, deps);
    const cles = [...donnees.keys()];
    expect(cles.every((c) => c.startsWith('ravelry:'))).toBe(true);
    expect(JSON.stringify([...donnees.values()])).not.toContain('at-exemple-1');
    expect(JSON.stringify(cles)).not.toContain('code-exemple');
  });

  it.each([
    ['redirect_uri hors liste', { redirect_uri: 'https://autre.example/ravelry-callback' }],
    ['redirect_uri proche de la liste', { redirect_uri: `${RETOUR}/` }],
    ['redirect_uri avec paramètre', { redirect_uri: `${RETOUR}?x=1` }],
    ['redirect_uri en http', { redirect_uri: 'http://patternreader.com/ravelry-callback' }],
    ['redirect_uri absent', { redirect_uri: undefined }],
    ['code absent', { code: undefined }],
    ['code vide', { code: '' }],
    ['code de 513 caractères', { code: 'a'.repeat(513) }],
    ['code avec caractères interdits', { code: 'a b&c=d' }],
    ['code non textuel', { code: 12 }],
    ['verifier de 42 caractères', { code_verifier: 'a'.repeat(42) }],
    ['verifier de 129 caractères', { code_verifier: 'a'.repeat(129) }],
    ['verifier avec caractère interdit', { code_verifier: `${'a'.repeat(42)}!` }],
    ['verifier absent', { code_verifier: undefined }],
  ])('refuse en 400 sans appeler Ravelry : %s', async (_nom, surcharge) => {
    const { deps, fetchSimule } = monter();
    const r = await traiter(jeton(surcharge), ENV, deps);
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ raison: 'requete' });
    expect(fetchSimule).not.toHaveBeenCalled();
  });

  it('accepte les bornes : code de 512 caractères, verifier de 43 et de 128', async () => {
    for (const surcharge of [
      { code: 'a'.repeat(512) },
      { code_verifier: 'a'.repeat(43) },
      { code_verifier: `${'A1-._~'.repeat(21)}ab` },
    ]) {
      const { deps } = monter();
      expect((await traiter(jeton(surcharge), ENV, deps)).status).toBe(200);
    }
  });

  it('refuse tout redirect_uri quand la liste blanche est absente ou vide', async () => {
    for (const liste of [undefined, '']) {
      const { deps, fetchSimule } = monter();
      const r = await traiter(jeton(), { ...ENV, RAVELRY_REDIRECT_URIS: liste }, deps);
      expect(r.status).toBe(400);
      expect(fetchSimule).not.toHaveBeenCalled();
    }
  });

  it('accepte chaque adresse d’une liste blanche à plusieurs entrées', async () => {
    const env = {
      ...ENV,
      RAVELRY_REDIRECT_URIS: `https://autre.example/retour , ${RETOUR}`,
    };
    for (const uri of [RETOUR, 'https://autre.example/retour']) {
      const { deps } = monter();
      expect((await traiter(jeton({ redirect_uri: uri }), env, deps)).status).toBe(200);
    }
  });

  it.each([
    ['corps de plus de 4 Ko', 'x'.repeat(4097)],
    ['corps qui n’est pas du JSON', 'pas du json'],
    ['corps JSON qui n’est pas un objet', '[1,2]'],
    ['corps vide', ''],
  ])('refuse en 400 : %s', async (_nom, brut) => {
    const { deps, fetchSimule } = monter();
    const r = await traiter(post('/ravelry/oauth/jeton', null, { brut }), ENV, deps);
    expect(r.status).toBe(400);
    expect(fetchSimule).not.toHaveBeenCalled();
  });

  it('une origine non autorisée ou absente reçoit 403, sans appel amont', async () => {
    for (const origine of ['https://autre.example', null]) {
      const { deps, fetchSimule } = monter();
      const r = await traiter(
        post(
          '/ravelry/oauth/jeton',
          { code: 'c', code_verifier: VERIFIER, redirect_uri: RETOUR },
          { origine },
        ),
        ENV,
        deps,
      );
      expect(r.status).toBe(403);
      expect(fetchSimule).not.toHaveBeenCalled();
    }
  });

  it('refuse GET sur les routes OAuth (404)', async () => {
    const { deps } = monter();
    const r = await traiter(
      new Request('https://fil-ia.example/ravelry/oauth/jeton', { headers: { Origin: ORIGINE } }),
      ENV,
      deps,
    );
    expect(r.status).toBe(404);
  });
});

describe('POST /ravelry/oauth/rafraichir', () => {
  it('échange le jeton de rafraîchissement', async () => {
    const { deps, fetchSimule } = monter();
    const r = await traiter(rafraichir(), ENV, deps);
    expect(r.status).toBe(200);
    const [url, init] = fetchSimule.mock.calls[0];
    expect(url).toBe('https://auth.ravelry.com/oauth2/token');
    expect(Object.fromEntries(new URLSearchParams(String(init.body)))).toEqual({
      grant_type: 'refresh_token',
      refresh_token: 'rt-exemple-1',
    });
    expect(new Headers(init.headers).get('Authorization')).toBe(
      `Basic ${btoa('client-test:secret-test')}`,
    );
    expect(r.headers.get('Cache-Control')).toBe('no-store');
  });

  it('sans nouveau jeton de rafraîchissement, n’en invente pas', async () => {
    const { deps } = monter(() =>
      Response.json({ access_token: 'at-2', expires_in: 3600, token_type: 'bearer' }),
    );
    const r = await traiter(rafraichir(), ENV, deps);
    expect(await r.json()).toEqual({ access_token: 'at-2', expires_in: 3600 });
  });

  it.each([
    ['absent', { refresh_token: undefined }],
    ['vide', { refresh_token: '' }],
    ['de 2049 caractères', { refresh_token: 'a'.repeat(2049) }],
    ['avec caractères interdits', { refresh_token: 'a b&c' }],
    ['non textuel', { refresh_token: {} }],
  ])('refuse en 400 un jeton %s', async (_nom, surcharge) => {
    const { deps, fetchSimule } = monter();
    const r = await traiter(rafraichir(surcharge), ENV, deps);
    expect(r.status).toBe(400);
    expect(fetchSimule).not.toHaveBeenCalled();
  });
});

describe.each([
  ['jeton', () => jeton()],
  ['rafraichir', () => rafraichir()],
])('erreurs de Ravelry sur /oauth/%s', (_nom, requete) => {
  it('invalid_grant : 401 « session-expiree »', async () => {
    const { deps } = monter(() => Response.json({ error: 'invalid_grant' }, { status: 400 }));
    const r = await traiter(requete(), ENV, deps);
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ raison: 'session-expiree' });
    expect(r.headers.get('Cache-Control')).toBe('no-store');
  });

  it.each([
    [400, 'invalid_request'],
    [401, 'invalid_client'],
    [400, 'invalid_scope'],
    [500, 'server_error'],
    [503, 'temporarily_unavailable'],
  ])(
    '%s %s : 503 « indisponible » avec un code court, sans relayer le message',
    async (statut, erreur) => {
      const { deps } = monter(() =>
        Response.json({ error: erreur, error_description: 'texte de Ravelry' }, { status: statut }),
      );
      const r = await traiter(requete(), ENV, deps);
      expect(r.status).toBe(503);
      const corps = await r.json();
      expect(corps).toEqual({ raison: 'indisponible', detail: `ravelry-${statut}` });
    },
  );

  it('429 : « trop-de-demandes » avec Retry-After', async () => {
    const { deps } = monter(
      () => new Response('{}', { status: 429, headers: { 'Retry-After': '30' } }),
    );
    const r = await traiter(requete(), ENV, deps);
    expect(r.status).toBe(429);
    expect(r.headers.get('Retry-After')).toBe('30');
  });

  it('réseau coupé : 503 « indisponible »', async () => {
    const { deps } = monter(() => {
      throw new TypeError('réseau');
    });
    const r = await traiter(requete(), ENV, deps);
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ raison: 'indisponible', detail: 'reseau' });
  });

  it.each([
    ['sans access_token', { expires_in: 3600 }],
    ['sans expires_in', { access_token: 'at' }],
    ['expires_in négatif', { access_token: 'at', expires_in: -1 }],
    ['expires_in textuel', { access_token: 'at', expires_in: 'bientôt' }],
    ['access_token de 4097 caractères', { access_token: 'a'.repeat(4097), expires_in: 1 }],
    ['access_token avec caractères interdits', { access_token: 'a b', expires_in: 1 }],
    [
      'refresh_token de 2049 caractères',
      { access_token: 'a', expires_in: 1, refresh_token: 'a'.repeat(2049) },
    ],
  ])('réponse invalide (%s) : 503 « indisponible »', async (_n, corps) => {
    const { deps } = monter(() => Response.json(corps));
    const r = await traiter(requete(), ENV, deps);
    expect(r.status).toBe(503);
    expect(JSON.stringify(await r.json())).not.toContain('at');
  });

  it('une réponse de plus de 2 Mo est refusée', async () => {
    const { deps } = monter(() => new Response('{"access_token":"' + 'a'.repeat(2_200_000)));
    const r = await traiter(requete(), ENV, deps);
    expect(r.status).toBe(503);
  });

  it.each([
    ['RAVELRY_OAUTH_ID', { RAVELRY_OAUTH_ID: undefined }],
    ['RAVELRY_OAUTH_SECRET', { RAVELRY_OAUTH_SECRET: undefined }],
    ['les deux, vides', { RAVELRY_OAUTH_ID: '', RAVELRY_OAUTH_SECRET: '' }],
  ])('secrets absents (%s) : 503 « indisponible », sans appeler Ravelry', async (_n, surcharge) => {
    const { deps, fetchSimule } = monter();
    const r = await traiter(requete(), { ...ENV, ...surcharge }, deps);
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ raison: 'indisponible', detail: 'secrets' });
    expect(fetchSimule).not.toHaveBeenCalled();
  });

  it('au-delà du quota du jour : 429 « quota-jour », sans appel amont', async () => {
    const { deps, fetchSimule } = monter();
    for (let i = 0; i < 3; i++) await traiter(requete(), ENV, deps);
    const r = await traiter(requete(), ENV, deps);
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ raison: 'quota-jour' });
    expect(fetchSimule).toHaveBeenCalledTimes(3);
  });

  it('ne journalise jamais un jeton, un code ou un secret', async () => {
    const espions = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => undefined),
    );
    const { deps: ok } = monter();
    await traiter(requete(), ENV, ok);
    const { deps: ko } = monter(() => Response.json({ error: 'invalid_grant' }, { status: 400 }));
    await traiter(requete(), ENV, ko);
    const { deps: casse } = monter(() => {
      throw new TypeError('rt-exemple-1 code-exemple secret-test');
    });
    await traiter(requete(), ENV, casse);
    const tout = JSON.stringify(espions.flatMap((e) => e.mock.calls));
    for (const secret of [
      'at-exemple-1',
      'rt-exemple-1',
      'code-exemple',
      'secret-test',
      VERIFIER,
    ]) {
      expect(tout).not.toContain(secret);
    }
  });
});

describe('CORS des routes OAuth', () => {
  it('OPTIONS annonce POST et l’en-tête Authorization', async () => {
    const { deps } = monter();
    const r = await traiter(
      new Request('https://fil-ia.example/ravelry/oauth/jeton', {
        method: 'OPTIONS',
        headers: { Origin: ORIGINE },
      }),
      ENV,
      deps,
    );
    expect(r.status).toBe(204);
    expect(r.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(r.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    expect(r.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
  });
});

import type { Page, Route } from '@playwright/test';

/**
 * Worker `fil-ia` simulé pour les tests de la recherche Ravelry : aucun appel
 * réseau réel. Réponses écrites pour ces tests, aucune donnée de Ravelry.
 */
export const WORKER = 'https://fil-ia.hamelinphilippe1.workers.dev/ravelry';
export const PDF_URL = 'https://patterns.example.org/petit-sapin.pdf';
export const IMAGE = 'https://images4-g.ravelrycache.com/uploads/exemple';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-expose-headers': 'Retry-After',
};

const carte = (id: number, nom: string, designer = 'Camille Exemple') => ({
  id,
  nom,
  designer,
  vignette: `${IMAGE}/${id}/small.png`,
  lien: `https://www.ravelry.com/patterns/library/exemple-${id}`,
});

export const PATRONS_PAGE_1 = [
  carte(101, 'Petit sapin au crochet'),
  carte(102, 'Sapin de table', 'Alex Modèle'),
  carte(103, 'Guirlande de sapins'),
];
export const PATRONS_PAGE_2 = [carte(104, 'Sapin en cercle')];

export const FICHE_101 = {
  ...carte(101, 'Petit sapin au crochet'),
  description:
    'Un petit sapin <b>en amigurumi</b>.\n\nRang 1 : 6 ms dans un cercle magique (6)\nRang 2 : 2 ms dans chaque m (12)',
  photos: [`${IMAGE}/101/a.png`, `${IMAGE}/101/b.png`, `${IMAGE}/101/c.png`],
  craft: 'Crochet',
  poidsFil: 'DK',
  difficulte: 2.5,
  telechargement: PDF_URL,
  source: 'https://camille.example.org/sapin',
};

/** Un PNG de 1 pixel : les images de Ravelry ne sont jamais demandées pour de vrai. */
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

export interface Simulation {
  /** Adresses du Worker demandées, dans l'ordre. */
  readonly appels: string[];
  /** Remplace la réponse à la prochaine demande de recherche (une fois). */
  prochaineRecherche(
    reponse: { status: number; corps: unknown; entetes?: Record<string, string> } | 'reseau',
  ): void;
}

function json(route: Route, corps: unknown, status = 200, entetes: Record<string, string> = {}) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: { ...CORS, ...entetes },
    body: JSON.stringify(corps),
  });
}

export async function simulerWorker(page: Page): Promise<Simulation> {
  const appels: string[] = [];
  let forcee: Parameters<Simulation['prochaineRecherche']>[0] | null = null;

  await page.route(`${WORKER}/**`, async (route) => {
    const url = new URL(route.request().url());
    appels.push(`${url.pathname}${url.search}`);
    if (url.pathname.endsWith('/recherche')) {
      if (forcee) {
        const f = forcee;
        forcee = null;
        return f === 'reseau' ? route.abort('failed') : json(route, f.corps, f.status, f.entetes);
      }
      const q = url.searchParams.get('q') ?? '';
      const p = Number(url.searchParams.get('page') ?? 1);
      if (q === 'zzzz') return json(route, { patrons: [], page: 1, pages: 1 });
      return json(route, {
        patrons: p === 1 ? PATRONS_PAGE_1 : PATRONS_PAGE_2,
        page: p,
        pages: 2,
      });
    }
    const id = Number(url.pathname.split('/').pop());
    if (id === 101) return json(route, FICHE_101);
    if (id === 999) return json(route, { raison: 'introuvable' }, 404);
    return json(route, { ...FICHE_101, ...carte(id, `Patron ${id}`), photos: [] });
  });
  // Photos de Ravelry et source du patron : jamais de vrai réseau.
  await page.route(`${IMAGE}/**`, (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
  );
  // Contexte, pas page : la source s'ouvre dans un nouvel onglet.
  await page.context().route(PDF_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<title>Source simulée</title>',
    }),
  );

  return {
    appels,
    prochaineRecherche: (reponse) => {
      forcee = reponse;
    },
  };
}

/* ——— Connexion à Ravelry (fiche 62) : Ravelry ET le Worker simulés, aucun appel réel ——— */

export const AUTH_URL = 'https://auth.ravelry.com/oauth2/auth';
export const ACCESS_TOKEN = 'at-exemple-1';
export const REFRESH_TOKEN = 'rt-exemple-1';
export const CODE = 'code-exemple';

const ouvrage = (n: number) => ({
  photo: `${IMAGE}/projets/${n}.png`,
  lien: `https://www.ravelry.com/projects/exemple/ouvrage-${n}`,
});
export const OUVRAGES_PAGE_1 = Array.from({ length: 3 }, (_, i) => ouvrage(i + 1));
export const OUVRAGES_PAGE_2 = [ouvrage(4)];

export interface Compte {
  /** Adresses du Worker demandées, avec la méthode, dans l'ordre. */
  readonly appels: string[];
  /** En-tête Authorization de chaque appel de recherche, de fiche ou de galerie (`null` : absent). */
  readonly autorisations: (string | null)[];
  /** Corps JSON reçus par les routes OAuth du Worker. */
  readonly corpsOauth: { chemin: string; corps: Record<string, string> }[];
  /** Paramètres de chaque demande d'autorisation reçue par « Ravelry ». */
  readonly autorisations_ravelry: URLSearchParams[];
  /** Dès maintenant, Ravelry refuse le jeton d'accès et le jeton de rafraîchissement. */
  expirer(): void;
  /** Le prochain retour de Ravelry : `ok` (défaut), state falsifié, refus d'accès. */
  prochainRetour(retour: 'ok' | 'state-falsifie' | 'refus'): void;
  /** Mode du Worker : `compte` refuse recherche et fiche sans jeton (403). */
  readonly mode: 'compte' | 'ouvert';
}

/**
 * Simule Ravelry (page d'autorisation, par une redirection vers le retour) et le
 * Worker (OAuth, recherche, fiche, galerie). Le Worker réel applique la même règle :
 * en mode `compte`, pas de jeton, pas de recherche.
 */
export async function simulerCompte(
  page: Page,
  mode: 'compte' | 'ouvert' = 'compte',
): Promise<Compte> {
  const appels: string[] = [];
  const autorisations: (string | null)[] = [];
  const corpsOauth: Compte['corpsOauth'] = [];
  const demandes: URLSearchParams[] = [];
  let expire = false;
  let retour: 'ok' | 'state-falsifie' | 'refus' = 'ok';

  const cors = (origin: string | undefined) => ({
    'access-control-allow-origin': origin ?? '*',
    'access-control-allow-headers': 'Content-Type, Authorization',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-expose-headers': 'Retry-After',
  });
  const reponse = (route: Route, corps: unknown, status = 200) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      headers: { ...cors(route.request().headers()['origin']), 'cache-control': 'no-store' },
      body: JSON.stringify(corps),
    });

  await page.route(`${WORKER}/**`, async (route) => {
    const requete = route.request();
    const url = new URL(requete.url());
    const chemin = url.pathname.replace('/ravelry', '');
    if (requete.method() === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: cors(requete.headers()['origin']),
      });
    }
    appels.push(`${requete.method()} ${chemin}${url.search}`);

    if (chemin.startsWith('/oauth/')) {
      const corps = JSON.parse(requete.postData() ?? '{}') as Record<string, string>;
      corpsOauth.push({ chemin, corps });
      if (chemin === '/oauth/jeton') {
        // Une nouvelle connexion repart d'un compte valide.
        if (corps['code'] === CODE) expire = false;
        return corps['code'] === CODE
          ? reponse(route, {
              access_token: ACCESS_TOKEN,
              refresh_token: REFRESH_TOKEN,
              expires_in: 3600,
            })
          : reponse(route, { raison: 'session-expiree' }, 401);
      }
      return expire || corps['refresh_token'] !== REFRESH_TOKEN
        ? reponse(route, { raison: 'session-expiree' }, 401)
        : reponse(route, {
            access_token: 'at-exemple-2',
            refresh_token: 'rt-exemple-2',
            expires_in: 3600,
          });
    }

    const auth = requete.headers()['authorization'] ?? null;
    autorisations.push(auth);
    const connectee = auth !== null && /^Bearer at-exemple-\d$/.test(auth);
    if (connectee && expire) return reponse(route, { raison: 'session-expiree' }, 401);
    if (!connectee && (mode === 'compte' || chemin.endsWith('/projets'))) {
      return reponse(route, { raison: 'connexion-requise' }, 403);
    }

    if (chemin === '/recherche') {
      const p = Number(url.searchParams.get('page') ?? 1);
      return reponse(route, {
        patrons: p === 1 ? PATRONS_PAGE_1 : PATRONS_PAGE_2,
        page: p,
        pages: 2,
      });
    }
    const projets = /^\/patron\/(\d+)\/projets$/.exec(chemin);
    if (projets) {
      const p = Number(url.searchParams.get('page') ?? 1);
      if (projets[1] === '102') return reponse(route, { projets: [], page: 1, pages: 1 });
      return reponse(route, {
        projets: p === 1 ? OUVRAGES_PAGE_1 : OUVRAGES_PAGE_2,
        page: p,
        pages: 2,
      });
    }
    const id = Number(chemin.split('/').pop());
    return reponse(
      route,
      id === 101 ? FICHE_101 : { ...FICHE_101, ...carte(id, `Patron ${id}`), photos: [] },
    );
  });

  // Page d'autorisation de Ravelry : on vérifie la demande, puis on « revient » comme le ferait Ravelry.
  await page.route(`${AUTH_URL}**`, async (route) => {
    const params = new URL(route.request().url()).searchParams;
    demandes.push(params);
    const redirect = params.get('redirect_uri') ?? '';
    const state = retour === 'state-falsifie' ? 'state-falsifie' : (params.get('state') ?? '');
    const query =
      retour === 'refus'
        ? `error=access_denied&state=${encodeURIComponent(state)}`
        : `code=${CODE}&state=${encodeURIComponent(state)}`;
    retour = 'ok';
    await route.fulfill({ status: 302, headers: { location: `${redirect}?${query}` } });
  });

  await page.route(`${IMAGE}/**`, (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
  );
  await page.context().route(PDF_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<title>Source simulée</title>',
    }),
  );

  return {
    appels,
    autorisations,
    corpsOauth,
    autorisations_ravelry: demandes,
    expirer: () => {
      expire = true;
    },
    prochainRetour: (r) => {
      retour = r;
    },
    mode,
  };
}

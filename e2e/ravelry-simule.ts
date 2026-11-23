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

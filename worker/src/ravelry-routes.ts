import type { Deps, Env } from './index';
import { ajouter, cleRavelry, dateUtc, empreinte, entier, TTL_JOUR } from './quota';
import { Craft, CRAFTS, reduireFiche, reduireListe, urlFiche, urlRecherche } from './ravelry';

const TAILLE_MAX = 2 * 1024 * 1024;
const DELAI_MS = 8000;
const QUOTA_DEFAUT = 120;
const ATTENTE_DEFAUT_S = 60;
const CACHE = 'public, max-age=300';

type Raison = 'requete' | 'quota-jour' | 'trop-de-demandes' | 'introuvable' | 'indisponible';

const STATUT: Record<Raison, number> = {
  requete: 400,
  'quota-jour': 429,
  'trop-de-demandes': 429,
  introuvable: 404,
  indisponible: 503,
};

type Entetes = Record<string, string>;

function refus(
  raison: Raison,
  entetes: Entetes,
  options: { detail?: string; attente?: number } = {},
): Response {
  const h =
    options.attente === undefined
      ? entetes
      : { ...entetes, 'Retry-After': String(options.attente) };
  return Response.json(options.detail ? { raison, detail: options.detail } : { raison }, {
    status: STATUT[raison],
    headers: h,
  });
}

/** Corps lu par morceaux et abandonné au-delà de la borne : un en-tête ne suffit pas à s'y fier. */
async function lireBorne(reponse: Response): Promise<string | null> {
  const annonce = Number(reponse.headers.get('Content-Length') ?? 0);
  if (annonce > TAILLE_MAX) return null;
  if (reponse.body === null) return '';
  const lecteur = reponse.body.getReader();
  const decodeur = new TextDecoder();
  let total = 0;
  let texte = '';
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    total += value.byteLength;
    if (total > TAILLE_MAX) {
      await lecteur.cancel();
      return null;
    }
    texte += decodeur.decode(value, { stream: true });
  }
  return texte + decodeur.decode();
}

function attenteAmont(reponse: Response): number {
  const v = Number(reponse.headers.get('Retry-After'));
  return Number.isInteger(v) && v > 0 && v <= 3600 ? v : ATTENTE_DEFAUT_S;
}

type Route =
  | { type: 'recherche'; q: string; craft: Craft; page: number }
  | { type: 'fiche'; id: number }
  | 'requete'
  | null;

/** Entrées bornées et validées avant tout appel : null si la route n'existe pas, 'requete' si l'entrée est invalide. */
function router(url: URL): Route {
  if (url.pathname === '/ravelry/recherche') {
    const q = (url.searchParams.get('q') ?? '').trim();
    const craft = url.searchParams.get('craft');
    const brute = url.searchParams.get('page') ?? '1';
    if (q === '' || q.length > 100) return 'requete';
    if (!CRAFTS.includes(craft as Craft)) return 'requete';
    if (!/^[1-9]\d{0,1}$/.test(brute) || Number(brute) > 50) return 'requete';
    return { type: 'recherche', q, craft: craft as Craft, page: Number(brute) };
  }
  const m = /^\/ravelry\/patron\/([^/]+)$/.exec(url.pathname);
  if (m) {
    return /^[1-9]\d{0,9}$/.test(m[1]) ? { type: 'fiche', id: Number(m[1]) } : 'requete';
  }
  return null;
}

export async function traiterRavelry(requete: Request, env: Env, deps: Deps): Promise<Response> {
  const url = new URL(requete.url);
  if (requete.method !== 'GET' && requete.method !== 'OPTIONS') {
    return new Response(null, { status: 404 });
  }
  const route = router(url);
  if (route === null) return new Response(null, { status: 404 });

  const origine = requete.headers.get('Origin');
  const autorisees = env.ORIGINES.split(',').map((o) => o.trim());
  if (origine === null || !autorisees.includes(origine)) return new Response(null, { status: 403 });
  // Retry-After doit être exposé : sans cela, le navigateur ne le laisse pas lire à la page.
  const entetes = {
    'Access-Control-Allow-Origin': origine,
    'Access-Control-Expose-Headers': 'Retry-After',
    Vary: 'Origin',
  };

  if (requete.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...entetes,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (route === 'requete') return refus('requete', entetes);
  if (!env.RAVELRY_USER || !env.RAVELRY_KEY) {
    return refus('indisponible', entetes, { detail: 'secrets' });
  }

  // Quota par empreinte d'IP salée (comme ADR-003) ; le compteur ne garde aucune adresse.
  const maintenant = deps.maintenant();
  const date = dateUtc(maintenant);
  const cle = cleRavelry(
    date,
    await empreinte(env.SEL_QUOTA, date, requete.headers.get('CF-Connecting-IP') ?? ''),
  );
  const quota = Number(env.QUOTA_RAVELRY_JOUR ?? QUOTA_DEFAUT) || QUOTA_DEFAUT;
  if ((await entier(deps.kv, cle)) >= quota) {
    const minuit = Date.UTC(
      maintenant.getUTCFullYear(),
      maintenant.getUTCMonth(),
      maintenant.getUTCDate() + 1,
    );
    return refus('quota-jour', entetes, {
      attente: Math.max(1, Math.ceil((minuit - maintenant.getTime()) / 1000)),
    });
  }
  await ajouter(deps.kv, cle, 1, TTL_JOUR);

  const amont = route.type === 'recherche' ? urlRecherche(route) : urlFiche(route.id);
  const appeler = deps.fetch ?? ((u: string, init: RequestInit) => fetch(u, init));
  let reponse: Response;
  try {
    reponse = await appeler(amont, {
      headers: {
        Authorization: `Basic ${btoa(`${env.RAVELRY_USER}:${env.RAVELRY_KEY}`)}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(DELAI_MS),
    });
  } catch (erreur) {
    const delai = (erreur as { name?: unknown } | null)?.name === 'TimeoutError';
    return refus('indisponible', entetes, { detail: delai ? 'delai' : 'reseau' });
  }

  if (reponse.status === 429) {
    return refus('trop-de-demandes', entetes, { attente: attenteAmont(reponse) });
  }
  if (reponse.status === 404) return refus('introuvable', entetes);
  if (!reponse.ok) return refus('indisponible', entetes, { detail: `ravelry-${reponse.status}` });

  let brut: unknown;
  try {
    const texte = await lireBorne(reponse);
    if (texte === null) return refus('indisponible', entetes, { detail: 'taille' });
    brut = JSON.parse(texte);
  } catch {
    return refus('indisponible', entetes, { detail: 'reponse' });
  }

  const reduit = route.type === 'recherche' ? reduireListe(brut) : reduireFiche(brut);
  if (reduit === null) {
    // Une fiche payante ou sans lien utilisable n'existe pas pour nous.
    const payant =
      route.type === 'fiche' &&
      (brut as { pattern?: { free?: unknown } } | null)?.pattern?.free === false;
    return payant
      ? refus('introuvable', entetes)
      : refus('indisponible', entetes, { detail: 'reponse' });
  }
  return Response.json(reduit, { status: 200, headers: { ...entetes, 'Cache-Control': CACHE } });
}

import type { Deps, Env } from './index';
import { attenteAmont, consommerQuota, DELAI_MS, lireBorne, refus } from './ravelry-commun';
import { RouteOauth, traiterOauth } from './ravelry-oauth';
import {
  Craft,
  CRAFTS,
  reduireFiche,
  reduireListe,
  reduireProjets,
  urlFiche,
  urlProjets,
  urlRecherche,
} from './ravelry';

const CACHE = 'public, max-age=300';
/** Alphabet large et borne : un jeton n'est jamais interprété, seulement transmis. */
const BEARER = /^Bearer ([A-Za-z0-9._~+/=-]{1,4096})$/;

type Route =
  | { type: 'recherche'; q: string; craft: Craft; page: number }
  | { type: 'fiche'; id: number }
  | { type: 'projets'; id: number; page: number }
  | { type: 'oauth'; oauth: RouteOauth }
  | 'requete'
  | null;

const pageValide = (brute: string) => /^[1-9]\d{0,1}$/.test(brute) && Number(brute) <= 50;

/** Entrées bornées et validées avant tout appel : null si la route n'existe pas, 'requete' si l'entrée est invalide. */
function router(url: URL, methode: string): Route {
  if (url.pathname === '/ravelry/oauth/jeton' || url.pathname === '/ravelry/oauth/rafraichir') {
    if (methode === 'GET') return null;
    return { type: 'oauth', oauth: url.pathname.endsWith('/jeton') ? 'jeton' : 'rafraichir' };
  }
  if (methode === 'POST') return null;
  if (url.pathname === '/ravelry/recherche') {
    const q = (url.searchParams.get('q') ?? '').trim();
    const craft = url.searchParams.get('craft');
    const brute = url.searchParams.get('page') ?? '1';
    if (q === '' || q.length > 100) return 'requete';
    if (!CRAFTS.includes(craft as Craft)) return 'requete';
    if (!pageValide(brute)) return 'requete';
    return { type: 'recherche', q, craft: craft as Craft, page: Number(brute) };
  }
  const m = /^\/ravelry\/patron\/([^/]+?)(\/projets)?$/.exec(url.pathname);
  if (m) {
    if (!/^[1-9]\d{0,9}$/.test(m[1])) return 'requete';
    if (!m[2]) return { type: 'fiche', id: Number(m[1]) };
    const brute = url.searchParams.get('page') ?? '1';
    return pageValide(brute)
      ? { type: 'projets', id: Number(m[1]), page: Number(brute) }
      : 'requete';
  }
  return null;
}

export async function traiterRavelry(requete: Request, env: Env, deps: Deps): Promise<Response> {
  const url = new URL(requete.url);
  if (!['GET', 'POST', 'OPTIONS'].includes(requete.method)) {
    return new Response(null, { status: 404 });
  }
  const route = router(url, requete.method === 'OPTIONS' ? 'OPTIONS' : requete.method);
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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (route === 'requete') return refus('requete', entetes);
  if (route.type === 'oauth') return traiterOauth(route.oauth, requete, env, deps, entetes);

  // Jeton de la lectrice : transmis tel quel à Ravelry, jamais lu, conservé ni journalisé.
  const autorisation = requete.headers.get('Authorization');
  const m = autorisation === null ? null : BEARER.exec(autorisation);
  if (autorisation !== null && m === null) return refus('requete', entetes);
  const jeton = m === null ? null : m[1];
  // Avec un jeton, la réponse est personnelle : jamais de cache partagé.
  const h = jeton === null ? entetes : { ...entetes, Vary: 'Origin, Authorization' };

  // Le serveur ne compte pas sur l'interface : sans jeton, la galerie est toujours fermée, et
  // la recherche et la fiche le sont tant que le mode n'est pas explicitement `ouvert`.
  if (jeton === null && (route.type === 'projets' || env.RAVELRY_ACCES !== 'ouvert')) {
    return refus('connexion-requise', h);
  }
  if (jeton === null && (!env.RAVELRY_USER || !env.RAVELRY_KEY)) {
    return refus('indisponible', h, { detail: 'secrets' });
  }

  const limite = await consommerQuota(requete, env, deps, h);
  if (limite !== null) return limite;

  const amont =
    route.type === 'recherche'
      ? urlRecherche(route)
      : route.type === 'fiche'
        ? urlFiche(route.id)
        : urlProjets(route.id, route.page);
  const appeler = deps.fetch ?? ((u: string, init: RequestInit) => fetch(u, init));
  let reponse: Response;
  try {
    reponse = await appeler(amont, {
      headers: {
        Authorization:
          jeton === null
            ? `Basic ${btoa(`${env.RAVELRY_USER}:${env.RAVELRY_KEY}`)}`
            : `Bearer ${jeton}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(DELAI_MS),
    });
  } catch (erreur) {
    const delai = (erreur as { name?: unknown } | null)?.name === 'TimeoutError';
    return refus('indisponible', h, { detail: delai ? 'delai' : 'reseau' });
  }

  if (reponse.status === 429) {
    return refus('trop-de-demandes', h, { attente: attenteAmont(reponse) });
  }
  if (reponse.status === 404) return refus('introuvable', h);
  // 401 sur un jeton : la lectrice doit se reconnecter. Sur la clé en lecture seule, ce n'est pas elle.
  if (reponse.status === 401 && jeton !== null) return refus('session-expiree', h);
  if (!reponse.ok) return refus('indisponible', h, { detail: `ravelry-${reponse.status}` });

  let brut: unknown;
  try {
    const texte = await lireBorne(reponse);
    if (texte === null) return refus('indisponible', h, { detail: 'taille' });
    brut = JSON.parse(texte);
  } catch {
    return refus('indisponible', h, { detail: 'reponse' });
  }

  const reduit =
    route.type === 'recherche'
      ? reduireListe(brut)
      : route.type === 'fiche'
        ? reduireFiche(brut)
        : reduireProjets(brut);
  if (reduit === null) {
    // Une fiche payante ou sans lien utilisable n'existe pas pour nous.
    const payant =
      route.type === 'fiche' &&
      (brut as { pattern?: { free?: unknown } } | null)?.pattern?.free === false;
    return payant ? refus('introuvable', h) : refus('indisponible', h, { detail: 'reponse' });
  }
  return Response.json(reduit, {
    status: 200,
    headers: { ...h, 'Cache-Control': jeton === null ? CACHE : 'no-store' },
  });
}

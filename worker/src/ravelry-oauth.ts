import type { Deps, Env } from './index';
import {
  attenteAmont,
  consommerQuota,
  DELAI_MS,
  Entetes,
  lireBorne,
  refus,
} from './ravelry-commun';

/**
 * Échange OAuth 2.1 avec PKCE (fiche 62, ADR-004). Le Worker ne fait que porter
 * le secret client : il ne garde ni code, ni jeton, ni empreinte, et ne
 * journalise rien (aucun appel à `console` dans ce fichier, un test le garde).
 */

/** Jeton, sans choix de forme que Ravelry n'a pas documenté : un alphabet large, une borne. */
const JETON = /^[A-Za-z0-9._~+/=-]+$/;
const VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/;
const CORPS_MAX = 4096;
const TOKEN_URL = 'https://auth.ravelry.com/oauth2/token';

export type RouteOauth = 'jeton' | 'rafraichir';

const chaine = (v: unknown, min: number, max: number, forme: RegExp): v is string =>
  typeof v === 'string' && v.length >= min && v.length <= max && forme.test(v);

/**
 * Corps JSON borné : lu par morceaux et abandonné au-delà de la borne (un en-tête
 * `Content-Length` ne suffit pas à s'y fier). `null` si trop gros, illisible ou pas un objet.
 */
async function lireCorps(requete: Request): Promise<Record<string, unknown> | null> {
  if (Number(requete.headers.get('Content-Length') ?? 0) > CORPS_MAX) return null;
  if (requete.body === null) return null;
  const lecteur = requete.body.getReader();
  const decodeur = new TextDecoder();
  let total = 0;
  let texte = '';
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    total += value.byteLength;
    if (total > CORPS_MAX) {
      await lecteur.cancel();
      return null;
    }
    texte += decodeur.decode(value, { stream: true });
  }
  texte += decodeur.decode();
  if (texte.length === 0) return null;
  try {
    const corps: unknown = JSON.parse(texte);
    return typeof corps === 'object' && corps !== null && !Array.isArray(corps)
      ? (corps as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Formulaire pour Ravelry, ou `null` si une entrée est invalide. */
function formulaire(
  route: RouteOauth,
  corps: Record<string, unknown>,
  env: Env,
): URLSearchParams | null {
  if (route === 'rafraichir') {
    if (!chaine(corps['refresh_token'], 1, 2048, JETON)) return null;
    return new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: corps['refresh_token'],
    });
  }
  const autorisees = (env.RAVELRY_REDIRECT_URIS ?? '')
    .split(',')
    .map((u) => u.trim())
    .filter((u) => u !== '');
  const uri = corps['redirect_uri'];
  if (typeof uri !== 'string' || !autorisees.includes(uri)) return null;
  if (!chaine(corps['code'], 1, 512, JETON)) return null;
  if (!chaine(corps['code_verifier'], 43, 128, VERIFIER)) return null;
  return new URLSearchParams({
    grant_type: 'authorization_code',
    code: corps['code'],
    code_verifier: corps['code_verifier'],
    redirect_uri: uri,
  });
}

export async function traiterOauth(
  route: RouteOauth,
  requete: Request,
  env: Env,
  deps: Deps,
  entetes: Entetes,
): Promise<Response> {
  // Jamais de cache, y compris sur un refus : la réponse est personnelle.
  const h = { ...entetes, 'Cache-Control': 'no-store' };

  const corps = await lireCorps(requete);
  const formu = corps === null ? null : formulaire(route, corps, env);
  if (formu === null) return refus('requete', h);

  if (!env.RAVELRY_OAUTH_ID || !env.RAVELRY_OAUTH_SECRET) {
    return refus('indisponible', h, { detail: 'secrets' });
  }
  const limite = await consommerQuota(requete, env, deps, h);
  if (limite !== null) return limite;

  const appeler = deps.fetch ?? ((u: string, init: RequestInit) => fetch(u, init));
  let reponse: Response;
  try {
    reponse = await appeler(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${env.RAVELRY_OAUTH_ID}:${env.RAVELRY_OAUTH_SECRET}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: formu.toString(),
      signal: AbortSignal.timeout(DELAI_MS),
    });
  } catch (erreur) {
    const delai = (erreur as { name?: unknown } | null)?.name === 'TimeoutError';
    return refus('indisponible', h, { detail: delai ? 'delai' : 'reseau' });
  }

  let brut: unknown = null;
  try {
    const texte = await lireBorne(reponse);
    if (texte === null) return refus('indisponible', h, { detail: 'taille' });
    brut = JSON.parse(texte);
  } catch {
    // Un corps illisible est traité d'après le seul statut, plus bas.
  }
  const objet = typeof brut === 'object' && brut !== null ? (brut as Record<string, unknown>) : {};

  if (!reponse.ok) {
    if (reponse.status === 429) {
      return refus('trop-de-demandes', h, { attente: attenteAmont(reponse) });
    }
    // Le code d'erreur sert à décider, jamais à répondre : on ne relaie aucun texte de Ravelry.
    if (objet['error'] === 'invalid_grant') return refus('session-expiree', h);
    return refus('indisponible', h, { detail: `ravelry-${reponse.status}` });
  }

  const acces = objet['access_token'];
  const duree = objet['expires_in'];
  const rafraichir = objet['refresh_token'];
  if (
    !chaine(acces, 1, 4096, JETON) ||
    typeof duree !== 'number' ||
    !Number.isInteger(duree) ||
    duree <= 0 ||
    (rafraichir !== undefined && !chaine(rafraichir, 1, 2048, JETON))
  ) {
    return refus('indisponible', h, { detail: 'reponse' });
  }
  // Seulement ces trois champs : le reste (id_token, scope…) ne sort pas du Worker.
  return Response.json(
    {
      access_token: acces,
      ...(rafraichir === undefined ? {} : { refresh_token: rafraichir }),
      expires_in: duree,
    },
    { status: 200, headers: h },
  );
}

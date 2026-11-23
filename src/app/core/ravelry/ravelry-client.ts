import type {
  RavelryCard,
  RavelryDetail,
  RavelryProjects,
  RavelryRefusal,
  RavelryResult,
  RavelrySearch,
  RavelryTokens,
} from './ravelry.model';

/** Le Worker coupe Ravelry à 8 s : un peu plus ici, pour recevoir son refus plutôt que le nôtre. */
const TIMEOUT_MS = 12_000;
/** Une réponse plus grosse n'est pas la nôtre : refusée avant d'être lue. */
const MAX_REPONSE = 300_000;
const REFUS: readonly RavelryRefusal[] = [
  'requete',
  'quota-jour',
  'trop-de-demandes',
  'introuvable',
  'indisponible',
  'connexion-requise',
  'session-expiree',
];
/** Un détail est un code court (« ravelry-504 »), jamais une phrase. */
const DETAIL = /^[\w:,%.-]{1,80}$/;
const PREFIXE_PATRON = 'https://www.ravelry.com/patterns/library/';

type Objet = Record<string, unknown>;
const objet = (v: unknown): v is Objet => typeof v === 'object' && v !== null && !Array.isArray(v);
const https = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= 600 && v.startsWith('https://');
const lienRavelry = (v: unknown): v is string =>
  https(v) && v.startsWith(PREFIXE_PATRON) && v.length > PREFIXE_PATRON.length;
const texte = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const entierPositif = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0;

function carte(v: unknown): v is RavelryCard {
  return (
    objet(v) &&
    entierPositif(v['id']) &&
    texte(v['nom'], 200) &&
    v['nom'] !== '' &&
    texte(v['designer'], 100) &&
    (v['vignette'] === null || https(v['vignette'])) &&
    lienRavelry(v['lien'])
  );
}

function liste(v: unknown): v is RavelrySearch {
  return (
    objet(v) &&
    Array.isArray(v['patrons']) &&
    v['patrons'].length <= 40 &&
    v['patrons'].every(carte) &&
    entierPositif(v['page']) &&
    entierPositif(v['pages'])
  );
}

function fiche(v: unknown): v is RavelryDetail {
  return (
    objet(v) &&
    entierPositif(v['id']) &&
    texte(v['nom'], 200) &&
    texte(v['designer'], 100) &&
    texte(v['description'], 8000) &&
    Array.isArray(v['photos']) &&
    v['photos'].length <= 12 &&
    v['photos'].every(https) &&
    (v['craft'] === null || texte(v['craft'], 60)) &&
    (v['poidsFil'] === null || texte(v['poidsFil'], 60)) &&
    (v['difficulte'] === null || (typeof v['difficulte'] === 'number' && v['difficulte'] > 0)) &&
    (v['telechargement'] === null || https(v['telechargement'])) &&
    (v['source'] === null || https(v['source'])) &&
    lienRavelry(v['lien'])
  );
}

/**
 * Le service worker de l'application répond « 504 Gateway Timeout » à la place
 * du navigateur quand une requête échoue : le Worker, lui, ne répond jamais 504.
 */
const ECHEC_DEGUISE = (r: Response) => r.status === 504 && r.statusText === 'Gateway Timeout';

/** `ngsw-bypass` : la requête ne passe ni par le service worker ni par son cache. */
function adresse(base: string, chemin: string, params: Record<string, string> = {}): string {
  const u = new URL(`${base.replace(/\/$/, '')}${chemin}`);
  for (const [cle, valeur] of Object.entries(params)) u.searchParams.set(cle, valeur);
  u.searchParams.set('ngsw-bypass', 'true');
  return u.toString();
}

/**
 * Appelle le Worker (ADR-004). Toute anomalie devient un refus dit, jamais une
 * exception ; une réponse qui n'a pas la forme attendue est refusée en bloc.
 */
async function appeler<T>(
  url: string,
  valide: (corps: unknown) => corps is T,
  options: { auth?: string | null; post?: unknown } = {},
): Promise<RavelryResult<T>> {
  let reponse: Response;
  try {
    // Le jeton ne voyage que dans cet en-tête : jamais dans l'adresse, ni dans un message.
    const entetes: Record<string, string> = {};
    if (options.auth) entetes['Authorization'] = `Bearer ${options.auth}`;
    if (options.post !== undefined) entetes['Content-Type'] = 'application/json';
    reponse = await fetch(url, {
      method: options.post === undefined ? 'GET' : 'POST',
      headers: entetes,
      ...(options.post === undefined ? {} : { body: JSON.stringify(options.post) }),
      // Une réponse personnelle n'a rien à faire dans le cache HTTP du navigateur.
      ...(options.auth || options.post !== undefined ? { cache: 'no-store' as const } : {}),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (erreur) {
    const delai =
      erreur instanceof DOMException && ['TimeoutError', 'AbortError'].includes(erreur.name);
    return delai ? { ok: false, raison: 'delai' } : { ok: false, raison: 'reseau' };
  }
  if (Number(reponse.headers.get('Content-Length') ?? 0) > MAX_REPONSE) {
    return { ok: false, raison: 'indisponible', detail: 'taille' };
  }
  if (ECHEC_DEGUISE(reponse)) return { ok: false, raison: 'reseau' };

  let corps: unknown;
  try {
    const brut = await reponse.text();
    if (brut.length > MAX_REPONSE) return { ok: false, raison: 'indisponible', detail: 'taille' };
    corps = JSON.parse(brut);
  } catch {
    return { ok: false, raison: 'indisponible', detail: `http-${reponse.status}` };
  }

  if (reponse.ok) {
    return valide(corps)
      ? { ok: true, data: corps }
      : { ok: false, raison: 'indisponible', detail: 'reponse' };
  }
  const { raison, detail } = objet(corps) ? corps : ({} as Objet);
  const connu = REFUS.find((r) => r === raison);
  if (!connu) return { ok: false, raison: 'indisponible', detail: `http-${reponse.status}` };
  const attente = Number(reponse.headers.get('Retry-After'));
  return {
    ok: false,
    raison: connu,
    ...(typeof detail === 'string' && DETAIL.test(detail) ? { detail } : {}),
    ...(connu === 'trop-de-demandes' && Number.isInteger(attente) && attente > 0 && attente <= 3600
      ? { attente }
      : {}),
  };
}

export function searchPatterns(
  base: string,
  demande: { q: string; craft: 'crochet' | 'knitting'; page: number },
  auth?: string | null,
): Promise<RavelryResult<RavelrySearch>> {
  return appeler(
    adresse(base, '/recherche', {
      q: demande.q,
      craft: demande.craft,
      page: String(demande.page),
    }),
    liste,
    { auth },
  );
}

export function getPattern(
  base: string,
  id: number,
  auth?: string | null,
): Promise<RavelryResult<RavelryDetail>> {
  return appeler(adresse(base, `/patron/${id}`), fiche, { auth });
}

const PREFIXE_PROJET = 'https://www.ravelry.com/projects/';

function galerie(v: unknown): v is RavelryProjects {
  return (
    objet(v) &&
    Array.isArray(v['projets']) &&
    v['projets'].length <= 24 &&
    v['projets'].every(
      (p) =>
        objet(p) &&
        Object.keys(p).length === 2 &&
        https(p['photo']) &&
        https(p['lien']) &&
        (p['lien'] as string).startsWith(PREFIXE_PROJET),
    ) &&
    entierPositif(v['page']) &&
    entierPositif(v['pages'])
  );
}

/** Ouvrages réalisés avec un patron : réservé aux lectrices connectées (`auth` obligatoire). */
export function getProjects(
  base: string,
  id: number,
  page: number,
  auth: string,
): Promise<RavelryResult<RavelryProjects>> {
  return appeler(adresse(base, `/patron/${id}/projets`, { page: String(page) }), galerie, { auth });
}

/** Au plus 4096 caractères de jeton d'accès, 2048 de rafraîchissement : les bornes du Worker. */
const JETON = /^[A-Za-z0-9._~+/=-]+$/;

function jetons(
  v: unknown,
): v is { access_token: string; refresh_token?: string; expires_in: number } {
  return (
    objet(v) &&
    typeof v['access_token'] === 'string' &&
    v['access_token'].length <= 4096 &&
    JETON.test(v['access_token']) &&
    (v['refresh_token'] === undefined ||
      (typeof v['refresh_token'] === 'string' &&
        v['refresh_token'].length <= 2048 &&
        JETON.test(v['refresh_token']))) &&
    Number.isInteger(v['expires_in']) &&
    (v['expires_in'] as number) > 0 &&
    (v['expires_in'] as number) <= 86_400
  );
}

async function appelerJetons(
  url: string,
  corps: Record<string, string>,
): Promise<RavelryResult<RavelryTokens>> {
  const r = await appeler(url, jetons, { post: corps });
  if (!r.ok) return r;
  return {
    ok: true,
    data: {
      accessToken: r.data.access_token,
      refreshToken: r.data.refresh_token ?? null,
      expiresIn: r.data.expires_in,
    },
  };
}

/** Échange du code d'autorisation contre des jetons, par le Worker (qui porte le secret client). */
export function exchangeCode(
  base: string,
  demande: { code: string; verifier: string; redirectUri: string },
): Promise<RavelryResult<RavelryTokens>> {
  return appelerJetons(adresse(base, '/oauth/jeton'), {
    code: demande.code,
    code_verifier: demande.verifier,
    redirect_uri: demande.redirectUri,
  });
}

export function refreshTokens(
  base: string,
  refreshToken: string,
): Promise<RavelryResult<RavelryTokens>> {
  return appelerJetons(adresse(base, '/oauth/rafraichir'), { refresh_token: refreshToken });
}

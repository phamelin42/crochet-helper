import type { Deps, Env } from './index';
import { ajouter, cleRavelry, dateUtc, empreinte, entier, TTL_JOUR } from './quota';

export const TAILLE_MAX = 2 * 1024 * 1024;
export const DELAI_MS = 8000;
const QUOTA_DEFAUT = 120;
const ATTENTE_DEFAUT_S = 60;

export type Raison =
  | 'requete'
  | 'quota-jour'
  | 'trop-de-demandes'
  | 'introuvable'
  | 'indisponible'
  | 'connexion-requise'
  | 'session-expiree';

const STATUT: Record<Raison, number> = {
  requete: 400,
  'quota-jour': 429,
  'trop-de-demandes': 429,
  introuvable: 404,
  indisponible: 503,
  'connexion-requise': 403,
  'session-expiree': 401,
};

export type Entetes = Record<string, string>;

export function refus(
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
export async function lireBorne(reponse: Response): Promise<string | null> {
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

export function attenteAmont(reponse: Response): number {
  const v = Number(reponse.headers.get('Retry-After'));
  return Number.isInteger(v) && v > 0 && v <= 3600 ? v : ATTENTE_DEFAUT_S;
}

/**
 * Quota par empreinte d'IP salée (comme ADR-003) ; le compteur ne garde aucune
 * adresse. `null` : la demande passe (et le compteur a avancé) ; sinon le refus à renvoyer.
 */
export async function consommerQuota(
  requete: Request,
  env: Env,
  deps: Deps,
  entetes: Entetes,
): Promise<Response | null> {
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
  return null;
}

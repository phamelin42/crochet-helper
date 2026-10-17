import type { AiFormatResult, AiRefusal } from './format-client.token';

/** Une mise en forme prend jusqu'à une minute : on coupe un peu après. */
const TIMEOUT_MS = 90_000;
/** Une réponse plus longue n'est pas un patron : on la refuse avant de la traiter. */
const MAX_REPONSE = 200_000;
/** Les raisons que le Worker sait donner ; toute autre est une réponse inattendue. */
const REFUS: readonly AiRefusal[] = [
  'quota-jour',
  'budget-mois',
  'echec',
  'trop-long',
  'indisponible',
];
/** Un détail est un code court (« trop-court:25% »), jamais une phrase : on ne relaie que cela. */
const DETAIL = /^[\w:,%.-]{1,80}$/;

function indisponible(detail: string): AiFormatResult {
  return { ok: false, raison: 'indisponible', detail };
}

/**
 * Le service worker de l'application répond « 504 Gateway Timeout » à la place du
 * navigateur quand une requête échoue (réseau, bloqueur, origine refusée par CORS).
 * Le Worker, lui, ne répond jamais 504 : c'est un échec de réseau déguisé.
 */
const ECHEC_DEGUISE = (response: Response) =>
  response.status === 504 && response.statusText === 'Gateway Timeout';

/**
 * Adresse du site, pour le code technique : le Worker n'accepte qu'une origine, et
 * un site ouvert depuis une autre (aperçu, ancienne adresse) échoue sans autre signe.
 */
function hoteDuSite(): string {
  const hote = globalThis.location?.host ?? '';
  return /^[\w.:-]{1,60}$/.test(hote) ? hote : 'inconnue';
}

/**
 * `ngsw-bypass` : la requête ne passe pas par le service worker, qui masquerait la
 * vraie erreur et n'a rien à mettre en cache ici.
 */
function sansServiceWorker(url: string): string {
  const adresse = new URL(url);
  adresse.searchParams.set('ngsw-bypass', 'true');
  return adresse.toString();
}

/**
 * Envoie le texte au Worker. Toute anomalie devient un refus dit, jamais une
 * exception : `delai` (plus d'une minute), `reseau` (le Worker n'a pas été
 * joint : connexion coupée, bloqueur, service arrêté), ou `indisponible` avec le
 * statut HTTP ou le détail du Worker. L'appelant charge alors le texte d'origine.
 */
export async function formatWithAi(
  url: string,
  texte: string,
  langue: 'fr' | 'en',
): Promise<AiFormatResult> {
  let response: Response;
  try {
    response = await fetch(sansServiceWorker(url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte, langue }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const delai =
      error instanceof DOMException && ['TimeoutError', 'AbortError'].includes(error.name);
    return delai
      ? { ok: false, raison: 'delai' }
      : { ok: false, raison: 'reseau', detail: `origine:${hoteDuSite()}` };
  }

  try {
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object') return indisponible(`http-${response.status}`);
    const { texte: reponse, restant, raison, detail } = body as Record<string, unknown>;
    if (response.ok) {
      const valide =
        typeof reponse === 'string' &&
        reponse.trim() !== '' &&
        reponse.length < MAX_REPONSE &&
        Number.isInteger(restant) &&
        (restant as number) >= 0;
      return valide
        ? { ok: true, texte: reponse, restant: restant as number }
        : indisponible('reponse-invalide');
    }
    const connu = REFUS.find((r) => r === raison);
    if (!connu) return indisponible(`http-${response.status}`);
    const code = typeof detail === 'string' && DETAIL.test(detail) ? detail : undefined;
    return code ? { ok: false, raison: connu, detail: code } : { ok: false, raison: connu };
  } catch {
    if (ECHEC_DEGUISE(response)) {
      return { ok: false, raison: 'reseau', detail: `origine:${hoteDuSite()}` };
    }
    // Corps illisible : une page d'erreur de Cloudflare (Worker en panne) plutôt que du JSON.
    return indisponible(`http-${response.status}`);
  }
}

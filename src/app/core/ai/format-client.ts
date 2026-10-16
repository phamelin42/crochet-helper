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
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte, langue }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const delai =
      error instanceof DOMException && ['TimeoutError', 'AbortError'].includes(error.name);
    return { ok: false, raison: delai ? 'delai' : 'reseau' };
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
    // Corps illisible : une page d'erreur de Cloudflare (Worker en panne) plutôt que du JSON.
    return indisponible(`http-${response.status}`);
  }
}

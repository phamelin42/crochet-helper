import type { AiFormatResult, AiRefusal } from './format-client.token';

/** Une mise en forme prend jusqu'à une minute : on coupe un peu après. */
const TIMEOUT_MS = 90_000;
/** Une réponse plus longue n'est pas un patron : on la refuse avant de la traiter. */
const MAX_REPONSE = 200_000;
const REFUS: readonly AiRefusal[] = ['quota-jour', 'budget-mois', 'echec', 'trop-long'];

const INDISPONIBLE: AiFormatResult = { ok: false, raison: 'indisponible' };

/**
 * Envoie le texte au Worker. Toute anomalie — réseau, délai, JSON, forme
 * inattendue — devient `indisponible` : l'appelant charge alors le texte
 * d'origine, il n'a jamais d'exception à rattraper.
 */
export async function formatWithAi(
  url: string,
  texte: string,
  langue: 'fr' | 'en',
): Promise<AiFormatResult> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte, langue }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object') return INDISPONIBLE;
    const { texte: reponse, restant, raison } = body as Record<string, unknown>;
    if (response.ok) {
      const valide =
        typeof reponse === 'string' &&
        reponse.trim() !== '' &&
        reponse.length < MAX_REPONSE &&
        Number.isInteger(restant) &&
        (restant as number) >= 0;
      return valide ? { ok: true, texte: reponse, restant: restant as number } : INDISPONIBLE;
    }
    const connu = REFUS.find((r) => r === raison);
    return connu ? { ok: false, raison: connu } : INDISPONIBLE;
  } catch {
    return INDISPONIBLE;
  }
}

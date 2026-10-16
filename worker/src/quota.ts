const MICRO = 1_000_000;
export const TTL_JOUR = 2 * 24 * 3600;
export const TTL_MOIS = 40 * 24 * 3600;

/** Date UTC AAAA-MM-JJ. */
export function dateUtc(maintenant: Date): string {
  return maintenant.toISOString().slice(0, 10);
}

/** Le sel contient la date : l'empreinte d'hier ne dit rien d'aujourd'hui. */
export async function empreinte(sel: string, date: string, ip: string): Promise<string> {
  const octets = new TextEncoder().encode(sel + date + ip);
  const hache = await crypto.subtle.digest('SHA-256', octets);
  return [...new Uint8Array(hache)].map((o) => o.toString(16).padStart(2, '0')).join('');
}

export const cleJour = (date: string, empr: string) => `jour:${date}:${empr}`;
export const cleMois = (date: string) => `mois:${date.slice(0, 7)}`;
export const cleDepense = (date: string) => `depense:${date}`;

/** Dépense en micro-dollars (entier) d'après l'`usage` réel de la réponse. */
export function coutMicro(
  usage: { input_tokens: number; output_tokens: number },
  prixEntreeMtok: number,
  prixSortieMtok: number,
): number {
  // Un prix en dollars par million de tokens est un prix en micro-dollars par token.
  return Math.ceil(usage.input_tokens * prixEntreeMtok + usage.output_tokens * prixSortieMtok);
}

/** Budget épuisé si le mois a atteint le plafond, ou le jour son dixième. */
export function budgetAtteint(moisMicro: number, jourMicro: number, budgetUsd: number): boolean {
  const plafond = budgetUsd * MICRO;
  return moisMicro >= plafond || jourMicro >= plafond / 10;
}

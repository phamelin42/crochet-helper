export type VisitBucket = '1d' | '2_7d' | '8_30d' | '31d';

const DAY_MS = 86_400_000;

/** Instant UTC (ms) d'une date civile AAAA-MM-JJ valide, `null` sinon. */
function parseCivilDate(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);
  const valid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? time : null;
}

/** Nombre de jours civils entre deux dates AAAA-MM-JJ, `null` si l'une est invalide. */
export function daysSinceCivil(day: string, today: string): number | null {
  const first = parseCivilDate(day);
  const now = parseCivilDate(today);
  if (first === null || now === null) return null;
  return Math.round((now - first) / DAY_MS);
}

/**
 * Tranche d'ancienneté entre une première visite et aujourd'hui. `null` le
 * jour de la première visite (ce n'est pas un retour), pour une date
 * invalide, ou pour une date de première visite future.
 */
export function visitBucket(firstVisitDay: string, today: string): VisitBucket | null {
  const days = daysSinceCivil(firstVisitDay, today);
  if (days === null || days <= 0) return null;
  if (days === 1) return '1d';
  if (days <= 7) return '2_7d';
  if (days <= 30) return '8_30d';
  return '31d';
}

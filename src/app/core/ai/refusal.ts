import { BlockedReason } from './normalize.contract';

/**
 * Classification des refus de l'API Claude.
 *
 * Trois refus se ressemblent — l'utilisateur n'a plus de jetons — mais n'ont
 * pas du tout la même échéance :
 *
 * | Refus                        | Statut | Signature                              | Reprise            |
 * | ---------------------------- | ------ | -------------------------------------- | ------------------ |
 * | Limite par minute            | 429    | en-tête `retry-after`                  | quelques secondes  |
 * | Plafond mensuel du palier    | 429    | `enforced_spend_limit_reached`         | 1er du mois, 00:00 UTC |
 * | Plafond fixé dans la console | 400    | `invalid_request_error`                | action humaine     |
 *
 * Fonction pure, sans accès au réseau ni à l'environnement : c'est ce qui
 * permet de la tester alors que le reste de la fonction serverless ne l'est pas.
 */

export interface Refusal {
  readonly reason: BlockedReason;
  /** Instant RFC 3339 de reprise, ou `null` si indéterminable. */
  readonly resumesAt: string | null;
}

/** « You will regain access on 2026-09-01 at 00:00 UTC. » → instant RFC 3339. */
export function parseResumeDate(message: string): string | null {
  const match = /(\d{4}-\d{2}-\d{2})\s+at\s+(\d{2}:\d{2})\s*UTC/i.exec(message);
  if (!match) return null;
  const parsed = new Date(`${match[1]}T${match[2]}:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Premier jour du mois suivant, 00:00 UTC. */
export function startOfNextMonthUtc(from: Date): string {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1)).toISOString();
}

export interface UpstreamError {
  error?: { type?: string; message?: string; details?: { error_code?: string } };
}

export function classifyRefusal(
  status: number,
  payload: UpstreamError,
  retryAfter: string | null,
  now: Date,
): Refusal {
  const message = payload.error?.message ?? '';

  if (status === 429 && payload.error?.details?.error_code === 'enforced_spend_limit_reached') {
    return { reason: 'spend_cap', resumesAt: parseResumeDate(message) ?? startOfNextMonthUtc(now) };
  }

  if (status === 429) {
    const seconds = Number.parseInt(retryAfter ?? '', 10);
    return {
      reason: 'rate_limit',
      resumesAt: Number.isFinite(seconds)
        ? new Date(now.getTime() + seconds * 1000).toISOString()
        : null,
    };
  }

  // 400 : plafond fixé à la main dans la console, jamais accompagné de `retry-after`.
  return { reason: 'spend_limit', resumesAt: parseResumeDate(message) };
}

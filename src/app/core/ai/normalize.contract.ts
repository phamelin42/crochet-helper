/**
 * Contrat de l'endpoint `/api/normalize`, partagé par la fonction serverless
 * et par le client Angular. Fichier volontairement sans aucun `import` : il est
 * embarqué dans les deux bundles, qui n'ont pas les mêmes dépendances.
 */

/** Au-delà, la requête est refusée sans appeler le modèle. */
export const MAX_INPUT_CHARS = 40_000;

export interface NormalizeRequest {
  readonly text: string;
  /** Langue de l'interface, utilisée pour les libellés de rang attendus. */
  readonly locale: 'fr' | 'en';
}

/** Pourquoi la normalisation est indisponible pour le moment. */
export type BlockedReason =
  /** Limite par minute de l'organisation : se recharge en continu. */
  | 'rate_limit'
  /** Plafond mensuel du palier atteint : revient au 1er du mois, 00:00 UTC. */
  | 'spend_cap'
  /** Plafond fixé manuellement dans la console : revient quand il est relevé. */
  | 'spend_limit';

export type ErrorReason =
  | 'empty'
  | 'too_large'
  /** Pas de clé côté serveur, ou clé refusée. */
  | 'misconfigured'
  | 'upstream';

export type NormalizeResponse =
  | { readonly status: 'ok'; readonly text: string }
  | {
      readonly status: 'blocked';
      readonly reason: BlockedReason;
      /** Instant RFC 3339 de reprise, ou `null` si indéterminable. */
      readonly resumesAt: string | null;
    }
  | { readonly status: 'error'; readonly reason: ErrorReason };

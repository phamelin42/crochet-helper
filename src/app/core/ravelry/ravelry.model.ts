/** Ce que dit le Worker (ADR-004) : déjà réduit à nos champs, validé encore à l'arrivée. */

export interface RavelryCard {
  readonly id: number;
  readonly nom: string;
  readonly designer: string;
  readonly vignette: string | null;
  /** Page du patron sur Ravelry. */
  readonly lien: string;
}

export interface RavelrySearch {
  readonly patrons: readonly RavelryCard[];
  readonly page: number;
  readonly pages: number;
}

export interface RavelryDetail {
  readonly id: number;
  readonly nom: string;
  readonly designer: string;
  /** Texte brut : à rendre par segments, jamais comme HTML. */
  readonly description: string;
  readonly photos: readonly string[];
  readonly craft: string | null;
  readonly poidsFil: string | null;
  readonly difficulte: number | null;
  /** PDF ou téléchargement, quand Ravelry le donne. */
  readonly telechargement: string | null;
  /** Page du patron chez la créatrice. */
  readonly source: string | null;
  readonly lien: string;
}

/** Les raisons que le Worker sait donner, plus celles que pose le client : réseau coupé, délai dépassé. */
export type RavelryRefusal =
  | 'requete'
  | 'quota-jour'
  | 'trop-de-demandes'
  | 'introuvable'
  | 'indisponible'
  | 'reseau'
  | 'delai';

export type RavelryResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly raison: RavelryRefusal;
      readonly detail?: string;
      /** Secondes avant de réessayer, d'un 429. */
      readonly attente?: number;
    };

export type RavelryCraft = 'crochet' | 'knitting';

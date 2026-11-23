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
  | 'delai'
  /** 403 du Worker : il faut se connecter à Ravelry (fiche 62). */
  | 'connexion-requise'
  /** 401 : le jeton n'est plus accepté et ne peut pas être renouvelé. */
  | 'session-expiree';

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

/** Un ouvrage réalisé avec un patron : une photo et le lien vers sa page Ravelry, rien d'autre (fiche 62). */
export interface RavelryProject {
  readonly photo: string;
  readonly lien: string;
}

export interface RavelryProjects {
  readonly projets: readonly RavelryProject[];
  readonly page: number;
  readonly pages: number;
}

/** Jetons rendus par le Worker, déjà validés. `expiresIn` en secondes. */
export interface RavelryTokens {
  readonly accessToken: string;
  /** Absent d'un renouvellement qui ne change pas de jeton de rafraîchissement. */
  readonly refreshToken: string | null;
  readonly expiresIn: number;
}

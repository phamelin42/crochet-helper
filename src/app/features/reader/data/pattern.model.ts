/** Une étape de travail : un rang, un tour, ou une consigne de répétition. */
export interface PatternStep {
  /** Libellé normalisé (« Rang 3 », « Round 5–8 »), vide pour une consigne libre. */
  readonly label: string;
  /** Texte de l'étape, affiché en grand dans le lecteur. */
  readonly body: string;
  /** Notes rattachées à l'étape (lignes libres qui la précèdent). */
  readonly notes: readonly string[];
  /** Lignes libres qui suivent la dernière étape d'une pièce. */
  readonly after?: readonly string[];
  /** Nombre de répétitions attendu, déduit du libellé ou du corps ; 0 si inconnu. */
  readonly reps: number;
}

/** Un élément à réaliser (le corps, une oreille, une manche…). */
export interface PatternPiece {
  readonly name: string;
  readonly steps: readonly PatternStep[];
}

/** Résultat du découpage d'un tutoriel brut. */
export interface Pattern {
  readonly title: string;
  readonly materials: readonly string[];
  readonly pieces: readonly PatternPiece[];
  /** Somme des étapes de toutes les pièces. */
  readonly total: number;
}

export const EMPTY_PATTERN: Pattern = { title: '', materials: [], pieces: [], total: 0 };

import { Locale } from '../../../../core/i18n/locale';

/** Article long d'une page d'abréviation, écrit à la main dans chaque langue. */
export interface TermArticle {
  /** « Comment faire » : les gestes, une phrase par paragraphe. */
  readonly how: readonly string[];
  /** Le rang d'exemple de l'entrée, expliqué mot à mot. */
  readonly inPattern: string;
  /** Ce que vaut l'abréviation dans l'autre convention, ou « identique ». */
  readonly usUk: string;
  /** Erreurs fréquentes et comment les repérer. */
  readonly mistakes: readonly string[];
  /** Un conseil pour lire à distance : compter, marqueur, repère. */
  readonly tip: string;
}

export type TermArticles = Readonly<Record<string, Readonly<Record<Locale, TermArticle>>>>;

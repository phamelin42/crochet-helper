/**
 * Événements mesurés — les mêmes noms dans les dix produits, pour que les
 * rapports se comparent d'un produit à l'autre. Chaque nom est aussi déclaré
 * dans `EVENEMENTS` (`tools/umami.mjs`) : `tools/evenements.test.mjs` vérifie
 * que les deux listes concordent. Le tunnel qui les relie est dans
 * `docs/tunnel.md`.
 */
export const EVENEMENTS = [
  /** Première interaction avec la fonction principale (champ rempli, modèle choisi). */
  'outil_commence',
  /** Résultat obtenu : le document, le calcul ou le planning est complet. */
  'outil_termine',
  /** Export ou impression (propriété `format` : pdf, ical, csv, impression). */
  'export_fait',
  /** Données retrouvées à l'ouverture (travail enregistré lors d'une visite précédente). */
  'donnees_reprises',
  /** Bloc de l'offre complète affiché à l'écran, une fois par visite. */
  'offre_vue',
  /** Clic sur « être prévenu » de l'offre complète. */
  'offre_cliquee',
  /** Invite d'installation native affichée (propriété `mode`). */
  'installation_proposee',
  /** Application installée, événement `appinstalled`. */
  'app_installee',
  /** Visite dont la première visite locale date de 1 jour. */
  'retour_1j',
  /** … de 2 à 7 jours. */
  'retour_2_7j',
  /** … de 8 à 30 jours. */
  'retour_8_30j',
  /** … de plus de 30 jours. */
  'retour_31j',
] as const;

export type AnalyticsEvent = (typeof EVENEMENTS)[number];

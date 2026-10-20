export type ProjectType = 'hat' | 'scarf' | 'afghan' | 'sweater' | 'mittens' | 'socks';

/** Une ligne : un ouvrage dans une catégorie de poids de fil, en yards comme la source. */
export interface YardageEstimate {
  readonly project: ProjectType;
  /** Catégorie de poids du Craft Yarn Council, présente dans `YARN_WEIGHTS`. */
  readonly category: number;
  readonly minYards: number;
  readonly maxYards: number;
  readonly source: string;
}

export const METRES_PER_YARD = 0.9144;

/**
 * Source de chaque ligne : les tableaux « How Much Yarn Do I Need? » d'AllFreeKnitting
 * (Toby Kuhnke, rédactrice ; Prime Publishing),
 * https://www.allfreeknitting.com/Knitting-Tutorials/How-Much-Yarn-Do-I-Need-Knitting
 * consultés le 20 octobre 2026. Le site donne ces plages pour des ouvrages adultes
 * « en général » ; il ne cite pas de tiers. Les plages sont reportées telles quelles.
 * Absentes volontairement, faute de valeur fiable : le plaid en catégorie 5 (la
 * source écrit « 1 500 à 750 yards », bornes inversées), les moufles et chaussettes
 * dans les catégories où la source n'a pas de ligne, et le châle (aucun tableau par
 * poids, seulement une fourchette unique ailleurs).
 */
const AFK = 'AllFreeKnitting, « How Much Yarn Do I Need? »';

const row = (
  project: ProjectType,
  category: number,
  minYards: number,
  maxYards: number,
): YardageEstimate => ({ project, category, minYards, maxYards, source: AFK });

export const YARDAGE_ESTIMATES: readonly YardageEstimate[] = [
  row('hat', 0, 350, 400),
  row('hat', 1, 300, 375),
  row('hat', 2, 250, 350),
  row('hat', 3, 200, 300),
  row('hat', 4, 150, 250),
  row('hat', 5, 125, 200),
  row('hat', 6, 75, 125),

  row('scarf', 0, 350, 850),
  row('scarf', 1, 300, 800),
  row('scarf', 2, 250, 750),
  row('scarf', 3, 200, 600),
  row('scarf', 4, 150, 550),
  row('scarf', 5, 100, 500),
  row('scarf', 6, 50, 450),

  row('afghan', 0, 3500, 3750),
  row('afghan', 1, 3000, 3500),
  row('afghan', 2, 2500, 3000),
  row('afghan', 3, 2000, 2500),
  row('afghan', 4, 1500, 2000),
  row('afghan', 6, 500, 1000),

  row('sweater', 0, 2000, 4000),
  row('sweater', 1, 1500, 3500),
  row('sweater', 2, 1250, 3000),
  row('sweater', 3, 1000, 2500),
  row('sweater', 4, 800, 2000),
  row('sweater', 5, 750, 1500),
  row('sweater', 6, 500, 1000),

  row('mittens', 0, 200, 350),
  row('mittens', 1, 150, 300),
  row('mittens', 2, 100, 250),
  row('mittens', 3, 75, 200),
  row('mittens', 4, 50, 150),

  row('socks', 0, 400, 500),
  row('socks', 1, 350, 450),
  row('socks', 2, 300, 400),
  row('socks', 3, 250, 350),
  row('socks', 4, 200, 300),
];

export interface YardageResult {
  readonly minMetres: number;
  readonly maxMetres: number;
  readonly minSkeins: number;
  readonly maxSkeins: number;
}

/** Catégories pour lesquelles la table a une ligne pour cet ouvrage. */
export function categoriesFor(project: ProjectType): number[] {
  return YARDAGE_ESTIMATES.filter((e) => e.project === project).map((e) => e.category);
}

/**
 * Fourchette de mètres et de pelotes (arrondies au supérieur) pour un ouvrage.
 * `null` si la combinaison n'a pas de source ou si le métrage de la pelote est
 * absent, nul, négatif ou non numérique.
 */
export function estimateYardage(
  project: ProjectType,
  category: number,
  skeinMetres: number,
): YardageResult | null {
  if (!Number.isFinite(skeinMetres) || skeinMetres <= 0) return null;
  const entry = YARDAGE_ESTIMATES.find((e) => e.project === project && e.category === category);
  if (!entry) return null;
  const minMetres = Math.round(entry.minYards * METRES_PER_YARD);
  const maxMetres = Math.round(entry.maxYards * METRES_PER_YARD);
  return {
    minMetres,
    maxMetres,
    minSkeins: Math.ceil(minMetres / skeinMetres),
    maxSkeins: Math.ceil(maxMetres / skeinMetres),
  };
}

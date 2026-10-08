/** Une catégorie de poids de fil, telle que le Craft Yarn Council la numérote. */
export interface YarnWeight {
  readonly category: number; // 0 à 7
  readonly us: readonly string[]; // noms employés dans les patrons américains
  /** Équivalent britannique, seulement quand le tableau de la source le nomme. */
  readonly uk: string | null;
  /** Plage de crochets, en mm ; `max` vide pour « et plus ». */
  readonly hookMm: { readonly min: number; readonly max: number | null };
  /** Plage d'aiguilles à tricoter, en mm ; `max` vide pour « et plus ». */
  readonly needleMm: { readonly min: number; readonly max: number | null };
  readonly source: string;
}

/**
 * Source de chaque ligne : tableau « Standard Yarn Weight System » du Craft Yarn
 * Council (craftyarncouncil.com, « Standards & Guidelines »), colonnes
 * « Types of yarns in category », « Recommended hook » et « Recommended needle ».
 * Les équivalents britanniques ne sont reportés que lorsque la source nomme le
 * fil lui-même (DK, Aran, Chunky) ; les autres, comme les noms français
 * (« n° 4 »), n'ont pas de source vérifiable et restent vides.
 */
const CYC = 'Craft Yarn Council, Standard Yarn Weight System';

export const YARN_WEIGHTS: readonly YarnWeight[] = [
  {
    category: 0,
    us: ['Lace', 'Fingering', '10-count crochet thread'],
    uk: null,
    hookMm: { min: 1.6, max: 2.25 },
    needleMm: { min: 1.5, max: 2.25 },
    source: CYC,
  },
  {
    category: 1,
    us: ['Super Fine', 'Sock', 'Fingering', 'Baby'],
    uk: null,
    hookMm: { min: 2.25, max: 3.5 },
    needleMm: { min: 2.25, max: 3.25 },
    source: CYC,
  },
  {
    category: 2,
    us: ['Fine', 'Sport', 'Baby'],
    uk: null,
    hookMm: { min: 3.5, max: 4.5 },
    needleMm: { min: 3.25, max: 3.75 },
    source: CYC,
  },
  {
    category: 3,
    us: ['Light', 'DK', 'Light Worsted'],
    uk: 'DK',
    hookMm: { min: 4.5, max: 5.5 },
    needleMm: { min: 3.75, max: 4.5 },
    source: CYC,
  },
  {
    category: 4,
    us: ['Medium', 'Worsted', 'Afghan', 'Aran'],
    uk: 'Aran',
    hookMm: { min: 5.5, max: 6.5 },
    needleMm: { min: 4.5, max: 5.5 },
    source: CYC,
  },
  {
    category: 5,
    us: ['Bulky', 'Chunky', 'Craft', 'Rug'],
    uk: 'Chunky',
    hookMm: { min: 6.5, max: 9 },
    needleMm: { min: 5.5, max: 8 },
    source: CYC,
  },
  {
    category: 6,
    us: ['Super Bulky', 'Super Chunky', 'Roving'],
    uk: null,
    hookMm: { min: 9, max: 15 },
    needleMm: { min: 8, max: 12.75 },
    source: CYC,
  },
  {
    category: 7,
    us: ['Jumbo', 'Roving'],
    uk: null,
    hookMm: { min: 15, max: null },
    needleMm: { min: 12.75, max: null },
    source: CYC,
  },
];

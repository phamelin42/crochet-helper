import { Locale } from '../../../core/i18n/locale';

/**
 * Un symbole standard de diagramme de crochet (norme du Craft Yarn Council).
 * Le dessin vit dans `public/symbols/<id>.svg` ; `tools/check-symbols.mjs`
 * vérifie au build que chaque identifiant a son fichier, et que rien d'autre
 * ne traîne dans le dossier.
 */
export interface ChartSymbol {
  readonly id: string;
  /** Abréviation dans un patron américain, britannique, français. */
  readonly us: string;
  readonly uk: string;
  readonly fr: string;
  readonly nameFr: string;
  readonly nameEn: string;
}

export const CHART_SYMBOLS: readonly ChartSymbol[] = [
  { id: 'ch', us: 'ch', uk: 'ch', fr: 'ml', nameFr: 'maille en l’air', nameEn: 'chain' },
  { id: 'sl-st', us: 'sl st', uk: 'ss', fr: 'mc', nameFr: 'maille coulée', nameEn: 'slip stitch' },
  {
    id: 'sc',
    us: 'sc',
    uk: 'dc',
    fr: 'ms',
    nameFr: 'maille serrée',
    nameEn: 'single crochet (UK double crochet)',
  },
  {
    id: 'hdc',
    us: 'hdc',
    uk: 'htr',
    fr: 'db',
    nameFr: 'demi-bride',
    nameEn: 'half double crochet (UK half treble)',
  },
  {
    id: 'dc',
    us: 'dc',
    uk: 'tr',
    fr: 'br',
    nameFr: 'bride',
    nameEn: 'double crochet (UK treble)',
  },
  {
    id: 'tr',
    us: 'tr',
    uk: 'dtr',
    fr: 'dbr',
    nameFr: 'double bride',
    nameEn: 'treble crochet (UK double treble)',
  },
  {
    id: 'dtr',
    us: 'dtr',
    uk: 'trtr',
    fr: 'tbr',
    nameFr: 'triple bride',
    nameEn: 'double treble crochet (UK triple treble)',
  },
  {
    id: 'magic-ring',
    us: 'mr',
    uk: 'mr',
    fr: 'cercle magique',
    nameFr: 'cercle magique',
    nameEn: 'magic ring',
  },
  {
    id: 'ch-space',
    us: 'ch-sp',
    uk: 'ch sp',
    fr: 'arceau',
    nameFr: 'arceau de mailles en l’air',
    nameEn: 'chain space',
  },
  {
    id: 'sc-inc',
    us: 'sc inc',
    uk: 'dc inc',
    fr: 'aug ms',
    nameFr: 'augmentation de maille serrée',
    nameEn: 'single crochet increase',
  },
  {
    id: 'dc-inc',
    us: 'dc inc',
    uk: 'tr inc',
    fr: 'aug br',
    nameFr: 'augmentation de bride',
    nameEn: 'double crochet increase',
  },
  {
    id: 'sc2tog',
    us: 'sc2tog',
    uk: 'dc2tog',
    fr: 'dim ms',
    nameFr: 'diminution de maille serrée',
    nameEn: 'single crochet 2 together',
  },
  {
    id: 'dc2tog',
    us: 'dc2tog',
    uk: 'tr2tog',
    fr: 'dim br',
    nameFr: 'diminution de bride',
    nameEn: 'double crochet 2 together',
  },
  {
    id: 'dc3tog',
    us: 'dc3tog',
    uk: 'tr3tog',
    fr: 'dim 3 br',
    nameFr: 'diminution de trois brides',
    nameEn: 'double crochet 3 together',
  },
  {
    id: 'sc3tog',
    us: 'sc3tog',
    uk: 'dc3tog',
    fr: 'dim 3 ms',
    nameFr: 'diminution de trois mailles serrées',
    nameEn: 'single crochet 3 together',
  },
  { id: 'picot', us: 'picot', uk: 'picot', fr: 'picot', nameFr: 'picot', nameEn: 'picot' },
  {
    id: 'fpdc',
    us: 'fpdc',
    uk: 'fptr',
    fr: 'br relief end.',
    nameFr: 'bride en relief endroit',
    nameEn: 'front post double crochet',
  },
  {
    id: 'bpdc',
    us: 'bpdc',
    uk: 'bptr',
    fr: 'br relief env.',
    nameFr: 'bride en relief envers',
    nameEn: 'back post double crochet',
  },
  {
    id: 'fphdc',
    us: 'fphdc',
    uk: 'fphtr',
    fr: 'db relief end.',
    nameFr: 'demi-bride en relief avant',
    nameEn: 'front post half double crochet',
  },
  {
    id: 'bphdc',
    us: 'bphdc',
    uk: 'bphtr',
    fr: 'db relief env.',
    nameFr: 'demi-bride en relief arrière',
    nameEn: 'back post half double crochet',
  },
  {
    id: 'blo',
    us: 'blo',
    uk: 'blo',
    fr: 'blo',
    nameFr: 'dans le brin arrière uniquement',
    nameEn: 'back loop only',
  },
  {
    id: 'flo',
    us: 'flo',
    uk: 'flo',
    fr: 'flo',
    nameFr: 'dans le brin avant uniquement',
    nameEn: 'front loop only',
  },
  {
    id: 'cluster',
    us: 'cl',
    uk: 'cl',
    fr: 'bouquet',
    nameFr: 'bouquet de brides',
    nameEn: 'cluster',
  },
  {
    id: 'hdc-cluster',
    us: 'hdc cl',
    uk: 'htr cl',
    fr: 'bouquet db',
    nameFr: 'trois demi-brides dans la même maille rabattues ensemble',
    nameEn: '3 half double crochet cluster',
  },
  { id: 'puff', us: 'puff', uk: 'puff', fr: 'puff', nameFr: 'point bulle', nameEn: 'puff stitch' },
  {
    id: 'popcorn',
    us: 'pc',
    uk: 'pc',
    fr: 'pop-corn',
    nameFr: 'pop-corn',
    nameEn: 'popcorn stitch',
  },
  { id: 'shell', us: 'shell', uk: 'shell', fr: 'coquille', nameFr: 'coquille', nameEn: 'shell' },
  {
    id: 'v-stitch',
    us: 'v-st',
    uk: 'v-st',
    fr: 'point v',
    nameFr: 'point V — bride, maille en l’air, bride dans la même maille',
    nameEn: 'V-stitch — dc, ch 1, dc in the same stitch',
  },
  {
    id: 'crossed-dc',
    us: 'crossed dc',
    uk: 'crossed tr',
    fr: 'br croisées',
    nameFr: 'deux brides croisées',
    nameEn: '2 crossed double crochets',
  },
];

/** Adresse du dessin d'un symbole, servie telle quelle depuis `public/`. */
export function symbolUrl(id: string): string {
  return `/symbols/${id}.svg`;
}

/**
 * Abréviation dans la convention de la page : le français sur une page
 * française, l'américaine sur une page anglaise.
 */
export function symbolAbbreviation(symbol: ChartSymbol, locale: Locale): string {
  return locale === 'fr' ? symbol.fr : symbol.us;
}

export function symbolName(symbol: ChartSymbol, locale: Locale): string {
  return locale === 'fr' ? symbol.nameFr : symbol.nameEn;
}

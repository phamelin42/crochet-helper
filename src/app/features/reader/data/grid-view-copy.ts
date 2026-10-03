import { Locale } from '../../../core/i18n/locale';

/** Textes de la grille de couleurs : avec elle, hors du dictionnaire du bundle initial. */
const FR = {
  row: 'Rang',
  stitch: 'maille',
  of: 'sur',
  colour: 'couleur',
  frame: 'Grille de couleurs, défilable',
  controls: 'Commandes de la grille',
  zoomOut: 'Réduire',
  zoomIn: 'Agrandir',
  fit: 'Taille réelle',
  prev: 'Maille précédente',
  next: 'Maille suivante',
  nextRow: 'Rang suivant',
  more: 'encore',
  in: 'en',
  then: 'puis',
  toEnd: 'jusqu’au bout du rang en',
  rowDone: 'rang terminé',
  legend: 'Couleurs',
  stitches: 'mailles',
};

const EN: typeof FR = {
  row: 'Row',
  stitch: 'stitch',
  of: 'of',
  colour: 'colour',
  frame: 'Colour grid, scrollable',
  controls: 'Grid controls',
  zoomOut: 'Zoom out',
  zoomIn: 'Zoom in',
  fit: 'Actual size',
  prev: 'Previous stitch',
  next: 'Next stitch',
  nextRow: 'Next row',
  more: 'another',
  in: 'in',
  then: 'then',
  toEnd: 'to the end of the row in',
  rowDone: 'row finished',
  legend: 'Colours',
  stitches: 'stitches',
};

export type GridViewKey = keyof typeof FR;

export const GRID_VIEW_COPY: Record<Locale, Record<GridViewKey, string>> = { fr: FR, en: EN };

import { Locale } from '../../../core/i18n/locale';

/**
 * Textes de l'affichage diagramme : avec lui, hors de `reader-copy.ts` que le
 * dictionnaire global embarque dans le bundle initial.
 */
const FR = {
  round: 'Tour',
  row: 'Rang',
  stitch: 'maille',
  of: 'sur',
  notDrawn: 'cette étape ne se dessine pas',
  frame: 'Diagramme de la pièce, défilable',
  controls: 'Commandes du diagramme',
  zoomOut: 'Réduire',
  zoomIn: 'Agrandir',
  fit: 'Taille réelle',
  prev: 'Maille précédente',
  next: 'Maille suivante',
};

const EN: typeof FR = {
  round: 'Round',
  row: 'Row',
  stitch: 'stitch',
  of: 'of',
  notDrawn: 'this step is not drawn',
  frame: 'Chart of the piece, scrollable',
  controls: 'Chart controls',
  zoomOut: 'Zoom out',
  zoomIn: 'Zoom in',
  fit: 'Actual size',
  prev: 'Previous stitch',
  next: 'Next stitch',
};

export type ChartViewKey = keyof typeof FR;

export const CHART_VIEW_COPY: Record<Locale, Record<ChartViewKey, string>> = { fr: FR, en: EN };

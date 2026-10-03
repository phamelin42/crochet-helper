import { Locale } from '../../../core/i18n/locale';

/**
 * Textes du dialogue « image en grille » : avec lui, chargés à la demande,
 * hors de `reader-copy.ts` que le bundle initial embarque.
 */
const FR = {
  title: 'Transformer l’image en grille',
  square:
    'Une maille serrée est à peu près carrée : la grille garde les proportions de l’image. Tout se calcule sur cet appareil.',
  width: 'Largeur en mailles',
  colors: 'Nombre de couleurs',
  less: 'Moins',
  more: 'Plus',
  worked: 'Travail',
  flat: 'À plat',
  round: 'En rond',
  preview: 'Aperçu de la grille',
  computing: 'Calcul de l’aperçu…',
  summary: '{w} × {h} mailles, {c} couleurs, {n} mailles',
  create: 'Créer la grille',
  cancel: 'Annuler',
  notSaved: 'La grille n’a pas pu être enregistrée : la mémoire de l’appareil est pleine.',
};

const EN: typeof FR = {
  title: 'Turn the picture into a grid',
  square:
    'A single crochet stitch is roughly square: the grid keeps the picture’s proportions. Everything is worked out on this device.',
  width: 'Width in stitches',
  colors: 'Number of colours',
  less: 'Less',
  more: 'More',
  worked: 'Worked',
  flat: 'Flat',
  round: 'In the round',
  preview: 'Grid preview',
  computing: 'Working out the preview…',
  summary: '{w} × {h} stitches, {c} colours, {n} stitches',
  create: 'Create the grid',
  cancel: 'Cancel',
  notSaved: 'The grid couldn’t be saved: the device storage is full.',
};

export type ImageGridKey = keyof typeof FR;

export const IMAGE_GRID_COPY: Record<Locale, Record<ImageGridKey, string>> = { fr: FR, en: EN };

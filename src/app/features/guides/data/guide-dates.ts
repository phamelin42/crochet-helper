import { Locale } from '../../../core/i18n/locale';

export type GuideRoute =
  'guideReadingPattern' | 'guideReadingChart' | 'guideCrochetOrKnitting' | 'readForeignPattern';

/**
 * Dates de publication et de dernière modification du **contenu** de chaque
 * guide, relevées dans l'historique Git (un lien ajouté vers une autre page
 * ne compte pas, un tableau ajouté au texte si). Affichées sous le titre et
 * reprises dans l'`Article` schema.org.
 *
 * À tenir à jour à la main : changer le texte d'un guide, c'est changer son
 * `modified` dans le même commit.
 */
export const GUIDE_DATES: Record<
  GuideRoute,
  { readonly published: string; readonly modified: string }
> = {
  guideReadingPattern: { published: '2026-09-22', modified: '2026-09-22' },
  // Tableau des symboles standard ajouté le 28 (fiche 35, PR #70).
  guideReadingChart: { published: '2026-09-22', modified: '2026-09-28' },
  guideCrochetOrKnitting: { published: '2026-09-22', modified: '2026-09-22' },
  readForeignPattern: { published: '2026-09-29', modified: '2026-09-29' },
};

const LABELS: Record<Locale, { published: string; modified: string }> = {
  fr: { published: 'Publié le', modified: 'mis à jour le' },
  en: { published: 'Published', modified: 'updated' },
};

/** « Publié le 22 septembre 2026 · mis à jour le 28 septembre 2026 ». */
export function guideDatesLine(route: GuideRoute, locale: Locale): string {
  const { published, modified } = GUIDE_DATES[route];
  const format = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    dateStyle: 'long',
    timeZone: 'UTC',
  });
  const day = (iso: string) => format.format(new Date(`${iso}T00:00:00Z`));
  const l = LABELS[locale];
  return published === modified
    ? `${l.published} ${day(published)}`
    : `${l.published} ${day(published)} · ${l.modified} ${day(modified)}`;
}

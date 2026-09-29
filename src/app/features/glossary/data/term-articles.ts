import { Locale } from '../../../core/i18n/locale';
import { COUNTING } from './articles/counting';
import { DC_HDC } from './articles/dc-hdc';
import { FRENCH_SHAPING } from './articles/french-shaping';
import { FRENCH_STITCHES } from './articles/french-stitches';
import { GESTURES } from './articles/gestures';
import { HEIGHTS } from './articles/heights';
import { TR_CH_SLST } from './articles/tr-ch-slst';
import { TermArticle, TermArticles } from './articles/types';

export type { TermArticle } from './articles/types';

/**
 * Articles longs des vingt abréviations les plus cherchées, par slug puis par
 * langue. Importé par la seule page d'abréviation, elle-même paresseuse : ces
 * quelque vingt mille mots n'entrent pas dans le bundle initial.
 */
export const TERM_ARTICLES: TermArticles = {
  ...FRENCH_STITCHES,
  ...FRENCH_SHAPING,
  ...HEIGHTS,
  ...DC_HDC,
  ...TR_CH_SLST,
  ...COUNTING,
  ...GESTURES,
};

export function articleOf(slug: string, locale: Locale): TermArticle | undefined {
  return TERM_ARTICLES[slug]?.[locale];
}

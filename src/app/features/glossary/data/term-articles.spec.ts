import { describe, expect, it } from 'vitest';
import { Locale } from '../../../core/i18n/locale';
import { GLOSSARY } from '../../reader/data/glossary';
import { TERM_ARTICLES, TermArticle } from './term-articles';

/** Les sept entrées françaises du glossaire, puis les treize anglaises les plus cherchées. */
const SLUGS = [
  'ms',
  'db',
  'mc',
  'ml',
  'aug',
  'dim',
  'mr',
  'sc',
  'dc',
  'hdc',
  'tr',
  'ch',
  'sl-st',
  'st',
  'inc',
  'dec',
  'sk',
  'yo',
  'rep',
  'blo',
];
const LOCALES: readonly Locale[] = ['fr', 'en'];

const wordsOf = (article: TermArticle): number =>
  [...article.how, article.inPattern, article.usUk, ...article.mistakes, article.tip]
    .join(' ')
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

describe('TERM_ARTICLES', () => {
  it('couvre les sept entrées françaises du glossaire', () => {
    const french = GLOSSARY.filter((e) => e.lang === 'fr').map((e) => e.slug);
    expect(french).toHaveLength(7);
    for (const slug of french) expect(SLUGS, slug).toContain(slug);
  });

  for (const slug of SLUGS) {
    for (const locale of LOCALES) {
      describe(`${slug} (${locale})`, () => {
        const article = TERM_ARTICLES[slug]?.[locale];

        it('existe', () => {
          expect(article).toBeDefined();
        });

        it('compte entre 400 et 600 mots', () => {
          expect(wordsOf(article!)).toBeGreaterThanOrEqual(400);
          expect(wordsOf(article!)).toBeLessThanOrEqual(600);
        });

        it('donne au moins deux gestes et une erreur', () => {
          expect(article!.how.length).toBeGreaterThanOrEqual(2);
          expect(article!.mistakes.length).toBeGreaterThanOrEqual(1);
          expect(article!.inPattern).not.toBe('');
          expect(article!.usUk).not.toBe('');
          expect(article!.tip).not.toBe('');
        });
      });
    }
  }

  it('ne contient aucun slug absent du glossaire', () => {
    const known = new Set(GLOSSARY.map((e) => e.slug));
    for (const slug of Object.keys(TERM_ARTICLES)) expect(known.has(slug), slug).toBe(true);
  });

  it('ne contient que les vingt slugs prévus', () => {
    expect(Object.keys(TERM_ARTICLES).sort()).toEqual([...SLUGS].sort());
  });
});

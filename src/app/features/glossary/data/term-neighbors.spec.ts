import { describe, expect, it } from 'vitest';
import { LOCALES } from '../../../core/i18n/locale';
import { GLOSSARY, GlossaryEntry, pageEntryOf } from '../../reader/data/glossary';
import { headOf, neighborsOf } from './term-neighbors';

const entry = (term: string): GlossaryEntry => GLOSSARY.find((e) => e.term === term)!;
const terms = (entries: readonly GlossaryEntry[]) => entries.map((e) => e.term);

describe('neighborsOf', () => {
  it('propose l’autre notation du même point', () => {
    expect(terms(neighborsOf(entry('ms'), 'fr').synonyms)).toEqual(['sc']);
    expect(terms(neighborsOf(entry('sl st'), 'en').synonyms)).toEqual(['mc', 'ss']);
  });

  it('nomme sans lien les graphies que la page sert elle-même', () => {
    expect(terms(neighborsOf(entry('magic ring'), 'en').variants)).toEqual([
      'cercle magique',
      'mr',
      'magic loop',
    ]);
    expect(terms(neighborsOf(entry('cercle magique'), 'fr').variants)).toEqual([
      'magic ring',
      'mr',
      'magic loop',
    ]);
    expect(terms(neighborsOf(entry('sl st'), 'fr').variants)).toEqual(['slst']);
    expect(neighborsOf(entry('magic ring'), 'en').synonyms).toEqual([]);
  });

  for (const locale of LOCALES) {
    const pages = GLOSSARY.filter((e) => pageEntryOf(e, locale) === e);

    it(`ne lie jamais vers une redirection, ni vers soi, ni deux fois (${locale})`, () => {
      for (const current of pages) {
        const { synonyms, related } = neighborsOf(current, locale);
        const all = [...synonyms, ...related];
        expect(all).not.toContain(current);
        expect(new Set(all).size).toBe(all.length);
        for (const other of all) expect(pageEntryOf(other, locale)).toBe(other);
      }
    });

    it(`ne montre jamais deux termes proches de même définition (${locale})`, () => {
      for (const current of pages) {
        const meanings = neighborsOf(current, locale).related.map((e) => headOf(e.fr));
        expect(new Set(meanings).size).toBe(meanings.length);
        expect(meanings).not.toContain(headOf(current.fr));
      }
    });

    it(`reste dans le même métier pour les termes proches (${locale})`, () => {
      for (const current of pages) {
        for (const other of neighborsOf(current, locale).related) {
          expect(other.craft).toBe(current.craft);
        }
      }
    });

    it(`fait recevoir au moins un lien à chaque page d’abréviation (${locale})`, () => {
      const linked = new Set(
        pages.flatMap((current) => {
          const { synonyms, related } = neighborsOf(current, locale);
          return [...synonyms, ...related];
        }),
      );
      expect(pages.filter((e) => !linked.has(e))).toEqual([]);
    });
  }
});

describe('headOf', () => {
  it('garde la définition sans sa glose', () => {
    expect(headOf('augmentation — 2 mailles dans la même maille')).toBe('augmentation');
    expect(headOf('maille serrée')).toBe('maille serrée');
  });
});

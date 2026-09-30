import { describe, expect, it } from 'vitest';
import { GLOSSARY } from '../../reader/data/glossary';
import { NO_FILTERS, groupGlossary, letterAnchor } from './glossary-groups';

const flat = (groups: ReturnType<typeof groupGlossary>) => groups.flatMap((g) => g.entries);

describe('groupGlossary', () => {
  it('garde toutes les entrées, sans filtre', () => {
    expect(flat(groupGlossary(GLOSSARY)).length).toBe(GLOSSARY.length);
  });

  it('trie toutes les entrées : chacune précède ou égale la suivante', () => {
    const terms = flat(groupGlossary(GLOSSARY)).map((e) => e.term);
    for (let i = 0; i < terms.length - 1; i++) {
      expect(
        terms[i].localeCompare(terms[i + 1], 'en', { sensitivity: 'base' }),
        `${terms[i]} avant ${terms[i + 1]}`,
      ).toBeLessThanOrEqual(0);
    }
  });

  it('range chaque terme sous sa première lettre, et liste exactement les lettres présentes', () => {
    const groups = groupGlossary(GLOSSARY);
    for (const group of groups) {
      for (const entry of group.entries) {
        expect(entry.term.charAt(0).toUpperCase()).toBe(group.letter);
      }
    }
    const attendues = [...new Set(GLOSSARY.map((e) => e.term.charAt(0).toUpperCase()))].sort();
    expect(groups.map((g) => g.letter)).toEqual(attendues);
  });

  it('ne garde que les lettres présentes après filtrage', () => {
    const groups = groupGlossary(GLOSSARY, { ...NO_FILTERS, query: 'k2tog' });
    expect(groups.map((g) => g.letter)).toEqual(['K']);
  });

  it('crochet : exclut le tricot, garde « commun »', () => {
    const entries = flat(groupGlossary(GLOSSARY, { ...NO_FILTERS, craft: 'crochet' }));
    expect(entries.some((e) => e.craft === 'tricot')).toBe(false);
    expect(entries.some((e) => e.craft === 'commun')).toBe(true);
    expect(entries.length).toBe(GLOSSARY.filter((e) => e.craft !== 'tricot').length);
  });

  it('tricot : exclut le crochet, garde « commun »', () => {
    const entries = flat(groupGlossary(GLOSSARY, { ...NO_FILTERS, craft: 'tricot' }));
    expect(entries.some((e) => e.craft === 'crochet')).toBe(false);
    expect(entries.some((e) => e.craft === 'commun')).toBe(true);
  });

  it('combine technique, langue du patron et recherche', () => {
    for (const craft of ['crochet', 'tricot'] as const) {
      for (const lang of ['fr', 'en'] as const) {
        const entries = flat(groupGlossary(GLOSSARY, { craft, lang, query: '' }));
        const attendu = GLOSSARY.filter(
          (e) => e.lang === lang && (e.craft === 'commun' || e.craft === craft),
        );
        expect(entries.length).toBe(attendu.length);
        for (const e of entries) expect(e.lang).toBe(lang);
      }
    }
    const ms = flat(groupGlossary(GLOSSARY, { craft: 'crochet', lang: 'fr', query: 'ms' }));
    expect(ms.length).toBeGreaterThan(0);
    for (const e of ms) {
      expect(`${e.term} ${e.fr} ${e.en}`.toLowerCase()).toContain('ms');
      expect(e.lang).toBe('fr');
    }
  });

  it('donne une ancre sans majuscule', () => {
    expect(letterAnchor('A')).toBe('lettre-a');
  });
});

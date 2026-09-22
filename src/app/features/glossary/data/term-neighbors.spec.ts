import { describe, expect, it } from 'vitest';
import { GLOSSARY, GlossaryEntry } from '../../reader/data/glossary';
import { headOf, neighborsOf } from './term-neighbors';

const entry = (term: string): GlossaryEntry => GLOSSARY.find((e) => e.term === term)!;
const terms = (entries: readonly GlossaryEntry[]) => entries.map((e) => e.term);

describe('neighborsOf', () => {
  it('propose l’autre notation du même point', () => {
    expect(terms(neighborsOf(entry('ms')).synonyms)).toEqual(['sc']);
    expect(terms(neighborsOf(entry('mr')).synonyms)).toEqual(['magic ring', 'cercle magique']);
  });

  it('ne se propose jamais lui-même, ni deux fois le même terme', () => {
    for (const current of GLOSSARY) {
      const { synonyms, related } = neighborsOf(current);
      const all = [...synonyms, ...related];
      expect(all).not.toContain(current);
      expect(new Set(all).size).toBe(all.length);
    }
  });

  it('ne montre jamais deux termes proches de même définition', () => {
    for (const current of GLOSSARY) {
      const meanings = neighborsOf(current).related.map((e) => headOf(e.fr));
      expect(new Set(meanings).size).toBe(meanings.length);
      expect(meanings).not.toContain(headOf(current.fr));
    }
  });

  it('reste dans le même métier pour les termes proches', () => {
    for (const current of GLOSSARY) {
      for (const other of neighborsOf(current).related) expect(other.craft).toBe(current.craft);
    }
  });

  it('fait recevoir au moins un lien à chaque abréviation', () => {
    const linked = new Set(
      GLOSSARY.flatMap((current) => {
        const { synonyms, related } = neighborsOf(current);
        return [...synonyms, ...related];
      }),
    );
    expect(GLOSSARY.filter((e) => !linked.has(e))).toEqual([]);
  });
});

describe('headOf', () => {
  it('garde la définition sans sa glose', () => {
    expect(headOf('augmentation — 2 mailles dans la même maille')).toBe('augmentation');
    expect(headOf('maille serrée')).toBe('maille serrée');
  });
});

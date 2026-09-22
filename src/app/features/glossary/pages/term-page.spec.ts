import { describe, expect, it } from 'vitest';
import { GLOSSARY, GlossaryEntry } from '../../reader/data/glossary';
import { regionNoteOf, titleOf } from './term-page';

const entry = (term: string): GlossaryEntry => GLOSSARY.find((e) => e.term === term)!;

describe('titleOf', () => {
  it('annonce le même métier que la question de la page', () => {
    expect(titleOf(entry('sc'), 'en')).toBe(
      'What does \u201Csc\u201D mean in crochet? Single crochet \u2014 Pattern Reader',
    );
    expect(titleOf(entry('k2tog'), 'en')).toBe(
      'What does \u201Ck2tog\u201D mean in knitting? Knit 2 together \u2014 Pattern Reader',
    );
    // Le piège : un terme des deux métiers ne doit pas se dire « crochet » seul.
    expect(titleOf(entry('inc'), 'en')).toBe(
      'What does \u201Cinc\u201D mean in crochet and knitting? Increase \u2014 Pattern Reader',
    );
    expect(titleOf(entry('inc'), 'fr')).toBe(
      'Que veut dire \u00AB\u00A0inc\u00A0\u00BB au crochet et au tricot\u00A0? Augmentation \u2014 Pattern Reader',
    );
  });

  it('ne garde que la tête de la définition, glose exclue', () => {
    expect(titleOf(entry('dim'), 'fr')).toContain('Diminution \u2014 Pattern Reader');
  });
});

describe('regionNoteOf', () => {
  it('prévient que le britannique emploie ces lettres pour une autre maille', () => {
    expect(regionNoteOf(entry('dc'), 'en')).toEqual({
      note: 'In a British pattern, \u201Cdc\u201D means single crochet.',
      other: entry('sc'),
    });
    expect(regionNoteOf(entry('dc'), 'fr')?.note).toBe(
      'Dans un patron britannique, \u00AB\u00A0dc\u00A0\u00BB d\u00E9signe la maille serr\u00E9e.',
    );
    expect(regionNoteOf(entry('dtr'), 'en')?.other.term).toBe('tr');
  });

  it('donne l’équivalent britannique d’un terme américain', () => {
    expect(regionNoteOf(entry('hdc'), 'en')?.note).toBe(
      'A British pattern writes \u201Chtr\u201D for this stitch.',
    );
  });

  it('présente un terme britannique par son équivalent américain', () => {
    expect(regionNoteOf(entry('trtr'), 'en')).toEqual({
      note: '\u201Ctrtr\u201D only exists in British notation. A US pattern writes \u201Cdtr\u201D for this stitch.',
      other: entry('dtr'),
    });
  });

  it('ne dit rien d’un terme hors du décalage US/UK', () => {
    expect(regionNoteOf(entry('ch'), 'en')).toBeUndefined();
  });
});

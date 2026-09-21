import { describe, expect, it } from 'vitest';
import { GLOSSARY, GlossaryEntry } from '../../reader/data/glossary';
import { titleOf } from './term-page';

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

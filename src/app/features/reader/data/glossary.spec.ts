import { describe, expect, it } from 'vitest';
import { annotate, definitionOf } from './glossary';

describe('glossaire', () => {
  it('traduit une abréviation dans la langue demandée', () => {
    expect(definitionOf('ms', 'fr')).toBe('maille serrée');
    expect(definitionOf('MS', 'en')).toBe('single crochet');
    expect(definitionOf('zzz', 'fr')).toBeUndefined();
  });

  it('préfère le terme le plus long', () => {
    const segments = annotate('sl st in next st', 'fr');
    expect(segments.find((s) => s.definition)?.text).toBe('sl st');
  });

  it("n'annote pas un fragment de mot", () => {
    const segments = annotate('poste', 'fr');
    expect(segments).toEqual([{ text: 'poste' }]);
  });

  it('conserve le texte intégral une fois recomposé', () => {
    const source = 'Round 2: inc in each st around (12)';
    expect(
      annotate(source, 'fr')
        .map((s) => s.text)
        .join(''),
    ).toBe(source);
  });
});

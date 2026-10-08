import { describe, expect, it } from 'vitest';
import { YARN_WEIGHTS } from './yarn-weights';

describe('YARN_WEIGHTS', () => {
  it('couvre les catégories 0 à 7, chacune une seule fois', () => {
    expect(YARN_WEIGHTS.map((w) => w.category)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('donne à chaque ligne un nom américain, une source et des plages valides', () => {
    for (const weight of YARN_WEIGHTS) {
      const label = `catégorie ${weight.category}`;
      expect(weight.us.length, label).toBeGreaterThan(0);
      expect(
        weight.us.every((name) => name.trim() !== ''),
        label,
      ).toBe(true);
      expect(weight.source.trim(), label).not.toBe('');
      for (const range of [weight.hookMm, weight.needleMm]) {
        expect(range.min, label).toBeGreaterThan(0);
        if (range.max !== null) expect(range.max, label).toBeGreaterThan(range.min);
      }
    }
  });

  it('range les fils du plus fin au plus gros : crochets et aiguilles ne reculent jamais', () => {
    for (let i = 1; i < YARN_WEIGHTS.length; i++) {
      expect(YARN_WEIGHTS[i].hookMm.min).toBeGreaterThanOrEqual(YARN_WEIGHTS[i - 1].hookMm.min);
      expect(YARN_WEIGHTS[i].needleMm.min).toBeGreaterThanOrEqual(YARN_WEIGHTS[i - 1].needleMm.min);
    }
  });

  it('ne laisse un équivalent britannique que parmi les noms de la source', () => {
    for (const weight of YARN_WEIGHTS) {
      if (weight.uk !== null)
        expect(weight.us, `catégorie ${weight.category}`).toContain(weight.uk);
    }
  });
});

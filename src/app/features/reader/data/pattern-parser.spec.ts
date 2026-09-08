import { describe, expect, it } from 'vitest';
import { DEMO_PATTERN } from './demo-pattern';
import { parsePattern } from './pattern-parser';

describe('parsePattern', () => {
  it('retourne un patron vide pour une entrée vide', () => {
    expect(parsePattern('')).toEqual({
      title: '',
      materials: [],
      notes: [],
      pieces: [],
      total: 0,
    });
    expect(parsePattern('   \n  ').total).toBe(0);
  });

  it('reconnaît les libellés de rang français et anglais', () => {
    const pattern = parsePattern(
      [
        'Rang 1 : 6 ms dans un cercle magique (6)',
        'Round 2: inc in each st (12)',
        'T. 3 - 6 ms',
      ].join('\n'),
    );
    expect(pattern.total).toBe(3);
    // « T. 3 - 6 » est bien lu comme une étendue : le tiret sépare deux numéros.
    expect(pattern.pieces[0].steps.map((s) => s.label)).toEqual(['Rang 1', 'Round 2', 'T 3–6']);
  });

  it("déduit le nombre de répétitions d'une étendue de rangs", () => {
    const pattern = parsePattern('Rangs 3-6 : 1 ms dans chaque m (12)');
    expect(pattern.pieces[0].steps[0].label).toBe('Rang 3–6');
    expect(pattern.pieces[0].steps[0].reps).toBe(4);
  });

  it("déduit le nombre de répétitions d'un « x 6 » dans le corps", () => {
    const pattern = parsePattern('Round 3: [sc, inc] x 6 (18)');
    expect(pattern.pieces[0].steps[0].reps).toBe(6);
  });

  it('isole la section matériel sans la compter comme des étapes', () => {
    const pattern = parsePattern(
      ['You will need:', '  4 mm hook', '  green yarn', 'Instructions:', 'Round 1: 6 sc (6)'].join(
        '\n',
      ),
    );
    expect(pattern.materials).toEqual(['4 mm hook', 'green yarn']);
    expect(pattern.total).toBe(1);
  });

  it('prend le tout premier en-tête pour le titre, les suivants pour des pièces', () => {
    const pattern = parsePattern(
      [
        'Petit sapin',
        'Tree',
        'Round 1: 6 sc (6)',
        'Trunk',
        'Round 1: 6 sc (6)',
        'Round 2: 6 sc (6)',
      ].join('\n'),
    );
    expect(pattern.title).toBe('Petit sapin');
    expect(pattern.pieces.map((p) => p.name)).toEqual(['Tree', 'Trunk']);
    expect(pattern.total).toBe(3);
  });

  it("rattache une ligne libre au conseil de l'étape qu'elle commente", () => {
    const pattern = parsePattern(
      ['Corps', 'Round 1: 6 sc (6)', 'Stuff firmly before closing.', 'Round 2: dec x 3 (3)'].join(
        '\n',
      ),
    );
    const steps = pattern.pieces[0].steps;
    // Une ligne libre commente l'étape : elle va dans le conseil, pas dans les
    // mailles à réaliser. Arbitrage produit, revu sur des patrons réels.
    expect(steps[0].tip).toContain('Stuff firmly before closing.');
    expect(steps[1].label).toBe('Round 2');
  });

  it('découpe le patron de démonstration en trois pièces', () => {
    const pattern = parsePattern(DEMO_PATTERN);
    expect(pattern.title).toBe('Tiny Tree');
    expect(pattern.pieces.map((p) => p.name)).toEqual(['Tree', 'Trunk', 'Star']);
    expect(pattern.total).toBe(pattern.pieces.reduce((n, p) => n + p.steps.length, 0));
    expect(pattern.materials.length).toBeGreaterThan(3);
  });

  it("normalise les entités HTML d'un copier-coller", () => {
    const pattern = parsePattern('Rang 1 : ms &amp; brides&nbsp;(6)');
    expect(pattern.pieces[0].steps[0].body).toBe('ms & brides (6)');
  });
});

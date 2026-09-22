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

  it("détache l'indication endroit/envers du libellé de rang", () => {
    const pattern = parsePattern('Row 1 (RS): k2, p2');
    const step = pattern.pieces[0].steps[0];
    expect(step.label).toBe('Row 1');
    expect(step.side).toBe('rs');
    expect(step.body).toBe('k2, p2');
  });

  it("reconnaît l'indication envers en français", () => {
    const pattern = parsePattern('Rang 2 (envers) : m2, m2 env');
    expect(pattern.pieces[0].steps[0].side).toBe('ws');
  });

  it('garde le renvoi entre parenthèses qui suit une étendue de rangs', () => {
    const pattern = parsePattern('Rnd 12-16 (rep rnd 11)');
    const step = pattern.pieces[0].steps[0];
    expect(step.label).toBe('Rnd 12–16');
    expect(step.reps).toBe(5);
    expect(step.body).toBe('(rep rnd 11)');
  });

  it('lit une numérotation nue comme des étapes en l’absence de libellé de rang', () => {
    const pattern = parsePattern(
      [
        '1. 6 ms dans un cercle magique',
        '2) inc dans chaque m (12)',
        '3 - 1 ms dans chaque m',
      ].join('\n'),
    );
    expect(pattern.pieces[0].steps.map((s) => s.label)).toEqual(['1', '2', '3']);
    expect(pattern.total).toBe(3);
  });

  it('garde une liste de fournitures numérotée dans le matériel', () => {
    const pattern = parsePattern(
      [
        'Coaster',
        'Materials:',
        '1. Cotton yarn',
        '2. 4 mm hook',
        '1. Make a magic ring, 6 sc.',
        '2. Inc in each st around.',
        '3) Sc, inc around.',
      ].join('\n'),
    );

    expect(pattern.materials).toEqual(['1. Cotton yarn', '2. 4 mm hook']);
    expect(pattern.total).toBe(3);
    expect(pattern.pieces[0].steps[0].body).toBe('Make a magic ring, 6 sc.');
  });

  it('ne lit pas une numérotation nue comme des étapes quand un vrai libellé de rang existe', () => {
    const pattern = parsePattern(
      [
        'You will need:',
        '1. 4mm hook',
        '2. green yarn',
        'Instructions:',
        'Rang 1 : 6 ms dans un cercle magique',
      ].join('\n'),
    );
    expect(pattern.materials).toEqual(['1. 4mm hook', '2. green yarn']);
    expect(pattern.total).toBe(1);
  });

  it('range une section Notes dans Pattern.notes plutôt que dans une pièce', () => {
    const pattern = parsePattern(
      [
        'Notes:',
        'Work in continuous rounds, do not join.',
        'Use a stitch marker to track the start of the round.',
        'Rang 1 : 6 ms dans un cercle magique',
      ].join('\n'),
    );
    expect(pattern.notes).toEqual([
      'Work in continuous rounds, do not join.',
      'Use a stitch marker to track the start of the round.',
    ]);
    expect(pattern.pieces.map((p) => p.name)).toEqual(['']);
    expect(pattern.total).toBe(1);
  });

  it("referme la table d'abréviations dès qu'un nom de pièce suit, sans avaler le paragraphe", () => {
    const pattern = parsePattern(
      [
        'Pumpkin Harvest Hat',
        'Materials:',
        'G Hook',
        'Abbreviations:',
        'sc= single crochet',
        'dc = double crochet',
        'Stem',
        'With Green Yarn, Chain 2',
        'Row 1: In 2nd Chain from hook, make 4 sc (4)',
      ].join('\n'),
    );
    expect(pattern.title).toBe('Pumpkin Harvest Hat');
    expect(pattern.notes).toEqual(['sc= single crochet', 'dc = double crochet']);
    expect(pattern.pieces.map((p) => p.name)).toEqual(['Stem']);
    expect(pattern.total).toBe(1);
  });

  it("range 'Sizes: S (M, L)' dans les notes plutôt que d'en faire une pièce", () => {
    const pattern = parsePattern(
      ['Beanie', 'Sizes: S (M, L)', 'Round 1: 6 sc in magic ring (6)'].join('\n'),
    );
    expect(pattern.notes).toEqual(['Sizes: S (M, L)']);
    expect(pattern.pieces.map((p) => p.name)).toEqual(['']);
    expect(pattern.total).toBe(1);
  });

  it("déduit reps d'une consigne « Repeat rows 2-5 four more times » écrite en lettres", () => {
    const pattern = parsePattern(['Row 1: k2, p2', 'Repeat rows 2-5 four more times.'].join('\n'));
    const steps = pattern.pieces[0].steps;
    expect(steps[1].reps).toBe(4);
  });

  it("déduit reps d'une consigne « Répéter les rangs 2 à 5 quatre fois » en français", () => {
    const pattern = parsePattern(
      ['Rang 1 : m2, m2 env', 'Répéter les rangs 2 à 5 quatre fois.'].join('\n'),
    );
    const steps = pattern.pieces[0].steps;
    expect(steps[1].reps).toBe(4);
  });

  it('lit les nombres de deux à douze en lettres, en anglais comme en français', () => {
    const en = [
      'two',
      'three',
      'four',
      'five',
      'six',
      'seven',
      'eight',
      'nine',
      'ten',
      'eleven',
      'twelve',
    ];
    const fr = [
      'deux',
      'trois',
      'quatre',
      'cinq',
      'six',
      'sept',
      'huit',
      'neuf',
      'dix',
      'onze',
      'douze',
    ];
    const repsOf = (line: string): number => {
      const steps = parsePattern(`Row 1: sc across\n${line}`).pieces[0].steps;
      return steps[steps.length - 1].reps;
    };

    en.forEach((word, i) => expect(repsOf(`Repeat row 1 ${word} times.`), word).toBe(i + 2));
    fr.forEach((word, i) => expect(repsOf(`Répéter le rang 1 ${word} fois.`), word).toBe(i + 2));
  });

  it('déduit reps en chiffres dans une consigne de répétition', () => {
    const pattern = parsePattern(['Row 1: k2, p2', 'Repeat rows 2-5 10 more times.'].join('\n'));
    expect(pattern.pieces[0].steps[1].reps).toBe(10);
  });
});

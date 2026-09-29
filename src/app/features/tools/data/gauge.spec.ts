import { describe, expect, it } from 'vitest';
import { HOOK_SIZES } from '../../converter/data/hook-sizes';
import {
  Gauge,
  Unit,
  compareGauges,
  nextHook,
  referenceLength,
  stitchesFor,
  widthFor,
} from './gauge';

const UNITS: readonly Unit[] = ['cm', 'in'];

describe('compareGauges', () => {
  const cases: readonly {
    name: string;
    pattern: Gauge;
    mine: Gauge;
    stitchRatio: number;
    rowRatio: number;
    advice: 'ok' | 'go-up' | 'go-down';
  }[] = [
    {
      name: 'plus de mailles que le patron : ouvrage serré, crochet plus gros',
      pattern: { stitches: 14, rows: 16 },
      mine: { stitches: 16, rows: 16 },
      stitchRatio: 16 / 14,
      rowRatio: 1,
      advice: 'go-up',
    },
    {
      name: 'moins de mailles que le patron : ouvrage lâche, crochet plus fin',
      pattern: { stitches: 20, rows: 24 },
      mine: { stitches: 18, rows: 22 },
      stitchRatio: 0.9,
      rowRatio: 22 / 24,
      advice: 'go-down',
    },
    {
      name: 'même échantillon',
      pattern: { stitches: 16, rows: 18 },
      mine: { stitches: 16, rows: 18 },
      stitchRatio: 1,
      rowRatio: 1,
      advice: 'ok',
    },
    {
      name: 'exactement 5 % de plus reste ok',
      pattern: { stitches: 20, rows: 20 },
      mine: { stitches: 21, rows: 20 },
      stitchRatio: 1.05,
      rowRatio: 1,
      advice: 'ok',
    },
    {
      name: 'exactement 5 % de moins reste ok',
      pattern: { stitches: 20, rows: 20 },
      mine: { stitches: 19, rows: 20 },
      stitchRatio: 0.95,
      rowRatio: 1,
      advice: 'ok',
    },
    {
      name: 'un peu plus de 5 % de plus : go-up',
      pattern: { stitches: 20, rows: 20 },
      mine: { stitches: 22, rows: 20 },
      stitchRatio: 1.1,
      rowRatio: 1,
      advice: 'go-up',
    },
    {
      name: 'les rangs seuls ne changent pas le conseil',
      pattern: { stitches: 16, rows: 16 },
      mine: { stitches: 16, rows: 24 },
      stitchRatio: 1,
      rowRatio: 1.5,
      advice: 'ok',
    },
  ];

  for (const unit of UNITS) {
    for (const c of cases) {
      it(`${c.name} (${unit})`, () => {
        // Le rapport ne dépend pas de l'unité : les deux échantillons sont sur la même longueur.
        const result = compareGauges(c.pattern, c.mine);
        expect(result).not.toBeNull();
        expect(result?.advice).toBe(c.advice);
        expect(result?.stitchRatio).toBeCloseTo(c.stitchRatio, 10);
        expect(result?.rowRatio).toBeCloseTo(c.rowRatio, 10);
      });
    }
  }
});

describe('stitchesFor et widthFor', () => {
  const mine: Gauge = { stitches: 14, rows: 16 };
  const cases: readonly { unit: Unit; width: number; stitches: number }[] = [
    // 14 mailles sur 10 cm : 1,4 maille au cm.
    { unit: 'cm', width: 50, stitches: 70 },
    { unit: 'cm', width: 10, stitches: 14 },
    { unit: 'cm', width: 33, stitches: 46 }, // 46,2 arrondi
    { unit: 'cm', width: 0.5, stitches: 1 }, // 0,7 arrondi
    // 14 mailles sur 4 pouces : 3,5 mailles au pouce.
    { unit: 'in', width: 20, stitches: 70 },
    { unit: 'in', width: 4, stitches: 14 },
    { unit: 'in', width: 9, stitches: 32 }, // 31,5 arrondi vers le haut
  ];

  for (const c of cases) {
    it(`${c.width} ${c.unit} → ${c.stitches} mailles`, () => {
      expect(stitchesFor(c.width, mine, c.unit)).toBe(c.stitches);
    });
  }

  const widths: readonly { unit: Unit; stitches: number; width: number }[] = [
    { unit: 'cm', stitches: 70, width: 50 },
    { unit: 'cm', stitches: 46, width: 32.9 }, // 32,857 au dixième
    { unit: 'cm', stitches: 1, width: 0.7 },
    { unit: 'in', stitches: 70, width: 20 },
    { unit: 'in', stitches: 32, width: 9.1 }, // 9,142 au dixième
  ];

  for (const c of widths) {
    it(`${c.stitches} mailles → ${c.width} ${c.unit}`, () => {
      expect(widthFor(c.stitches, mine, c.unit)).toBe(c.width);
    });
  }

  it('la longueur de référence est 10 cm ou 4 pouces', () => {
    expect(referenceLength('cm')).toBe(10);
    expect(referenceLength('in')).toBe(4);
  });
});

describe('nextHook', () => {
  HOOK_SIZES.forEach((size, index) => {
    it(`${size.mm} mm (${size.us}) : voisine plus grosse`, () => {
      expect(nextHook(size.mm, 'up')).toEqual(HOOK_SIZES[index + 1] ?? null);
    });
    it(`${size.mm} mm (${size.us}) : voisine plus fine`, () => {
      expect(nextHook(size.mm, 'down')).toEqual(HOOK_SIZES[index - 1] ?? null);
    });
  });

  it('une taille hors tableau trouve ses voisines', () => {
    expect(nextHook(4.25, 'up')?.mm).toBe(4.5);
    expect(nextHook(4.25, 'down')?.mm).toBe(4);
  });

  it('au-delà des extrémités : null', () => {
    expect(nextHook(12, 'up')).toBeNull();
    expect(nextHook(2, 'down')).toBeNull();
  });

  it('entrée invalide : null', () => {
    for (const bad of [0, -4, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(nextHook(bad, 'up')).toBeNull();
      expect(nextHook(bad, 'down')).toBeNull();
    }
  });
});

describe('entrées invalides', () => {
  const ok: Gauge = { stitches: 14, rows: 16 };
  const bad: readonly Gauge[] = [
    { stitches: 0, rows: 16 },
    { stitches: -3, rows: 16 },
    { stitches: Number.NaN, rows: 16 },
    { stitches: 14, rows: 0 },
    { stitches: 14, rows: Number.NaN },
    { stitches: 101, rows: 16 },
    { stitches: 14, rows: 101 },
  ];

  for (const gauge of bad) {
    it(`échantillon ${JSON.stringify(gauge)} → null, sans exception`, () => {
      expect(compareGauges(gauge, ok)).toBeNull();
      expect(compareGauges(ok, gauge)).toBeNull();
      for (const unit of UNITS) {
        expect(stitchesFor(10, gauge, unit)).toBeNull();
        expect(widthFor(10, gauge, unit)).toBeNull();
      }
    });
  }

  for (const unit of UNITS) {
    for (const width of [0, -5, Number.NaN, 0.1, 501]) {
      it(`largeur ${width} ${unit} → null`, () => {
        expect(stitchesFor(width, ok, unit)).toBeNull();
      });
    }
    for (const stitches of [0, -1, Number.NaN, 5001]) {
      it(`${stitches} mailles (${unit}) → null`, () => {
        expect(widthFor(stitches, ok, unit)).toBeNull();
      });
    }
  }
});

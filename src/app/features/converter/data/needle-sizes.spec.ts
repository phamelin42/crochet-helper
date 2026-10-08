import { describe, expect, it } from 'vitest';
import { NEEDLE_SIZES, findNeedleSize } from './needle-sizes';

/** Toutes les écritures acceptées d'une taille : la fiche 50 exige qu'on les parcoure toutes. */
function writings(size: (typeof NEEDLE_SIZES)[number]): string[] {
  const mm = String(size.mm);
  const comma = mm.replace('.', ',');
  const list = [mm, `${mm} mm`, `${mm}mm`, comma, `${comma} mm`, ` ${mm} MM `];
  list.push(`US ${size.us}`, `us${size.us}`, `US${size.us}`, `Us  ${size.us}`);
  if (size.us.includes('½')) list.push(`US ${size.us.replace('½', '.5')}`);
  return list;
}

describe('findNeedleSize', () => {
  it('retrouve chaque ligne du tableau sous chaque écriture acceptée, dans les deux sens', () => {
    for (const size of NEEDLE_SIZES) {
      for (const written of writings(size)) {
        expect(findNeedleSize(written), `« ${written} »`).toBe(size);
      }
    }
  });

  it('lit un nombre seul en millimètres d’abord, en US sinon', () => {
    expect(findNeedleSize('5')?.us).toBe('8');
    expect(findNeedleSize('8')?.us).toBe('11');
    expect(findNeedleSize('us8')?.mm).toBe(5);
    expect(findNeedleSize('1')?.mm).toBe(2.25);
    expect(findNeedleSize('10½')?.mm).toBe(6.5);
  });

  it('ne retombe jamais sur le système US quand « mm » est écrit', () => {
    expect(findNeedleSize('1 mm')).toBeNull();
    expect(findNeedleSize('11 mm')).toBeNull();
  });

  it('ne trouve rien pour une saisie vide, hors tableau ou incompréhensible', () => {
    for (const input of ['', '   ', '1 mm', 'Z', 'US 99', 'US', 'abc', '5 cm', '-', 'US 8x']) {
      expect(findNeedleSize(input), `« ${input} »`).toBeNull();
    }
  });
});

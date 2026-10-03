import { describe, expect, it } from 'vitest';
import { Round } from './chart-composer';
import { CELL, layoutPiece } from './chart-layout';
import { PieceChart } from './text-to-chart';

const sc = (count: number, kind: Round['kind']): Round => ({
  kind,
  groups: [{ tokens: [{ symbol: 'sc', count }], repeat: 1 }],
});

const chartOf = (kind: Round['kind'], rounds: (Round | null)[]): PieceChart => ({
  kind,
  rounds,
  drawable: rounds.filter(Boolean).length,
});

describe('layoutPiece', () => {
  it('place un tour de 6 à 0, 60, … 300 degrés, la première maille à midi', () => {
    const { cells, width } = layoutPiece(chartOf('round', [sc(6, 'round')]));

    expect(cells.map((cell) => cell.angle)).toEqual([0, 60, 120, 180, 240, 300]);
    const centre = width / 2;
    expect(cells[0].x).toBeCloseTo(centre);
    expect(cells[0].y).toBeLessThan(centre);
    // Sens horaire : la deuxième maille est à droite de la première.
    expect(cells[1].x).toBeGreaterThan(cells[0].x);
    // À l'opposé, la quatrième est sous le centre.
    expect(cells[3].y).toBeGreaterThan(centre);
  });

  it('éloigne chaque tour du précédent et ne serre jamais deux mailles de moins de 32 px', () => {
    const { cells, width } = layoutPiece(
      chartOf('round', [sc(6, 'round'), sc(12, 'round'), sc(60, 'round')]),
    );
    const radius = (round: number) => {
      const cell = cells.find((c) => c.round === round)!;
      return Math.hypot(cell.x - width / 2, cell.y - width / 2);
    };
    expect(radius(1)).toBeGreaterThan(radius(0));
    expect(radius(2)).toBeGreaterThan(radius(1));

    const sameRound = cells.filter((c) => c.round === 2);
    const gap = Math.hypot(sameRound[0].x - sameRound[1].x, sameRound[0].y - sameRound[1].y);
    expect(gap).toBeGreaterThanOrEqual(32);
    expect(CELL).toBeGreaterThanOrEqual(32);
  });

  it('garde la place d’une étape non dessinable, sans maille', () => {
    const withGap = layoutPiece(chartOf('round', [sc(6, 'round'), null, sc(6, 'round')]));
    const without = layoutPiece(chartOf('round', [sc(6, 'round'), sc(6, 'round')]));

    expect(withGap.cells.filter((cell) => cell.round === 1)).toHaveLength(0);
    expect(new Set(withGap.cells.map((cell) => cell.round))).toEqual(new Set([0, 2]));
    expect(withGap.width).toBeGreaterThan(without.width);
  });

  it('dessine les rangs du bas vers le haut, le rang 1 lu de droite à gauche', () => {
    const { cells } = layoutPiece(chartOf('row', [sc(4, 'row'), sc(4, 'row')]));
    const row = (n: number) => cells.filter((cell) => cell.round === n);

    expect(row(0)[0].y).toBeGreaterThan(row(1)[0].y);
    // Rang 1 (impair) : la première maille est la plus à droite.
    expect(row(0)[0].x).toBeGreaterThan(row(0)[3].x);
    // Rang 2 (pair) : la première maille est la plus à gauche.
    expect(row(1)[0].x).toBeLessThan(row(1)[3].x);
    expect(cells.every((cell) => cell.angle === 0)).toBe(true);
  });

  it.each(['round', 'row'] as const)('ne produit aucune maille pour une pièce vide (%s)', (kind) => {
    const { cells } = layoutPiece(chartOf(kind, [null, null]));
    expect(cells).toEqual([]);
  });
});

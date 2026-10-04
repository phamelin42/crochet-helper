import { describe, expect, it } from 'vitest';
import { Round, roundSymbols } from './chart-composer';
import { CELL, layoutPiece } from './chart-layout';
import { PieceChart } from './text-to-chart';

const sc = (count: number, kind: Round['kind']): Round => ({
  kind,
  groups: [{ tokens: [{ symbol: 'sc', count }], repeat: 1 }],
});

const chartOf = (
  kind: Round['kind'],
  rounds: (Round | null)[],
  spans: number[] = rounds.map(() => 1),
): PieceChart => {
  const numbers: number[] = [];
  let next = 1;
  for (const span of spans) {
    numbers.push(next);
    next += span;
  }
  return {
    kind,
    rounds,
    drawable: rounds.filter(Boolean).length,
    stitches: rounds.map((round, i) => (round ? roundSymbols(round).length * spans[i] : 0)),
    spans,
    numbers,
  };
};

describe('layoutPiece', () => {
  it('place un tour de 6 en sens horaire, la première maille à midi, le numéro juste avant', () => {
    const { cells, labels, width } = layoutPiece(chartOf('round', [sc(6, 'round')]));
    const slot = 360 / 7;

    cells.forEach((cell, i) => expect(cell.angle).toBeCloseTo(slot * i, 1));
    const centre = width / 2;
    expect(cells[0].x).toBeCloseTo(centre);
    expect(cells[0].y).toBeLessThan(centre);
    // Sens horaire : la deuxième maille est à droite de la première.
    expect(cells[1].x).toBeGreaterThan(cells[0].x);
    // Le numéro occupe la dernière place, à gauche de midi, sur le même cercle.
    expect(labels).toEqual([expect.objectContaining({ step: 0, text: '1' })]);
    expect(labels[0].x).toBeLessThan(centre);
    expect(labels[0].y).toBeLessThan(centre);
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

  it.each(['round', 'row'] as const)(
    'garde la place d’une étape non dessinable, en pointillé et numérotée (%s)',
    (kind) => {
      const withGap = layoutPiece(chartOf(kind, [sc(6, kind), null, sc(6, kind)]));
      const without = layoutPiece(chartOf(kind, [sc(6, kind), sc(6, kind)]));

      expect(withGap.cells.filter((cell) => cell.round === 1)).toHaveLength(0);
      expect(withGap.gaps).toEqual([expect.objectContaining({ step: 1 })]);
      expect(withGap.labels.map((label) => label.text.replace(/\D/g, ''))).toEqual(['1', '2', '3']);
      expect(withGap.width * withGap.height).toBeGreaterThan(without.width * without.height);
    },
  );

  it.each(['round', 'row'] as const)(
    'dessine chaque tour d’une étape « 5-8 », numérotés à la suite (%s)',
    (kind) => {
      const { cells, labels } = layoutPiece(chartOf(kind, [sc(6, kind), sc(6, kind)], [1, 4]));
      const second = cells.filter((cell) => cell.round === 1);

      expect(second.map((cell) => cell.stitch)).toEqual([...Array(24).keys()]);
      expect(labels.map((label) => label.text.replace(/\D/g, ''))).toEqual([
        '1',
        '2',
        '3',
        '4',
        '5',
      ]);
      // Les quatre tours de l'étape sont à quatre places différentes.
      const places = new Set(second.map((cell) => `${cell.x}:${cell.y}`));
      expect(places.size).toBe(24);
    },
  );

  it('dessine les rangs du bas vers le haut, le rang 1 lu de droite à gauche', () => {
    const { cells, labels, width } = layoutPiece(chartOf('row', [sc(4, 'row'), sc(4, 'row')]));
    const row = (n: number) => cells.filter((cell) => cell.round === n);

    expect(row(0)[0].y).toBeGreaterThan(row(1)[0].y);
    // Rang 1 (impair) : la première maille est la plus à droite, le numéro aussi.
    expect(row(0)[0].x).toBeGreaterThan(row(0)[3].x);
    expect(labels[0]).toMatchObject({ text: '← 1' });
    expect(labels[0].x).toBeGreaterThan(row(0)[0].x);
    // Rang 2 (pair) : la première maille est la plus à gauche, le numéro aussi.
    expect(row(1)[0].x).toBeLessThan(row(1)[3].x);
    expect(labels[1]).toMatchObject({ text: '2 →' });
    expect(labels[1].x).toBeLessThan(row(1)[0].x);
    expect(cells.every((cell) => cell.angle === 0)).toBe(true);
    expect(labels.every((label) => label.x > 0 && label.x < width)).toBe(true);
  });

  it.each(['round', 'row'] as const)(
    'ne produit aucune maille pour une pièce vide (%s)',
    (kind) => {
      const layout = layoutPiece(chartOf(kind, [null, null]));
      expect(layout.cells).toEqual([]);
      expect(layout.labels).toEqual([]);
    },
  );
});

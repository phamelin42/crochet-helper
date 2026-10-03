import { describe, expect, it } from 'vitest';
import {
  ColorGrid,
  colorTotals,
  encodeGrid,
  gridToText,
  nextChange,
  rowRuns,
  validGrid,
} from './color-grid';
import { parsePattern } from './pattern-parser';

// Rang 1 (en bas) : AAAABB — rang 2 : BBAAAA — rang 3 : AABBAA — rang 4 : ABABAB.
const ROWS = ['AAAABB', 'BBAAAA', 'AABBAA', 'ABABAB'];

function grid(worked: ColorGrid['worked'], rows = ROWS): ColorGrid {
  const cells = Uint8Array.from(rows.flatMap((row) => [...row].map((c) => c.charCodeAt(0) - 65)));
  return {
    width: rows[0].length,
    height: rows.length,
    palette: ['#ffffff', '#336699'],
    cells,
    worked,
  };
}

describe('rowRuns', () => {
  // Lu dans le sens de travail : rang 1 de droite à gauche, rang 2 de gauche à droite à plat.
  const FLAT: [number, [number, number][]][] = [
    [
      0,
      [
        [1, 2],
        [0, 4],
      ],
    ],
    [
      1,
      [
        [1, 2],
        [0, 4],
      ],
    ],
    [
      2,
      [
        [0, 2],
        [1, 2],
        [0, 2],
      ],
    ],
    [
      3,
      [
        [0, 1],
        [1, 1],
        [0, 1],
        [1, 1],
        [0, 1],
        [1, 1],
      ],
    ],
  ];
  it.each(FLAT)('à plat, rang %i', (row, expected) => {
    const runs = rowRuns(grid('flat'), row).map(({ color, count }) => [color, count]);
    expect(runs).toEqual(expected);
  });

  it('à plat, le sens alterne : le rang 2 se lit à l’inverse de son dessin', () => {
    // Dessiné BBAAAA, travaillé de gauche à droite : deux B puis quatre A.
    expect(rowRuns(grid('flat'), 1)[0]).toEqual({ color: 1, count: 2 });
    // Le rang 1, dessiné AAAABB, se travaille de droite à gauche : B d'abord.
    expect(rowRuns(grid('flat'), 0)[0]).toEqual({ color: 1, count: 2 });
  });

  it('en rond, tous les rangs se lisent dans le même sens', () => {
    for (let row = 0; row < ROWS.length; row++) {
      const drawn = [...ROWS[row]].reverse().join('');
      const runs = rowRuns(grid('round'), row);
      const text = runs.map((r) => String.fromCharCode(65 + r.color).repeat(r.count)).join('');
      expect(text).toBe(drawn);
    }
  });
});

describe('nextChange', () => {
  const g = grid('flat', ['AAABBBAA', 'AAABBBAA', 'AAABBBAA', 'AAABBBAA']);
  // Rang 1 travaillé de droite à gauche : A A B B B A A A.
  it('en début de série', () => expect(nextChange(g, 0, 0)).toBe(1));
  it('au milieu de série', () => expect(nextChange(g, 0, 2)).toBe(2));
  it('à la dernière maille d’une série', () => expect(nextChange(g, 0, 4)).toBe(0));
  it('au dernier changement, la série va jusqu’au bout du rang', () => {
    expect(nextChange(g, 0, 5)).toBeNull();
    expect(nextChange(g, 0, 7)).toBeNull();
  });
});

describe('gridToText', () => {
  it('écrit chaque rang en français', () => {
    const lines = gridToText(grid('flat'), 'fr').split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe('Rang 1 : 2 ms B, 4 ms A (6)');
    expect(lines[1]).toBe('Rang 2 : 2 ms B, 4 ms A (6)');
  });

  it('écrit chaque rang en anglais', () => {
    expect(gridToText(grid('flat'), 'en').split('\n')[2]).toBe('Row 3: 2 sc A, 2 sc B, 2 sc A (6)');
  });

  it.each(['fr', 'en'] as const)('est lu par le parseur : une étape par rang (%s)', (locale) => {
    const pattern = parsePattern(gridToText(grid('flat'), locale));
    expect(pattern.total).toBe(4);
    expect(pattern.pieces[0].steps).toHaveLength(4);
  });
});

describe('colorTotals', () => {
  it('compte les mailles de chaque couleur', () => {
    expect(colorTotals(grid('flat'))).toEqual([15, 9]);
  });
});

describe('validGrid', () => {
  const good = (): Record<string, unknown> => ({ ...grid('flat', rowsOf(5, 5)) });
  function rowsOf(width: number, height: number): string[] {
    return Array.from({ length: height }, () => 'A'.repeat(width));
  }

  it('accepte une grille bien formée, et celle d’une sauvegarde', () => {
    expect(validGrid(good())).not.toBeNull();
    expect(validGrid(encodeGrid(good() as unknown as ColorGrid))?.cells).toEqual(
      (good() as unknown as ColorGrid).cells,
    );
  });

  const BAD: [string, Record<string, unknown>][] = [
    ['largeur 3', { width: 3, cells: new Uint8Array(15) }],
    ['largeur 151', { width: 151, cells: new Uint8Array(151 * 5) }],
    ['hauteur 3', { height: 3, cells: new Uint8Array(15) }],
    ['hauteur 151', { height: 151, cells: new Uint8Array(5 * 151) }],
    ['palette de 1', { palette: ['#ffffff'] }],
    ['palette de 13', { palette: Array.from({ length: 13 }, () => '#ffffff') }],
    ['cells trop court', { cells: new Uint8Array(24) }],
    ['cells trop long', { cells: new Uint8Array(26) }],
    ['indice hors palette', { cells: new Uint8Array(25).fill(2) }],
    ['couleur sans #', { palette: ['ffffff', '#336699'] }],
    ['couleur courte', { palette: ['#fff', '#336699'] }],
    ['couleur non hexadécimale', { palette: ['#gggggg', '#336699'] }],
    ['sens inconnu', { worked: 'spiral' }],
    ['base64 démesuré', { cells: 'A'.repeat(10_000_000) }],
  ];
  it.each(BAD)('refuse : %s', (_, patch) => {
    expect(validGrid({ ...good(), ...patch })).toBeNull();
  });

  it.each([null, undefined, 12, 'x', []])('refuse %j sans exception', (raw) => {
    expect(validGrid(raw)).toBeNull();
  });
});

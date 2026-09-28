import { describe, expect, it } from 'vitest';
import {
  Convention,
  Group,
  Round,
  appendTranscription,
  defaultPieceName,
  renderPattern,
  renderRound,
  stitchCount,
  warnings,
} from './chart-composer';
import { CHART_SYMBOLS } from './chart-symbols';
import { parsePattern } from './pattern-parser';

const CONVENTIONS: readonly Convention[] = ['US', 'UK', 'FR'];

const group = (symbol: string, count = 1, repeat = 1): Group => ({
  tokens: [{ symbol, count }],
  repeat,
});
const round = (...groups: Group[]): Round => ({ kind: 'round', groups });

describe('renderRound', () => {
  for (const convention of CONVENTIONS) {
    describe(convention, () => {
      for (const symbol of CHART_SYMBOLS) {
        it(`${symbol.id} : une seule étape qui contient l'abréviation`, () => {
          const line = renderRound(round(group(symbol.id, 3)), 2, convention);
          const pattern = parsePattern(`Pièce\n${line}`);
          const steps = pattern.pieces.flatMap((piece) => piece.steps);
          expect(steps).toHaveLength(1);
          const expected =
            convention === 'FR' ? symbol.fr : convention === 'UK' ? symbol.uk : symbol.us;
          expect(steps[0].body).toContain(expected);
        });
      }
    });
  }

  it('écrit une répétition et le compte, dans chaque convention', () => {
    const repeated: Round = {
      kind: 'round',
      groups: [
        {
          tokens: [
            { symbol: 'sc', count: 1 },
            { symbol: 'sc-inc', count: 1 },
          ],
          repeat: 6,
        },
      ],
    };
    expect(renderRound(repeated, 3, 'US')).toBe('Rnd 3: *sc, sc inc* x 6 (18)');
    expect(renderRound(repeated, 3, 'UK')).toBe('Rnd 3: *dc, dc inc* x 6 (18)');
    expect(renderRound(repeated, 3, 'FR')).toBe('Tour 3 : *1 ms, 1 aug ms* x 6 (18)');
  });

  it('nomme le cercle magique et le rang dans la convention', () => {
    const first: Round = { kind: 'round', into: 'magic-ring', groups: [group('sc', 6)] };
    expect(renderRound(first, 1, 'US')).toBe('Rnd 1: 6 sc in a magic ring (6)');
    expect(renderRound(first, 1, 'FR')).toBe('Tour 1 : 6 ms dans un cercle magique (6)');
    const row: Round = { kind: 'row', groups: [group('dc', 2)] };
    expect(renderRound(row, 3, 'US')).toBe('Row 3: 2 dc (2)');
    expect(renderRound(row, 3, 'FR')).toBe('Rang 3 : 2 br (2)');
  });
});

describe('renderPattern', () => {
  it('produit autant d’étapes que de tours, dans l’ordre', () => {
    const rounds = [
      { kind: 'round', into: 'magic-ring', groups: [group('sc', 6)] },
      round(group('sc-inc', 6)),
      round({
        tokens: [
          { symbol: 'sc', count: 1 },
          { symbol: 'sc-inc', count: 1 },
        ],
        repeat: 6,
      }),
    ] as const;
    for (const convention of CONVENTIONS) {
      const pattern = parsePattern(`Pièce\n${renderPattern(rounds, convention)}`);
      const steps = pattern.pieces.flatMap((piece) => piece.steps);
      expect(steps.map((step) => step.label)).toEqual(
        [1, 2, 3].map((n) => `${convention === 'FR' ? 'Tour' : 'Rnd'} ${n}`),
      );
    }
  });

  it('saute les tours vides sans casser la numérotation', () => {
    const text = renderPattern([round(group('sc', 6)), round(), round(group('sc', 6))], 'US');
    expect(text.split('\n').map((line) => line.slice(0, 6))).toEqual(['Rnd 1:', 'Rnd 2:']);
  });
});

describe('stitchCount', () => {
  const cases: readonly [string, Round, number][] = [
    ['anneau magique, 6 ms', { kind: 'round', into: 'magic-ring', groups: [group('sc', 6)] }, 6],
    ['tour d’augmentations', round(group('sc-inc', 6)), 12],
    ['tour de diminutions', round(group('sc2tog', 6)), 6],
    [
      'répétition *ms, aug* x 6',
      round({
        tokens: [
          { symbol: 'sc', count: 1 },
          { symbol: 'sc-inc', count: 1 },
        ],
        repeat: 6,
      }),
      18,
    ],
    ['un symbole sans maille (brin arrière)', round(group('blo'), group('sc', 4)), 4],
    ['coquille de cinq brides', round(group('shell', 2)), 10],
    ['tour vide', round(), 0],
  ];
  for (const [name, input, expected] of cases) {
    it(name, () => expect(stitchCount(input)).toBe(expected));
  }
});

describe('warnings', () => {
  it('signale un tour vide', () => {
    expect(warnings([round(group('sc', 6)), round()])).toEqual([{ kind: 'empty', round: 2 }]);
  });

  it('signale un compte qui chute de moitié ou double sans augmentation ni diminution', () => {
    expect(warnings([round(group('sc', 12)), round(group('sc', 5))])).toEqual([
      { kind: 'jump', round: 2 },
    ]);
    expect(warnings([round(group('sc', 6)), round(group('sc', 13))])).toEqual([
      { kind: 'jump', round: 2 },
    ]);
  });

  it('ne signale pas une forte variation voulue par des augmentations', () => {
    expect(warnings([round(group('sc', 6)), round(group('sc-inc', 6))])).toEqual([]);
  });

  it('signale une répétition qui ne tombe pas juste sur le tour précédent', () => {
    const rounds = [
      round(group('sc', 12)),
      round({
        tokens: [
          { symbol: 'sc', count: 1 },
          { symbol: 'sc-inc', count: 1 },
        ],
        repeat: 5,
      }),
    ];
    expect(warnings(rounds)).toEqual([{ kind: 'repeat', round: 2 }]);
  });

  it('laisse passer une répétition juste', () => {
    const rounds = [
      round(group('sc', 12)),
      round({
        tokens: [
          { symbol: 'sc', count: 1 },
          { symbol: 'sc-inc', count: 1 },
        ],
        repeat: 6,
      }),
    ];
    expect(warnings(rounds)).toEqual([]);
  });
});

describe('appendTranscription', () => {
  const SOURCE = 'Patron\nTree\nRound 1: 6 sc (6)\nTrunk\nRound 1: 6 sc (6)';
  const TEXT = 'Rnd 1: 6 sc in a magic ring (6)';

  it('ajoute une pièce à la fin sans toucher au reste', () => {
    const result = appendTranscription(SOURCE, 'Feuille', TEXT, 'Chart 1');
    expect(result.startsWith(SOURCE)).toBe(true);
    const pieces = parsePattern(result).pieces;
    expect(pieces.map((piece) => piece.name)).toEqual(['Tree', 'Trunk', 'Feuille']);
    expect(pieces[2].steps).toHaveLength(1);
  });

  it('met une majuscule et retire la ponctuation finale du nom', () => {
    const result = appendTranscription(SOURCE, 'ma feuille.', TEXT, 'Chart 1');
    expect(parsePattern(result).pieces.map((piece) => piece.name)).toContain('Ma feuille');
  });

  it('remplace un nom que le lecteur ne prendrait pas pour une pièce', () => {
    for (const bad of [
      '',
      '   ',
      'Tour 2',
      'Round 4',
      'une très longue phrase qui ne tient pas en un nom',
    ]) {
      const result = appendTranscription(SOURCE, bad, TEXT, 'Chart 1');
      const pieces = parsePattern(result).pieces;
      expect(pieces.map((piece) => piece.name)).toEqual(['Tree', 'Trunk', 'Chart 1']);
    }
  });
});

describe('defaultPieceName', () => {
  it('prend le premier numéro libre', () => {
    expect(defaultPieceName(['Tree'], 'Chart')).toBe('Chart 1');
    expect(defaultPieceName(['Chart 1', 'chart 2'], 'Chart')).toBe('Chart 3');
  });
});

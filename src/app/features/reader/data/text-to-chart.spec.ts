import { describe, expect, it } from 'vitest';
import { Convention, Group, Round, renderRound, roundSymbols, stitchCount } from './chart-composer';
import { CHART_SYMBOLS } from './chart-symbols';
import { DEMO_PATTERN } from './demo-pattern';
import { parsePattern } from './pattern-parser';
import { PatternStep } from './pattern.model';
import { detectConvention, pieceToChart, stepToRound } from './text-to-chart';

const CONVENTIONS: readonly Convention[] = ['US', 'UK', 'FR'];

const group = (symbol: string, count = 1, repeat = 1): Group => ({
  tokens: [{ symbol, count }],
  repeat,
});

const step = (label: string, body: string): PatternStep => ({
  label,
  body,
  notes: [],
  reps: 0,
});

/** Le chemin complet de la lectrice : le texte écrit, découpé par le parseur, relu. */
function readBack(round: Round, convention: Convention, index = 2): Round | null {
  const line = renderRound(round, index, convention);
  const steps = parsePattern(`Pièce\n${line}`).pieces.flatMap((piece) => piece.steps);
  expect(steps).toHaveLength(1);
  return stepToRound(steps[0], round.kind, convention);
}

describe('stepToRound : aller-retour avec renderRound', () => {
  for (const convention of CONVENTIONS) {
    describe(convention, () => {
      for (const symbol of CHART_SYMBOLS) {
        it(`${symbol.id} : un tour d'un jeton se relit à l'identique`, () => {
          for (const count of [1, 3]) {
            const round: Round = { kind: 'round', groups: [group(symbol.id, count)] };
            expect(readBack(round, convention)).toEqual(round);
          }
        });

        it(`${symbol.id} : une répétition se relit à l'identique`, () => {
          const round: Round = {
            kind: 'round',
            groups: [
              {
                tokens: [
                  { symbol: symbol.id, count: 2 },
                  { symbol: 'sc', count: 1 },
                ],
                repeat: 4,
              },
            ],
          };
          expect(readBack(round, convention)).toEqual(round);
        });
      }

      it('un premier tour dans un cercle magique ou une chaînette se relit', () => {
        for (const into of ['magic-ring', 'chain'] as const) {
          const round: Round = { kind: 'round', into, groups: [group('sc', 6)] };
          expect(readBack(round, convention, 1)).toEqual(round);
        }
      });

      it('un rang se relit comme un rang', () => {
        const round: Round = {
          kind: 'row',
          groups: [
            {
              tokens: [
                { symbol: 'dc', count: 2 },
                { symbol: 'ch', count: 1 },
              ],
              repeat: 1,
            },
          ],
        };
        expect(readBack(round, convention, 3)).toEqual(round);
      });
    });
  }
});

describe('stepToRound : formules', () => {
  it.each([
    ['sc in each st around (24)', 'US'],
    ['SC in each st across (24)', 'US'],
    ['1 ms dans chaque maille (24)', 'FR'],
    ['ms dans chaque maille du tour (24)', 'FR'],
  ] as const)('« %s » : 24 jetons de la maille nommée', (body, convention) => {
    const round = stepToRound(step('Rnd 4', body), 'round', convention);
    expect(round?.groups).toEqual([{ tokens: [{ symbol: 'sc', count: 24 }], repeat: 1 }]);
    expect(round && stitchCount(round)).toBe(24);
  });

  it.each([
    ['(sc, sc inc) x 6 (18)', 'US'],
    ['*sc, sc inc*, repeat 6 times (18)', 'US'],
    ['*1 ms, 1 aug ms*, répéter 6 fois (18)', 'FR'],
    ['*sc, sc inc* 6 times (18)', 'US'],
    ['*SC, SC INC* X 6 (18)', 'US'],
  ] as const)('répétition « %s »', (body, convention) => {
    const round = stepToRound(step('Rnd 3', body), 'round', convention);
    expect(round?.groups).toEqual([
      {
        tokens: [
          { symbol: 'sc', count: 1 },
          { symbol: 'sc-inc', count: 1 },
        ],
        repeat: 6,
      },
    ]);
  });
});

describe('stepToRound : ce qui ne se dessine pas', () => {
  it.each([
    ['Tour 5', 'bourrer la tête', 'FR'],
    ['Rnd 5', 'stuff the head firmly', 'US'],
    ['Tour 6', 'fermer et rentrer le fil', 'FR'],
    ['Rnd 6', 'fasten off and weave in the end', 'US'],
    ['Tour 7', 'changer de couleur : 6 ms', 'FR'],
    ['Rnd 7', 'change to color B, 6 sc', 'US'],
    ['Rnd 8', 'sc in each st around', 'US'],
    ['', '6 sc', 'US'],
  ] as const)('%s « %s »', (label, body, convention) => {
    expect(stepToRound(step(label, body), 'round', convention)).toBeNull();
  });

  it('refuse un tour dont le compte écrit contredit le compte calculé', () => {
    expect(stepToRound(step('Rnd 2', '6 sc inc (18)'), 'round')).toBeNull();
    expect(stepToRound(step('Rnd 2', '6 sc inc (12)'), 'round')).not.toBeNull();
    expect(stepToRound(step('Tour 2', '*1 ms, 1 aug ms* x 6 (20)'), 'round', 'FR')).toBeNull();
  });

  it('borne les tours et les mailles, sans exception', () => {
    expect(stepToRound(step('Rnd 1', '401 sc'), 'round')).toBeNull();
    expect(stepToRound(step('Rnd 1', '*sc, sc inc* x 999999999999'), 'round')).toBeNull();
    expect(stepToRound(step('Rnd 1', '*sc* x 300, 101 sc'), 'round')).toBeNull();
    const long: PatternStep[] = Array.from({ length: 250 }, (_, i) => step(`Rnd ${i + 1}`, '6 sc'));
    const chart = pieceToChart({ name: 'Long', steps: long });
    expect(chart.rounds).toHaveLength(250);
    expect(chart.drawable).toBe(200);
    expect(chart.rounds[200]).toBeNull();
  });
});

describe('pieceToChart', () => {
  it('déduit le genre des libellés et compte les étapes dessinables', () => {
    const chart = pieceToChart({
      name: 'Boule',
      steps: [
        step('Rang 1', '6 ms dans un cercle magique (6)'),
        step('Rang 2', '6 aug ms (12)'),
        step('Rang 3', 'bourrer'),
      ],
    });
    expect(chart.kind).toBe('row');
    expect(chart.rounds.map((round) => round !== null)).toEqual([true, true, false]);
    expect(chart.drawable).toBe(2);
  });

  it('lit un patron écrit en français, en britannique et en américain', () => {
    const texts: readonly [Convention, string, string][] = [
      ['FR', 'Tour 1 : 6 ms dans un cercle magique (6)', 'ms'],
      ['UK', 'Rnd 1: 6 htr in a magic ring (6)', 'hdc'],
      ['US', 'Rnd 1: 6 sc in a magic ring (6)', 'sc'],
    ];
    for (const [convention, line, symbol] of texts) {
      const piece = parsePattern(`Pièce\n${line}`).pieces[0];
      expect(detectConvention(piece.steps)).toBe(convention);
      const chart = pieceToChart(piece);
      expect(chart.rounds[0]?.groups[0].tokens[0].count).toBe(6);
      expect(chart.rounds[0]?.groups[0].tokens[0].symbol).toBe(symbol === 'ms' ? 'sc' : symbol);
    }
  });

  it('dessine toutes les étapes du patron d’exemple, une plage « 5-8 » en quatre tours', () => {
    const pieces = parsePattern(DEMO_PATTERN).pieces;
    for (const piece of pieces) {
      const chart = pieceToChart(piece);
      expect(chart.drawable, piece.name).toBe(piece.steps.length);
    }
    const tree = pieceToChart(pieces[0]);
    expect(tree.numbers).toEqual([1, 2, 3, 4, 5, 9, 10, 11]);
    expect(tree.spans).toEqual([1, 1, 1, 1, 4, 1, 1, 1]);
    // Chaque tour de « Rounds 5-8 » a ses 24 mailles.
    expect(tree.stitches).toEqual([6, 6, 12, 18, 96, 18, 12, 6]);
  });

  it('répète « sc around » autant que le tour précédent a de mailles', () => {
    const chart = pieceToChart({
      name: 'Champignon',
      steps: [step('1', '6sc in mr'), step('2', '(inc)x6 (12)'), step('3', 'sc around')],
    });
    expect(chart.stitches).toEqual([6, 6, 12]);
    expect(chart.rounds[2]?.groups).toEqual([group('sc', 12)]);
  });

  it('garde le compte écrit d’une étape non dessinée pour la suivante', () => {
    const chart = pieceToChart({
      name: 'Bonnet',
      steps: [step('Rnd 1', 'crab st around (42)'), step('Rnd 2', 'sc around')],
    });
    expect(chart.rounds[0]).toBeNull();
    expect(chart.stitches[1]).toBe(42);
  });
});

/**
 * Formes relevées dans des patrons réels (fixtures et patron d'exemple) : le
 * compte attendu est celui que la lectrice crochète, maille de fermeture et
 * chaînette de départ comprises quand le patron les écrit.
 */
describe('stepToRound : formes des patrons trouvés en ligne', () => {
  const CASES: readonly (readonly [string, Convention, number, number])[] = [
    // [consigne, convention, mailles du tour précédent, mailles dessinées]
    ['in magic ring, 6 sc (6)', 'US', 0, 6],
    ['6sc in Magic Ring (6)', 'US', 0, 6],
    ['6sc in mr', 'US', 0, 6],
    ['inc in each st around (12)', 'US', 6, 6],
    ['2sc in each sc around (12)', 'US', 6, 6],
    ['[sc, inc] x 6 (18)', 'US', 12, 12],
    ['[2 sc, inc] x 6 (24)', 'US', 18, 18],
    ['(sc, inc)x6 (18)', 'US', 12, 12],
    ['(inc)x6 - (12)', 'US', 6, 6],
    ['(sc3, inc)x6 (30)', 'US', 24, 24],
    ['(sc2, inc, sc2)x6 (36)', 'US', 30, 30],
    ['[2 sc, dec] x 6 (18)', 'US', 24, 18],
    ['[sc, dec] x 6 (12) Attach safety eyes between rounds 6 and 7. Stuff firmly.', 'US', 18, 12],
    ['dec x 6 (6)', 'US', 12, 6],
    ['*2sc, 2sc in next*repeat 4x (16)', 'US', 12, 12],
    ['1sc in BLO around (16)', 'US', 16, 17],
    ['1sc in each sc (both loops)(16)', 'US', 16, 16],
    ['sc around (18) (2rnds)', 'US', 18, 18],
    ['6sc, chain 1, turn (6)', 'US', 6, 7],
    ['[sl st, ch 3, sl st in next st] x 5', 'US', 10, 25],
    [
      'Into a magic ring, chain 2, dc 11, sl st to first dc [not the chain!], pull ring closed. (12)',
      'US',
      0,
      14,
    ],
    ['Ch 2, dc inc into same stitch, dc inc around, sl st to first dc (24)', 'US', 12, 15],
    [
      'Ch 2, dc into same stitch, dc inc, *dc 1, dc inc* around, sl st to first dc (36)',
      'US',
      24,
      27,
    ],
    ['In 2nd Chain from hook, make 4 sc’s. Do not slip stitch into the next stitch.', 'US', 0, 4],
    ['sc in each of the next 4 sc’s.', 'US', 4, 4],
    [
      '(Increase row): 2 sc in the next sc, sc in the next stitch, 2 sc in the next sc, sc in the next stitch.',
      'US',
      4,
      4,
    ],
    [
      'Ch 3, dc in same stitch, 2 dc’s in the next 5 sc’s. Join with slip stitch to the beginning chain 3.',
      'US',
      6,
      10,
    ],
    ['Ch1, sc in next 48 stitches, join with slip stitch to beginning sc.', 'US', 48, 50],
    ['*sc, inc; rep from * around (18)', 'US', 12, 12],
    ['6 ms dans un cercle magique (6)', 'FR', 0, 6],
    ['6 aug (12)', 'FR', 6, 6],
    ['*1 ms, 1 aug* x 6 (18)', 'FR', 12, 12],
    ['1 ms dans chaque maille (18)', 'FR', 18, 18],
    ['(1 ms, 1 dim) x 6 (12)', 'FR', 18, 12],
  ];

  it.each(CASES)('« %s » (%s)', (body, convention, previous, cells) => {
    const round = stepToRound(step('Rnd 2', body), 'round', convention, previous);
    expect(round).not.toBeNull();
    expect(roundSymbols(round!)).toHaveLength(cells);
  });

  it('refuse une plage de tours qui contredit son compte écrit', () => {
    expect(stepToRound(step('Rnd 3', '[sc, inc] x 6 (20)'), 'round', 'US', 12)).toBeNull();
    expect(stepToRound(step('Rnd 3', 'sc around'), 'round', 'US', 0)).toBeNull();
  });
});

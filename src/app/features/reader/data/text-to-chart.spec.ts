import { describe, expect, it } from 'vitest';
import { Convention, Group, Round, renderRound, stitchCount } from './chart-composer';
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

  it('affiche le nombre d’étapes dessinables du patron d’exemple', () => {
    const lines = parsePattern(DEMO_PATTERN).pieces.map((piece) => {
      const chart = pieceToChart(piece);
      return `${piece.name} : ${chart.drawable}/${piece.steps.length}`;
    });
    console.info(`Étapes dessinables par pièce — ${lines.join(' · ')}`);
    expect(lines.length).toBeGreaterThan(0);
  });
});

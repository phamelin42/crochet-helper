import { parsePattern } from '../../reader/data/pattern-parser';
import {
  CIRCLE_STITCHES,
  CircleLocale,
  MAX_CIRCLE_ROUNDS,
  circlePattern,
  circleRounds,
  increasesPerRound,
} from './circle';

const LOCALES: readonly CircleLocale[] = ['fr', 'en'];

describe('circleRounds', () => {
  it('annonce 6, 8 et 12 augmentations par rang', () => {
    expect(CIRCLE_STITCHES.map(increasesPerRound)).toEqual([6, 8, 12]);
  });

  for (const locale of LOCALES) {
    for (const stitch of CIRCLE_STITCHES) {
      it(`${stitch} (${locale}) : +augmentations à chaque rang, de 1 à ${MAX_CIRCLE_ROUNDS}`, () => {
        const k = increasesPerRound(stitch);
        for (let n = 1; n <= MAX_CIRCLE_ROUNDS; n++) {
          const rounds = circleRounds(stitch, n, locale);
          expect(rounds).not.toBeNull();
          expect(rounds).toHaveLength(n);
          rounds!.forEach((r, i) => {
            expect(r.total).toBe(i === 0 ? k : rounds![i - 1].total + k);
            expect(r.text).toContain(`(${r.total})`);
          });
        }
      });

      it(`${stitch} (${locale}) : le texte passe le parseur, une étape par rang`, () => {
        for (let n = 1; n <= MAX_CIRCLE_ROUNDS; n++) {
          const text = circlePattern(stitch, n, locale)!;
          const pattern = parsePattern(text);
          // Un rang par étape, puis la consigne d'arrêt du fil, étape sans libellé.
          expect(pattern.total).toBe(n + 1);
          expect(pattern.pieces).toHaveLength(1);
          const steps = pattern.pieces[0].steps;
          steps.slice(0, n).forEach((step, i) => {
            expect(step.label).toBe(`${locale === 'fr' ? 'Rang' : 'Round'} ${i + 1}`);
          });
          expect(steps[n].label).toBe('');
          expect(steps[n].body).toBe(locale === 'fr' ? 'Arrêter le fil.' : 'Fasten off.');
        }
      });
    }
  }

  it('écrit le motif du rang 3 en maille serrée, dans les deux langues', () => {
    expect(circleRounds('sc', 3, 'en')![2].text).toBe('Round 3: [sc, inc] x 6 (18)');
    expect(circleRounds('sc', 3, 'fr')![2].text).toBe('Rang 3 : [ms, aug] x 6 (18)');
    expect(circleRounds('dc', 4, 'fr')![3].text).toBe('Rang 4 : [2 br, aug] x 12 (48)');
  });

  it('chaque rang compte les mailles du précédent plus les augmentations', () => {
    // n − 2 mailles simples + 1 augmentation (2 mailles) par répétition : k × n.
    for (const stitch of CIRCLE_STITCHES) {
      for (const r of circleRounds(stitch, MAX_CIRCLE_ROUNDS)!.slice(1)) {
        expect(r.repeats * (r.between + 2)).toBe(r.total);
      }
    }
  });

  it('refuse une saisie invalide sans exception', () => {
    expect(circleRounds('sc', 0)).toBeNull();
    expect(circleRounds('sc', MAX_CIRCLE_ROUNDS + 1)).toBeNull();
    expect(circleRounds('sc', 2.5)).toBeNull();
    expect(circleRounds('sc', Number.NaN)).toBeNull();
    expect(circleRounds('sc', '4')).toBeNull();
    expect(circleRounds('tr', 4)).toBeNull();
    expect(circleRounds(undefined, 4)).toBeNull();
    expect(circlePattern('sc', 0, 'fr')).toBeNull();
  });
});

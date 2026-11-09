export type CircleStitch = 'sc' | 'hdc' | 'dc';
export type CircleLocale = 'fr' | 'en';

export const CIRCLE_STITCHES: readonly CircleStitch[] = ['sc', 'hdc', 'dc'];
export const MIN_CIRCLE_ROUNDS = 1;
export const MAX_CIRCLE_ROUNDS = 30;

/**
 * Augmentations par rang. La règle est arithmétique : une maille plus haute
 * dessine un cercle plus grand, il faut donc plus de mailles pour le remplir.
 * 6 en maille serrée et 12 en bride sont les valeurs établies ; 8 en demi-bride
 * est le compromis courant des patrons (9 donne un disque un peu plus plat).
 */
const INCREASES: Record<CircleStitch, number> = { sc: 6, hdc: 8, dc: 12 };

export interface CircleRound {
  /** Numéro du rang, à partir de 1. */
  readonly round: number;
  /** Mailles à la fin du rang. */
  readonly total: number;
  /** Nombre de répétitions du motif (= augmentations du rang). */
  readonly repeats: number;
  /** Mailles simples entre deux augmentations ; 0 aux rangs 1 et 2. */
  readonly between: number;
  /** Ligne de patron, au vocabulaire du glossaire. */
  readonly text: string;
}

const TERMS: Record<CircleLocale, Record<CircleStitch, string>> = {
  en: { sc: 'sc', hdc: 'hdc', dc: 'dc' },
  fr: { sc: 'ms', hdc: 'db', dc: 'br' },
};

export function increasesPerRound(stitch: CircleStitch): number {
  return INCREASES[stitch];
}

function isStitch(value: unknown): value is CircleStitch {
  return typeof value === 'string' && (CIRCLE_STITCHES as readonly string[]).includes(value);
}

/**
 * Les rangs d'un disque, un par ligne. Rang 1 : `k` mailles dans un cercle
 * magique ; rang n ≥ 2 : `k` répétitions de « n − 2 mailles, 1 augmentation »,
 * soit `k × n` mailles. `null` si la saisie est invalide, jamais d'exception.
 */
export function circleRounds(
  stitch: unknown,
  rounds: unknown,
  locale: CircleLocale = 'en',
): readonly CircleRound[] | null {
  if (!isStitch(stitch)) return null;
  if (typeof rounds !== 'number' || !Number.isInteger(rounds)) return null;
  if (rounds < MIN_CIRCLE_ROUNDS || rounds > MAX_CIRCLE_ROUNDS) return null;
  const k = INCREASES[stitch];
  const term = TERMS[locale][stitch];
  const fr = locale === 'fr';
  const inc = fr ? 'aug' : 'inc';
  const label = fr ? 'Rang' : 'Round';
  const colon = fr ? ' :' : ':';

  const result: CircleRound[] = [];
  for (let n = 1; n <= rounds; n++) {
    const total = k * n;
    let between = 0;
    let body: string;
    if (n === 1) {
      body = fr ? `${k} ${term} dans un cercle magique` : `in magic ring, ${k} ${term}`;
    } else if (n === 2) {
      body = fr ? `${inc} dans chaque m` : `${inc} in each st around`;
    } else {
      between = n - 2;
      const plain = between === 1 ? term : `${between} ${term}`;
      body = `[${plain}, ${inc}] x ${k}`;
    }
    result.push({
      round: n,
      total,
      repeats: k,
      between,
      text: `${label} ${n}${colon} ${body} (${total})`,
    });
  }
  return result;
}

/** Le patron entier, prêt à être ouvert dans le lecteur. */
export function circlePattern(
  stitch: CircleStitch,
  rounds: number,
  locale: CircleLocale,
): string | null {
  const list = circleRounds(stitch, rounds, locale);
  if (!list) return null;
  const title = locale === 'fr' ? `Disque de ${rounds} rangs` : `${rounds}-round circle`;
  const closing = locale === 'fr' ? 'Arrêter le fil.' : 'Fasten off.';
  return [title, '', ...list.map((r) => r.text), closing].join('\n');
}

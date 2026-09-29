// `data/` est du domaine partagé : import autorisé d'une autre fonctionnalité.
import { HOOK_SIZES, HookSize } from '../../converter/data/hook-sizes';

export type Unit = 'cm' | 'in';

/** Mailles et rangs sur la longueur de référence : 10 cm ou 4 pouces. */
export interface Gauge {
  readonly stitches: number;
  readonly rows: number;
}

export type GaugeAdvice = 'ok' | 'go-up' | 'go-down';

export interface GaugeComparison {
  /** Mailles de la lectrice ÷ mailles du patron. */
  readonly stitchRatio: number;
  readonly rowRatio: number;
  readonly advice: GaugeAdvice;
}

/** Écart toléré avant de conseiller de changer de crochet. */
const TOLERANCE = 0.05;
const MIN_GAUGE = 1;
const MAX_GAUGE = 100;
/** Bornes de largeur plausibles, dans l'unité de la lectrice (0,5 à 500 cm). */
const WIDTH_RANGE: Record<Unit, readonly [number, number]> = { cm: [0.5, 500], in: [0.2, 200] };
/** Un ouvrage large compte des centaines de mailles : la borne de 100 ne vaut que pour un échantillon. */
const MAX_STITCH_COUNT = 5000;

/** Longueur sur laquelle un échantillon est exprimé. */
export function referenceLength(unit: Unit): number {
  return unit === 'cm' ? 10 : 4;
}

function inRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

export function isValidGauge(gauge: Gauge): boolean {
  return inRange(gauge.stitches, MIN_GAUGE, MAX_GAUGE) && inRange(gauge.rows, MIN_GAUGE, MAX_GAUGE);
}

export function isValidWidth(width: number, unit: Unit): boolean {
  return inRange(width, ...WIDTH_RANGE[unit]);
}

/**
 * Trop de mailles sur la longueur de référence : l'ouvrage est serré, il faut
 * un crochet plus gros (`go-up`). Un écart de 5 % ou moins reste `ok`.
 */
export function compareGauges(pattern: Gauge, mine: Gauge): GaugeComparison | null {
  if (!isValidGauge(pattern) || !isValidGauge(mine)) return null;
  const stitchRatio = mine.stitches / pattern.stitches;
  const rowRatio = mine.rows / pattern.rows;
  // Écart en mailles plutôt que sur le rapport : 21/20 flotte à 1,0500000000000000x.
  const gap = Math.abs(mine.stitches - pattern.stitches);
  let advice: GaugeAdvice = 'ok';
  if (gap > TOLERANCE * pattern.stitches + 1e-9) {
    advice = mine.stitches > pattern.stitches ? 'go-up' : 'go-down';
  }
  return { stitchRatio, rowRatio, advice };
}

/** Nombre entier de mailles à monter pour une largeur donnée. */
export function stitchesFor(width: number, mine: Gauge, unit: Unit): number | null {
  if (!isValidGauge(mine) || !isValidWidth(width, unit)) return null;
  return Math.round((width * mine.stitches) / referenceLength(unit));
}

/** Largeur, au dixième, que donne ce nombre de mailles. */
export function widthFor(stitches: number, mine: Gauge, unit: Unit): number | null {
  if (!isValidGauge(mine) || !inRange(stitches, 1, MAX_STITCH_COUNT)) return null;
  return Math.round(((stitches * referenceLength(unit)) / mine.stitches) * 10) / 10;
}

/** La taille du tableau juste au-dessus ou juste au-dessous de `mm`, `null` au bout du tableau. */
export function nextHook(mm: number, direction: 'up' | 'down'): HookSize | null {
  if (!Number.isFinite(mm) || mm <= 0) return null;
  if (direction === 'up') return HOOK_SIZES.find((size) => size.mm > mm) ?? null;
  return [...HOOK_SIZES].reverse().find((size) => size.mm < mm) ?? null;
}

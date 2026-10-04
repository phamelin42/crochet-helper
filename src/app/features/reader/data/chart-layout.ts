import { roundSymbols } from './chart-composer';
import type { PieceChart } from './text-to-chart';

/** Côté d'une maille à l'échelle 1 : au doigt, 32 px est le minimum (fiche 45). */
export const CELL = 40;
/** Écart entre deux tours, d'un bord de maille à l'autre. */
const GAP = 12;
/** Marge d'un rang, de chaque côté : son numéro et le sens de lecture y tiennent. */
const MARGIN = CELL;

export interface ChartCell {
  /** Indice de l'étape dans la pièce : c'est aussi celui du tour. */
  readonly round: number;
  /**
   * Rang de la maille dans l'étape, à partir de 0, dans l'ordre de lecture.
   * Une étape « Tours 5-8 » de 24 mailles en compte 96, tour 6 à partir de 24.
   */
  readonly stitch: number;
  readonly symbol: string;
  /** Centre de la maille. */
  readonly x: number;
  readonly y: number;
  /** Degrés, sens horaire : le haut du symbole regarde l'extérieur du tour. 0 pour un rang. */
  readonly angle: number;
}

/** Numéro d'un tour ou d'un rang, là où il commence ; une flèche dit le sens d'un rang. */
export interface ChartLabel {
  readonly step: number;
  readonly text: string;
  readonly x: number;
  readonly y: number;
}

/** Place d'un tour ou d'un rang que le texte ne permet pas de dessiner. */
export type ChartGap =
  | { readonly step: number; readonly kind: 'ring'; readonly r: number }
  | { readonly step: number; readonly kind: 'line'; readonly y: number };

export interface PieceLayout {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly ChartCell[];
  readonly labels: readonly ChartLabel[];
  readonly gaps: readonly ChartGap[];
}

/** Un tour ou un rang dessiné : une étape « Tours 5-8 » en donne quatre. */
interface Ring {
  readonly step: number;
  readonly number: number;
  /** Rang de ce tour dans son étape : 0 pour le tour 5 de « Tours 5-8 ». */
  readonly repeat: number;
  /** null : l'étape ne se dessine pas. */
  readonly symbols: readonly string[] | null;
}

function ringsOf(chart: PieceChart): Ring[] {
  return chart.rounds.flatMap((round, step) => {
    const symbols = round ? roundSymbols(round) : null;
    const span = chart.spans[step] ?? 1;
    const first = chart.numbers[step] ?? step + 1;
    return Array.from({ length: span }, (_, repeat) => ({
      step,
      number: first + repeat,
      repeat,
      symbols,
    }));
  });
}

/**
 * Positions des mailles d'une pièce, en unités du dessin : la pièce entière,
 * toutes ses étapes, comme sur un diagramme imprimé.
 *
 * Tours : cercles concentriques, la première maille à midi, puis dans le sens
 * horaire ; le numéro du tour occupe la place juste avant midi, là où le tour
 * commence et finit. Rangs : du bas vers le haut, le rang 1 en bas, lus de
 * droite à gauche aux rangs impairs et de gauche à droite aux pairs (un
 * ouvrage travaillé à plat se lit ainsi), le numéro du côté où le rang
 * commence. Une étape non dessinable garde sa place, en pointillé, pour que
 * les numéros restent ceux du patron.
 */
export function layoutPiece(chart: PieceChart): PieceLayout {
  const rings = ringsOf(chart);
  if (!rings.some((ring) => ring.symbols?.length)) {
    return { width: 0, height: 0, cells: [], labels: [], gaps: [] };
  }
  return chart.kind === 'round' ? layoutRounds(rings) : layoutRows(rings);
}

function layoutRounds(rings: readonly Ring[]): PieceLayout {
  // Un tour ne peut pas être plus serré que ses mailles : son rayon suit leur nombre.
  // Une place de plus que de mailles : celle du numéro.
  const radii: number[] = [];
  let previous = -CELL / 2;
  for (const ring of rings) {
    const slots = (ring.symbols?.length ?? 0) + 1;
    const fitting = (slots * CELL) / (2 * Math.PI);
    previous = Math.max(previous + CELL + GAP, fitting, CELL);
    radii.push(previous);
  }
  const size = twoDecimals(2 * ((radii.at(-1) ?? 0) + CELL));
  const centre = size / 2;
  const at = (radius: number, degrees: number) => {
    const radians = (degrees * Math.PI) / 180;
    return {
      x: twoDecimals(centre + radius * Math.sin(radians)),
      y: twoDecimals(centre - radius * Math.cos(radians)),
    };
  };

  const cells: ChartCell[] = [];
  const labels: ChartLabel[] = [];
  const gaps: ChartGap[] = [];
  rings.forEach((ring, i) => {
    const radius = radii[i];
    const text = String(ring.number);
    if (!ring.symbols?.length) {
      gaps.push({ step: ring.step, kind: 'ring', r: twoDecimals(radius) });
      labels.push({ step: ring.step, text, ...at(radius, 0) });
      return;
    }
    const symbols = ring.symbols;
    const slot = 360 / (symbols.length + 1);
    symbols.forEach((symbol, stitch) => {
      const angle = twoDecimals(slot * stitch);
      cells.push({
        round: ring.step,
        stitch: ring.repeat * symbols.length + stitch,
        symbol,
        ...at(radius, angle),
        angle,
      });
    });
    labels.push({ step: ring.step, text, ...at(radius, 360 - slot) });
  });
  return { width: size, height: size, cells, labels, gaps };
}

function layoutRows(rings: readonly Ring[]): PieceLayout {
  const widest = Math.max(1, ...rings.map((ring) => ring.symbols?.length ?? 0));
  const pitch = CELL + GAP;
  const height = rings.length * pitch + GAP;
  const width = widest * CELL + 2 * MARGIN;

  const cells: ChartCell[] = [];
  const labels: ChartLabel[] = [];
  const gaps: ChartGap[] = [];
  rings.forEach((ring, i) => {
    const y = height - GAP / 2 - (i + 0.5) * pitch;
    // Rang impair : de droite à gauche, comme on le crochète sur l'endroit.
    const rightToLeft = ring.number % 2 !== 0;
    labels.push({
      step: ring.step,
      text: rightToLeft ? `← ${ring.number}` : `${ring.number} →`,
      x: rightToLeft ? width - MARGIN / 2 : MARGIN / 2,
      y,
    });
    if (!ring.symbols?.length) {
      gaps.push({ step: ring.step, kind: 'line', y });
      return;
    }
    const symbols = ring.symbols;
    const left = MARGIN + ((widest - symbols.length) * CELL) / 2;
    symbols.forEach((symbol, stitch) => {
      const column = rightToLeft ? symbols.length - 1 - stitch : stitch;
      cells.push({
        round: ring.step,
        stitch: ring.repeat * symbols.length + stitch,
        symbol,
        x: twoDecimals(left + (column + 0.5) * CELL),
        y,
        angle: 0,
      });
    });
  });
  return { width, height, cells, labels, gaps };
}

/** Deux décimales : un SVG de 400 mailles n'a pas besoin de plus. */
function twoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

import { roundSymbols } from './chart-composer';
import type { PieceChart } from './text-to-chart';

/** Côté d'une maille à l'échelle 1 : au doigt, 32 px est le minimum (fiche 45). */
export const CELL = 40;
/** Écart entre deux tours, d'un bord de maille à l'autre. */
const GAP = 12;

export interface ChartCell {
  /** Indice de l'étape dans la pièce : c'est aussi celui du tour. */
  readonly round: number;
  /** Rang de la maille dans le tour, à partir de 0, dans l'ordre de lecture. */
  readonly stitch: number;
  readonly symbol: string;
  /** Centre de la maille. */
  readonly x: number;
  readonly y: number;
  /** Degrés, sens horaire : le haut du symbole regarde l'extérieur du tour. 0 pour un rang. */
  readonly angle: number;
}

export interface PieceLayout {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly ChartCell[];
}

/**
 * Positions des mailles d'une pièce, en unités du dessin.
 *
 * Tours : cercles concentriques, la première maille à midi, puis dans le sens
 * horaire. Rangs : du bas vers le haut, le rang 1 en bas, lus de droite à
 * gauche aux rangs impairs et de gauche à droite aux pairs (un ouvrage
 * travaillé à plat se lit ainsi). Une étape non dessinable (`null`) garde sa
 * place, sans maille, pour que les numéros restent ceux du patron.
 */
export function layoutPiece(chart: PieceChart): PieceLayout {
  const symbols = chart.rounds.map((round) => (round ? roundSymbols(round) : []));
  return chart.kind === 'round' ? layoutRounds(symbols) : layoutRows(symbols);
}

function layoutRounds(rounds: readonly string[][]): PieceLayout {
  // Un tour ne peut pas être plus serré que ses mailles : son rayon suit leur nombre.
  const radii: number[] = [];
  let previous = -CELL / 2;
  for (const symbols of rounds) {
    const fitting = (symbols.length * CELL) / (2 * Math.PI);
    previous = Math.max(previous + CELL + GAP, fitting, CELL);
    radii.push(previous);
  }
  const size = 2 * ((radii.at(-1) ?? 0) + CELL);
  const centre = size / 2;
  const cells = rounds.flatMap((symbols, round) =>
    symbols.map((symbol, stitch): ChartCell => {
      const angle = (360 * stitch) / symbols.length;
      const radians = (angle * Math.PI) / 180;
      return {
        round,
        stitch,
        symbol,
        x: twoDecimals(centre + radii[round] * Math.sin(radians)),
        y: twoDecimals(centre - radii[round] * Math.cos(radians)),
        angle,
      };
    }),
  );
  return { width: size, height: size, cells };
}

function layoutRows(rows: readonly string[][]): PieceLayout {
  const widest = Math.max(1, ...rows.map((symbols) => symbols.length));
  const pitch = CELL + GAP;
  const height = rows.length * pitch + GAP;
  const width = widest * CELL;
  const cells = rows.flatMap((symbols, round) =>
    symbols.map((symbol, stitch): ChartCell => {
      const rightToLeft = round % 2 === 0;
      const column = rightToLeft ? symbols.length - 1 - stitch : stitch;
      return {
        round,
        stitch,
        symbol,
        x: twoDecimals((width - symbols.length * CELL) / 2 + (column + 0.5) * CELL),
        y: height - GAP / 2 - (round + 0.5) * pitch,
        angle: 0,
      };
    }),
  );
  return { width, height, cells };
}

/** Deux décimales : un SVG de 400 mailles n'a pas besoin de plus. */
function twoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

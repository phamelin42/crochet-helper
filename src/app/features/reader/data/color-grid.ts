import type { Locale } from '../../../core/i18n/locale';

/** Bornes : une grille importée est une entrée d'un tiers, jamais d'exception. */
export const MIN_GRID_SIDE = 4;
export const MAX_GRID_SIDE = 150;
export const MIN_PALETTE = 2;
export const MAX_PALETTE = 12;

export interface ColorGrid {
  /** Mailles par rang, 4 à 150. */
  readonly width: number;
  /** Rangs, 4 à 150. */
  readonly height: number;
  /** `#rrggbb`, 2 à 12 couleurs ; la lettre A, B… est l'indice dans la liste. */
  readonly palette: readonly string[];
  /** `width × height` indices de palette, rang 1 en bas, ligne par ligne, de gauche à droite. */
  readonly cells: Uint8Array;
  /** À plat, le sens de travail alterne ; en rond, c'est toujours le même. */
  readonly worked: 'flat' | 'round';
}

export interface ColorRun {
  readonly color: number;
  readonly count: number;
}

const HEX = /^#[0-9a-f]{6}$/;
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

/** Lettre d'une couleur de la palette : A, B… */
export function colorLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

/**
 * Relit une grille inconnue (base IndexedDB, sauvegarde). Les cellules
 * s'acceptent en `Uint8Array` ou en base64, la forme du fichier de sauvegarde.
 */
export function validGrid(raw: unknown): ColorGrid | null {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as Record<string, unknown>;
  const { width, height, palette, worked } = g;
  if (!isSide(width) || !isSide(height)) return null;
  if (worked !== 'flat' && worked !== 'round') return null;
  if (
    !Array.isArray(palette) ||
    palette.length < MIN_PALETTE ||
    palette.length > MAX_PALETTE ||
    !palette.every((color) => typeof color === 'string' && HEX.test(color))
  ) {
    return null;
  }
  const cells = readCells(g['cells'], width * height);
  if (!cells || cells.some((index) => index >= palette.length)) return null;
  return { width, height, palette: [...palette], cells, worked };
}

function isSide(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_GRID_SIDE &&
    value <= MAX_GRID_SIDE
  );
}

function readCells(value: unknown, length: number): Uint8Array | null {
  if (value instanceof Uint8Array) return value.length === length ? new Uint8Array(value) : null;
  // Longueur vérifiée avant décodage : une chaîne démesurée ne doit rien allouer.
  if (
    typeof value === 'string' &&
    value.length === 4 * Math.ceil(length / 3) &&
    BASE64.test(value)
  ) {
    try {
      const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
      return bytes.length === length ? bytes : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** La grille sous la forme d'un fichier de sauvegarde : cellules en base64. */
export function encodeGrid(grid: ColorGrid): Record<string, unknown> {
  let binary = '';
  grid.cells.forEach((index) => (binary += String.fromCharCode(index)));
  return { ...grid, cells: btoa(binary) };
}

/** Un rang à plat se travaille de droite à gauche au rang 1 (droitière), puis en alternance. */
export function worksRightToLeft(grid: ColorGrid, row: number): boolean {
  return grid.worked === 'round' || row % 2 === 0;
}

/** Colonne (0 = bord gauche) de la maille à cette position dans le sens de travail. */
export function columnOf(grid: ColorGrid, row: number, stitch: number): number {
  return worksRightToLeft(grid, row) ? grid.width - 1 - stitch : stitch;
}

/** Couleur de la maille à cette position dans le sens de travail. */
export function colorAt(grid: ColorGrid, row: number, stitch: number): number {
  return grid.cells[row * grid.width + columnOf(grid, row, stitch)];
}

/** Séries de mailles de même couleur d'un rang (à partir de 0), dans le sens de travail. */
export function rowRuns(grid: ColorGrid, row: number): ColorRun[] {
  const runs: { color: number; count: number }[] = [];
  for (let stitch = 0; stitch < grid.width; stitch++) {
    const color = colorAt(grid, row, stitch);
    const last = runs.at(-1);
    if (last?.color === color) last.count++;
    else runs.push({ color, count: 1 });
  }
  return runs;
}

const TERMS = {
  fr: { row: 'Rang', stitch: 'ms', colon: ' : ' },
  en: { row: 'Row', stitch: 'sc', colon: ': ' },
} as const;

/** Le patron écrit : « Rang 1 : 4 ms A, 2 ms B (6) », un rang par ligne. */
export function gridToText(grid: ColorGrid, locale: Locale): string {
  const term = TERMS[locale];
  const lines: string[] = [];
  for (let row = 0; row < grid.height; row++) {
    const runs = rowRuns(grid, row)
      .map(({ color, count }) => `${count} ${term.stitch} ${colorLetter(color)}`)
      .join(', ');
    lines.push(`${term.row} ${row + 1}${term.colon}${runs} (${grid.width})`);
  }
  return lines.join('\n');
}

/**
 * Mailles de la même couleur encore à faire après celle-ci, avant le prochain
 * changement ; `null` quand la série va jusqu'au bout du rang.
 */
export function nextChange(grid: ColorGrid, row: number, stitch: number): number | null {
  const color = colorAt(grid, row, stitch);
  let next = stitch + 1;
  while (next < grid.width && colorAt(grid, row, next) === color) next++;
  return next < grid.width ? next - stitch - 1 : null;
}

/** Total de mailles par couleur, pour acheter la laine. */
export function colorTotals(grid: ColorGrid): number[] {
  const totals = grid.palette.map(() => 0);
  grid.cells.forEach((index) => totals[index]++);
  return totals;
}

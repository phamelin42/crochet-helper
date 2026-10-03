import { ColorGrid, MAX_GRID_SIDE, MIN_GRID_SIDE, MIN_PALETTE } from './color-grid';

/** Largeur en mailles proposée à la lectrice. */
export const MIN_GRID_WIDTH = 10;
export const MAX_GRID_WIDTH = MAX_GRID_SIDE;
export const DEFAULT_GRID_WIDTH = 40;
export const DEFAULT_GRID_COLORS = 6;
/**
 * Côté le plus long de l'image décodée : quatre pixels au moins par maille à
 * 150 mailles, assez pour une moyenne de zone, et rien de plus à parcourir.
 */
export const DECODE_MAX_SIDE = 600;

export interface GridPixels {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

export interface GridOptions {
  readonly width: number;
  readonly colors: number;
  readonly worked: 'flat' | 'round';
}

type Rgb = readonly [number, number, number];

/**
 * Une image devient une grille de mailles serrées : une maille par zone de
 * l'image (moyenne de ses pixels, jamais un pixel isolé), puis une palette
 * réduite par coupe médiane. Déterministe : même image, mêmes réglages, même
 * grille. Une maille serrée est supposée carrée.
 */
export function imageToGrid(pixels: GridPixels, options: GridOptions): ColorGrid {
  const width = clamp(Math.round(options.width), MIN_GRID_WIDTH, MAX_GRID_WIDTH);
  const height = clamp(
    Math.round((width * pixels.height) / Math.max(1, pixels.width)),
    MIN_GRID_SIDE,
    MAX_GRID_SIDE,
  );
  const colors = clamp(Math.round(options.colors), MIN_PALETTE, 12);
  const averages = areaAverages(pixels, width, height);
  const palette = medianCut(averages, colors);
  const used = assign(averages, palette);
  // Seules les couleurs employées restent, de la plus claire à la plus foncée.
  const kept = palette
    .map((color, index) => ({ color, index }))
    .filter(({ index }) => used.counts[index] > 0)
    .sort((a, b) => luminance(b.color) - luminance(a.color));
  const remap = new Map(kept.map(({ index }, rank) => [index, rank]));
  const hex = kept.map(({ color }) => toHex(color));
  // Une image d'une seule couleur garde une palette valide : la seconde ne sert à aucune maille.
  if (hex.length < MIN_PALETTE) hex.push(hex[0] === '#ffffff' ? '#000000' : '#ffffff');
  // L'image a la ligne du haut en premier ; la grille, le rang 1 (le bas).
  const cells = new Uint8Array(width * height);
  for (let row = 0; row < height; row++) {
    const source = (height - 1 - row) * width;
    for (let column = 0; column < width; column++) {
      cells[row * width + column] = remap.get(used.indices[source + column]) ?? 0;
    }
  }
  return { width, height, palette: hex, cells, worked: options.worked };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

/** Couleur moyenne de chaque zone, ligne par ligne depuis le haut ; la transparence vaut du blanc. */
function areaAverages(pixels: GridPixels, width: number, height: number): Rgb[] {
  const { data } = pixels;
  const averages: Rgb[] = [];
  for (let row = 0; row < height; row++) {
    const top = Math.floor((row * pixels.height) / height);
    const bottom = Math.max(top + 1, Math.floor(((row + 1) * pixels.height) / height));
    for (let column = 0; column < width; column++) {
      const left = Math.floor((column * pixels.width) / width);
      const right = Math.max(left + 1, Math.floor(((column + 1) * pixels.width) / width));
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let y = top; y < bottom && y < pixels.height; y++) {
        for (let x = left; x < right && x < pixels.width; x++) {
          const i = (y * pixels.width + x) * 4;
          const alpha = data[i + 3] / 255;
          r += data[i] * alpha + 255 * (1 - alpha);
          g += data[i + 1] * alpha + 255 * (1 - alpha);
          b += data[i + 2] * alpha + 255 * (1 - alpha);
          n++;
        }
      }
      averages.push(n ? [r / n, g / n, b / n] : [255, 255, 255]);
    }
  }
  return averages;
}

/**
 * Coupe médiane : la boîte de couleurs la plus étendue est coupée en deux à
 * sa médiane, sur son axe le plus long, jusqu'à `count` boîtes. Chaque boîte
 * donne sa couleur moyenne. Aucun hasard : les égalités se tranchent par
 * l'ordre des boîtes et des axes.
 */
function medianCut(colors: readonly Rgb[], count: number): Rgb[] {
  const boxes: Rgb[][] = [colors.map((c) => c)];
  while (boxes.length < count) {
    let best = -1;
    let bestRange = 0;
    let bestAxis = 0;
    boxes.forEach((box, index) => {
      const [axis, range] = widestAxis(box);
      if (range > bestRange) {
        best = index;
        bestRange = range;
        bestAxis = axis;
      }
    });
    // Plus rien à couper : l'image a moins de couleurs que demandé.
    if (best < 0) break;
    const sorted = [...boxes[best]].sort(
      (a, b) => a[bestAxis] - b[bestAxis] || a[0] - b[0] || a[1] - b[1] || a[2] - b[2],
    );
    const middle = Math.floor(sorted.length / 2);
    boxes.splice(best, 1, sorted.slice(0, middle), sorted.slice(middle));
  }
  const means = boxes.map(mean);
  // Deux boîtes de même moyenne ne font qu'une couleur.
  return means.filter(
    (color, i) => means.findIndex((other) => toHex(other) === toHex(color)) === i,
  );
}

function widestAxis(box: readonly Rgb[]): [number, number] {
  if (box.length < 2) return [0, 0];
  let axis = 0;
  let range = 0;
  for (let c = 0; c < 3; c++) {
    let min = 255;
    let max = 0;
    for (const color of box) {
      if (color[c] < min) min = color[c];
      if (color[c] > max) max = color[c];
    }
    if (max - min > range) {
      range = max - min;
      axis = c;
    }
  }
  return [axis, range];
}

function mean(box: readonly Rgb[]): Rgb {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const color of box) {
    r += color[0];
    g += color[1];
    b += color[2];
  }
  return [r / box.length, g / box.length, b / box.length];
}

/** Chaque zone prend la couleur de palette la plus proche. */
function assign(
  colors: readonly Rgb[],
  palette: readonly Rgb[],
): { indices: Uint8Array; counts: number[] } {
  const indices = new Uint8Array(colors.length);
  const counts = palette.map(() => 0);
  colors.forEach((color, i) => {
    let best = 0;
    let bestDistance = Infinity;
    palette.forEach((candidate, index) => {
      const d =
        (color[0] - candidate[0]) ** 2 +
        (color[1] - candidate[1]) ** 2 +
        (color[2] - candidate[2]) ** 2;
      if (d < bestDistance) {
        best = index;
        bestDistance = d;
      }
    });
    indices[i] = best;
    counts[best]++;
  });
  return { indices, counts };
}

function luminance([r, g, b]: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function toHex(color: Rgb): string {
  return `#${color
    .map((c) =>
      Math.round(Math.min(255, Math.max(0, c)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

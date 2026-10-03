import { ColorGrid, MAX_GRID_SIDE, MAX_PALETTE, MIN_GRID_SIDE, MIN_PALETTE } from './color-grid';

/** Largeur en mailles qu'on propose à la lectrice : de quoi lire une image, sans fil à ne plus finir. */
export const MIN_IMAGE_GRID_WIDTH = 10;
export const MAX_IMAGE_GRID_WIDTH = MAX_GRID_SIDE;

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

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Math.round(value)));

/** Rang et mailles de la grille pour une image : une maille est à peu près carrée. */
export function gridSize(
  image: { width: number; height: number },
  width: number,
): { width: number; height: number } {
  const w = clamp(width, MIN_IMAGE_GRID_WIDTH, MAX_IMAGE_GRID_WIDTH);
  return {
    width: w,
    height: clamp((w * image.height) / image.width, MIN_GRID_SIDE, MAX_GRID_SIDE),
  };
}

/**
 * Réduit une image en grille de mailles serrées colorées : une moyenne de
 * zone par maille (un pixel isolé ne décide pas), puis une palette par coupe
 * médiane. Pure et déterministe : mêmes pixels, mêmes réglages, même grille.
 */
export function imageToGrid(pixels: GridPixels, options: GridOptions): ColorGrid {
  const { width, height } = gridSize(pixels, options.width);
  const colors = clamp(options.colors, MIN_PALETTE, MAX_PALETTE);
  const cells = averageCells(pixels, width, height);
  const palette = sortLightToDark(medianCut(cells, colors));
  return {
    width,
    height,
    palette: padPalette(palette).map(toHex),
    cells: indexCells(cells, palette, width, height),
    worked: options.worked,
  };
}

/** Couleur moyenne de chaque maille, de haut en bas dans l'image. */
function averageCells(pixels: GridPixels, width: number, height: number): Rgb[] {
  const cells: Rgb[] = [];
  const stepX = pixels.width / width;
  const stepY = pixels.height / height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells.push(averageZone(pixels, x * stepX, (x + 1) * stepX, y * stepY, (y + 1) * stepY));
    }
  }
  return cells;
}

/** Moyenne pondérée par la part de chaque pixel dans la zone ; un pixel transparent compte comme blanc. */
function averageZone(pixels: GridPixels, x0: number, x1: number, y0: number, y1: number): Rgb {
  let red = 0;
  let green = 0;
  let blue = 0;
  let weight = 0;
  for (let y = Math.floor(y0); y < Math.min(pixels.height, Math.ceil(y1)); y++) {
    const wy = Math.min(y + 1, y1) - Math.max(y, y0);
    for (let x = Math.floor(x0); x < Math.min(pixels.width, Math.ceil(x1)); x++) {
      const w = wy * (Math.min(x + 1, x1) - Math.max(x, x0));
      const at = (y * pixels.width + x) * 4;
      const alpha = pixels.data[at + 3] / 255;
      red += w * (pixels.data[at] * alpha + 255 * (1 - alpha));
      green += w * (pixels.data[at + 1] * alpha + 255 * (1 - alpha));
      blue += w * (pixels.data[at + 2] * alpha + 255 * (1 - alpha));
      weight += w;
    }
  }
  if (!weight) return [255, 255, 255];
  return [Math.round(red / weight), Math.round(green / weight), Math.round(blue / weight)];
}

/**
 * Coupe médiane : on découpe toujours la boîte dont un canal s'étend le plus,
 * en deux moitiés égales sur ce canal. Sans hasard, donc sans variation.
 */
function medianCut(cells: readonly Rgb[], count: number): Rgb[] {
  let boxes: Rgb[][] = [[...cells]];
  while (boxes.length < count) {
    let best = -1;
    let bestChannel = 0;
    let bestRange = 0;
    boxes.forEach((box, index) => {
      const { channel, range } = widestChannel(box);
      if (range > bestRange) {
        best = index;
        bestChannel = channel;
        bestRange = range;
      }
    });
    if (best < 0) break;
    const sorted = boxes[best]
      .map((color, index) => ({ color, index }))
      .sort((a, b) => a.color[bestChannel] - b.color[bestChannel] || a.index - b.index)
      .map(({ color }) => color);
    const middle = sorted.length >> 1;
    boxes = [
      ...boxes.slice(0, best),
      sorted.slice(0, middle),
      sorted.slice(middle),
      ...boxes.slice(best + 1),
    ];
  }
  // Deux boîtes de moyennes égales après arrondi ne font qu'une couleur.
  const unique = new Map(boxes.map((box) => [toHex(mean(box)), mean(box)] as const));
  return [...unique.values()];
}

function widestChannel(box: readonly Rgb[]): { channel: number; range: number } {
  let channel = 0;
  let range = 0;
  for (let c = 0; c < 3; c++) {
    let low = 255;
    let high = 0;
    for (const color of box) {
      low = Math.min(low, color[c]);
      high = Math.max(high, color[c]);
    }
    if (high - low > range) {
      range = high - low;
      channel = c;
    }
  }
  return { channel, range };
}

function mean(box: readonly Rgb[]): Rgb {
  const sum = [0, 0, 0];
  for (const color of box) for (let c = 0; c < 3; c++) sum[c] += color[c];
  return [
    Math.round(sum[0] / box.length),
    Math.round(sum[1] / box.length),
    Math.round(sum[2] / box.length),
  ];
}

const luminance = ([r, g, b]: Rgb): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Plus clair d'abord : la lettre A est le fond, en général. */
function sortLightToDark(palette: Rgb[]): Rgb[] {
  return palette
    .map((color, index) => ({ color, index }))
    .sort((a, b) => luminance(b.color) - luminance(a.color) || a.index - b.index)
    .map(({ color }) => color);
}

/** Une grille compte au moins deux couleurs : une image unie reçoit une seconde, inutilisée. */
function padPalette(palette: readonly Rgb[]): Rgb[] {
  if (palette.length >= MIN_PALETTE) return [...palette];
  const [only] = palette;
  return [only, luminance(only) > 127 ? [0, 0, 0] : [255, 255, 255]];
}

function indexCells(
  cells: readonly Rgb[],
  palette: readonly Rgb[],
  width: number,
  height: number,
): Uint8Array {
  const nearest = new Map<number, number>();
  const indices = new Uint8Array(width * height);
  cells.forEach((color, i) => {
    const key = (color[0] << 16) | (color[1] << 8) | color[2];
    let index = nearest.get(key);
    if (index === undefined) {
      index = closest(color, palette);
      nearest.set(key, index);
    }
    // Le rang 1 est en bas de l'image ; `cells` part du haut.
    const row = height - 1 - Math.floor(i / width);
    indices[row * width + (i % width)] = index;
  });
  return indices;
}

function closest(color: Rgb, palette: readonly Rgb[]): number {
  let best = 0;
  let bestDistance = Infinity;
  palette.forEach((candidate, index) => {
    const distance =
      (color[0] - candidate[0]) ** 2 +
      (color[1] - candidate[1]) ** 2 +
      (color[2] - candidate[2]) ** 2;
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

const toHex = (color: Rgb): string =>
  '#' + color.map((value) => value.toString(16).padStart(2, '0')).join('');

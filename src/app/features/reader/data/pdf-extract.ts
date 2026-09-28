/**
 * Adaptateur mince autour de pdf.js : seul fichier à l'importer, et jamais
 * depuis un test. Chargé paresseusement par l'appelant, pour que pdf.js ne
 * pèse pas sur le bundle initial.
 */
import type { PdfPageText } from './pdf-normalize';

/** Une photo du PDF, réduite et réencodée en JPEG. */
export interface ExtractedImage {
  readonly blob: Blob;
  readonly width: number;
  readonly height: number;
  /** Indice de la dernière ligne de texte de la page située au-dessus de l'image ; -1 si aucune. */
  readonly afterLine: number;
}

export interface ExtractedPage extends PdfPageText {
  readonly lines: readonly string[];
  readonly images: readonly ExtractedImage[];
}

export interface ExtractedPdf {
  readonly pages: readonly ExtractedPage[];
  /** Vrai si des photos ont été laissées de côté pour tenir dans les plafonds. */
  readonly truncated: boolean;
}

/** Plus long côté d'une photo enregistrée : assez pour l'agrandir sur tablette. */
const MAX_SIDE = 1280;
const JPEG_QUALITY = 0.8;
/** En dessous, c'est une puce, un pictogramme ou un filet, pas une photo. */
const MIN_SIDE = 80;
/** Une image présente sur autant de pages est un logo ou un bandeau. */
const REPEATED_PAGES = 3;
export const MAX_IMAGES = 40;
export const MAX_IMAGES_BYTES = 20 * 1024 * 1024;
/** Garde-fou mémoire avant le tri des images répétées : on ne sait qu'à la
 *  fin du document si une image était un logo, il faut donc pouvoir en garder
 *  un peu plus que le plafond final. */
const MAX_CANDIDATES = MAX_IMAGES * 3;
const MAX_CANDIDATE_BYTES = MAX_IMAGES_BYTES * 2;

/** Codes d'opérateur de pdf.js (`OPS`) dont on suit l'effet. */
interface PdfOps {
  readonly save: number;
  readonly restore: number;
  readonly transform: number;
  readonly paintFormXObjectBegin: number;
  readonly paintFormXObjectEnd: number;
  readonly paintImageXObject: number;
  readonly paintInlineImageXObject: number;
}

/** Données d'image telles que pdf.js les résout : un bitmap, ou des pixels bruts. */
interface PdfImageData {
  readonly width: number;
  readonly height: number;
  readonly bitmap?: ImageBitmap;
  readonly data?: Uint8ClampedArray | Uint8Array;
  readonly kind?: number;
}

interface PdfObjs {
  get(id: string, callback: (data: unknown) => void): unknown;
}

interface PdfTextItem {
  readonly str?: string;
  readonly hasEOL?: boolean;
  readonly transform?: readonly number[];
  readonly width?: number;
}

type Matrix = readonly [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function multiply(m: Matrix, n: readonly number[]): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

/** Boîte d'une image peinte : le carré unité transformé par la matrice courante. */
function imageBox(m: Matrix): { top: number; left: number; right: number } {
  const xs = [m[4], m[0] + m[4], m[2] + m[4], m[0] + m[2] + m[4]];
  const ys = [m[5], m[1] + m[5], m[3] + m[5], m[1] + m[3] + m[5]];
  return { top: Math.max(...ys), left: Math.min(...xs), right: Math.max(...xs) };
}

interface Line {
  readonly text: string;
  readonly y: number;
  readonly left: number;
  readonly right: number;
}

/** Une ligne par fin de ligne signalée (`hasEOL`), avec sa position dans la page. */
function toLines(items: readonly PdfTextItem[]): Line[] {
  const lines: Line[] = [];
  let text = '';
  let y = Number.NaN;
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  const flush = (): void => {
    lines.push({ text, y, left, right });
    text = '';
    y = Number.NaN;
    left = Number.POSITIVE_INFINITY;
    right = Number.NEGATIVE_INFINITY;
  };
  for (const item of items) {
    if (typeof item.str !== 'string') continue;
    text += item.str;
    const t = item.transform;
    if (item.str.trim() && t) {
      if (Number.isNaN(y)) y = t[5];
      left = Math.min(left, t[4]);
      right = Math.max(right, t[4] + (item.width ?? 0));
    }
    if (item.hasEOL) flush();
  }
  // Comme l'ancien `join('').split('\n')` : une dernière ligne, même vide,
  // pour que le texte d'un PDF sans image reste identique au caractère près.
  flush();
  return lines;
}

/**
 * Dernière ligne au-dessus de l'image, parmi celles qui la chevauchent
 * horizontalement : sur une mise en page à deux colonnes, la colonne voisine
 * ne doit pas décider de l'emplacement.
 */
function lineAbove(lines: readonly Line[], box: ReturnType<typeof imageBox>): number {
  const placed = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => !Number.isNaN(line.y));
  const overlapping = placed.filter(({ line }) => line.right > box.left && line.left < box.right);
  const candidates = overlapping.length ? overlapping : placed;
  let after = -1;
  for (const { line, index } of candidates)
    if (line.y >= box.top - 1) after = Math.max(after, index);
  return after;
}

/** Pixels bruts de pdf.js (niveaux de gris 1 bit exclus) → RGBA. */
function toRgba(image: PdfImageData): Uint8ClampedArray<ArrayBuffer> | null {
  const { width, height, data, kind } = image;
  if (!data) return null;
  const pixels = width * height;
  if (kind === 3 && data.length >= pixels * 4)
    return new Uint8ClampedArray(data.subarray(0, pixels * 4));
  if (kind !== 2 || data.length < pixels * 3) return null;
  const rgba = new Uint8ClampedArray(pixels * 4);
  for (let i = 0; i < pixels; i++) {
    rgba[i * 4] = data[i * 3];
    rgba[i * 4 + 1] = data[i * 3 + 1];
    rgba[i * 4 + 2] = data[i * 3 + 2];
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

/** Redessine l'image au plus long côté ≤ 1280 px, sur fond blanc (le JPEG n'a pas de transparence). */
async function encode(
  image: PdfImageData,
): Promise<{ blob: Blob; width: number; height: number } | null> {
  let source: CanvasImageSource | null = image.bitmap ?? null;
  if (!source) {
    const rgba = toRgba(image);
    if (!rgba) return null;
    const raw = new OffscreenCanvas(image.width, image.height);
    raw.getContext('2d')?.putImageData(new ImageData(rgba, image.width, image.height), 0, 0);
    source = raw;
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
  return { blob, width, height };
}

/** Empreinte du JPEG produit : deux images identiques donnent le même fichier. */
async function fingerprint(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let hash = 0x811c9dc5;
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193);
  return `${bytes.length}:${(hash >>> 0).toString(16)}`;
}

function resolveObject(objs: PdfObjs, id: string): Promise<PdfImageData | null> {
  return new Promise((resolve) => {
    try {
      objs.get(id, (data) => resolve((data as PdfImageData) ?? null));
    } catch {
      resolve(null);
    }
  });
}

/** Une image peinte sur une page, avant le tri des images répétées. */
interface Occurrence {
  readonly page: number;
  readonly afterLine: number;
  readonly top: number;
  readonly key: string;
}

interface Encoded {
  readonly blob: Blob;
  readonly width: number;
  readonly height: number;
}

type Upsert = (
  this: Map<unknown, unknown>,
  key: unknown,
  compute: (key: unknown) => unknown,
) => unknown;

/**
 * pdf.js 6 lit les images d'une page avec `Map.prototype.getOrInsertComputed`
 * (ES2026), absent des navigateurs d'avant 2026 (Chromium 141, Safari de
 * tablettes pas à jour). Sans lui, `getOperatorList` échoue et les photos
 * disparaissent sans bruit ; le texte, lui, n'en dépend pas. Posé ici, dans le
 * morceau paresseux du PDF, et seulement s'il manque.
 */
function ensureUpsert(): void {
  for (const proto of [Map.prototype, WeakMap.prototype]) {
    const target = proto as unknown as { getOrInsertComputed?: Upsert };
    target.getOrInsertComputed ??= function (key, compute) {
      if (!this.has(key)) this.set(key, compute(key));
      return this.get(key);
    };
  }
}

export async function extractPdfPages(file: File): Promise<ExtractedPdf> {
  ensureUpsert();
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const ops = pdfjs.OPS as unknown as PdfOps;
  const canEncode = typeof OffscreenCanvas !== 'undefined';

  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data });
  const document = await task.promise;

  const lines: string[][] = [];
  const occurrences: Occurrence[] = [];
  const encoded = new Map<string, Encoded>();
  /** Empreinte déjà calculée pour un objet partagé entre pages (`g_…`). */
  const keyById = new Map<string, string>();
  const pagesByKey = new Map<string, Set<number>>();
  let candidateBytes = 0;
  let truncated = false;

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageLines = toLines(content.items as PdfTextItem[]);
    lines.push(pageLines.map((line) => line.text));

    if (canEncode) {
      try {
        const list = await page.getOperatorList();
        let ctm: Matrix = IDENTITY;
        const stack: Matrix[] = [];
        for (let i = 0; i < list.fnArray.length; i++) {
          const fn = list.fnArray[i];
          const args = list.argsArray[i] as unknown[] | null;
          if (fn === ops.save) stack.push(ctm);
          else if (fn === ops.restore) ctm = stack.pop() ?? IDENTITY;
          else if (fn === ops.transform) ctm = multiply(ctm, args as number[]);
          else if (fn === ops.paintFormXObjectBegin) {
            stack.push(ctm);
            const matrix = args?.[0] as number[] | null;
            if (matrix?.length === 6) ctm = multiply(ctm, matrix);
          } else if (fn === ops.paintFormXObjectEnd) ctm = stack.pop() ?? IDENTITY;
          else if (fn === ops.paintImageXObject || fn === ops.paintInlineImageXObject) {
            const id = fn === ops.paintImageXObject ? String(args?.[0]) : '';
            let key = id ? keyById.get(id) : undefined;
            if (!key) {
              const image = id
                ? await resolveObject(id.startsWith('g_') ? page.commonObjs : page.objs, id)
                : (args?.[0] as PdfImageData | undefined);
              if (!image || image.width < MIN_SIDE || image.height < MIN_SIDE) continue;
              if (encoded.size >= MAX_CANDIDATES || candidateBytes >= MAX_CANDIDATE_BYTES) {
                truncated = true;
                continue;
              }
              const result = await encode(image);
              if (!result) continue;
              key = await fingerprint(result.blob);
              if (!encoded.has(key)) {
                encoded.set(key, result);
                candidateBytes += result.blob.size;
              }
              if (id) keyById.set(id, key);
            }
            const box = imageBox(ctm);
            occurrences.push({
              page: pageNumber - 1,
              afterLine: lineAbove(pageLines, box),
              top: box.top,
              key,
            });
            const pages = pagesByKey.get(key) ?? new Set<number>();
            pages.add(pageNumber);
            pagesByKey.set(key, pages);
          }
        }
      } catch {
        // Une page dont les images ne se lisent pas garde son texte : l'import
        // ne doit jamais échouer à cause d'une photo.
      }
    }
    // Libère les images décodées de la page avant de passer à la suivante.
    page.cleanup();
  }
  await task.destroy();

  const images: ExtractedImage[][] = lines.map(() => []);
  let count = 0;
  let bytes = 0;
  const ordered = occurrences
    .filter((o) => (pagesByKey.get(o.key)?.size ?? 0) < REPEATED_PAGES)
    // Ordre de lecture : page, puis ligne au-dessus, puis de haut en bas.
    .sort((a, b) => a.page - b.page || a.afterLine - b.afterLine || b.top - a.top);
  for (const occurrence of ordered) {
    const image = encoded.get(occurrence.key);
    if (!image) continue;
    if (count >= MAX_IMAGES || bytes + image.blob.size > MAX_IMAGES_BYTES) {
      truncated = true;
      break;
    }
    count++;
    bytes += image.blob.size;
    images[occurrence.page].push({ ...image, afterLine: occurrence.afterLine });
  }

  return {
    pages: lines.map((pageLines, index) => ({ lines: pageLines, images: images[index] })),
    truncated,
  };
}

/** Une page de PDF rendue en image, pour que la lectrice dise laquelle est un diagramme. */
export interface RenderedPage {
  readonly number: number;
  readonly blob: Blob;
  readonly width: number;
  readonly height: number;
}

/** Au-delà, un PDF n'est plus un patron mais un livre : on n'en rend que le début. */
export const MAX_RENDERED_PAGES = 60;
/** Plus long côté d'un diagramme enregistré, page de PDF comprise. */
export const CHART_MAX_SIDE = 2400;
export const CHART_JPEG_QUALITY = 0.85;

/**
 * Rend les pages d'un PDF en images à l'échelle 2 (réduite si le plus long
 * côté dépasse 2400 px), sur fond blanc : un diagramme de PDF est un dessin
 * vectoriel, pas une image incorporée, `extractPdfPages` ne le voit donc pas.
 */
export async function renderPdfPages(
  file: File,
): Promise<{ pages: RenderedPage[]; total: number }> {
  ensureUpsert();
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const document = await task.promise;
  const pages: RenderedPage[] = [];
  try {
    const count = Math.min(document.numPages, MAX_RENDERED_PAGES);
    for (let number = 1; number <= count; number++) {
      const page = await document.getPage(number);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(2, CHART_MAX_SIDE / Math.max(base.width, base.height));
      const viewport = page.getViewport({ scale });
      const width = Math.max(1, Math.round(viewport.width));
      const height = Math.max(1, Math.round(viewport.height));
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext('2d');
      if (!context) continue;
      await page.render({
        canvasContext: context as unknown as CanvasRenderingContext2D,
        canvas: null,
        viewport,
        background: 'rgb(255, 255, 255)',
      }).promise;
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: CHART_JPEG_QUALITY });
      pages.push({ number, blob, width, height });
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return { pages, total: document.numPages };
}

/**
 * Décodage d'images en pixels (`createImageBitmap`, `OffscreenCanvas`,
 * `Image`) pour la lecture automatique d'un diagramme. Chargé par `import()`
 * au moment où la lectrice ouvre un diagramme, jamais au premier affichage.
 */

export interface DecodedPixels {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

/** Au-delà, décoder l'image saturerait la mémoire d'une tablette (64 millions de pixels). */
const MAX_PIXELS = 64_000_000;

function draw(
  source: CanvasImageSource,
  targetWidth: number,
  targetHeight: number,
): DecodedPixels | null {
  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  // Fond blanc : un PNG transparent se lit comme du papier, pas comme de l'encre.
  context.fillStyle = 'rgb(255, 255, 255)';
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.drawImage(source, 0, 0, targetWidth, targetHeight);
  const { data } = context.getImageData(0, 0, targetWidth, targetHeight);
  return { data, width: targetWidth, height: targetHeight };
}

/**
 * Pixels d'une image du disque, réduite à `maxSide` pixels au plus sur son
 * plus long côté. `null` si l'image est illisible ou démesurée.
 */
export async function decodePixels(file: Blob, maxSide: number): Promise<DecodedPixels | null> {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
    return null;
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  try {
    if (bitmap.width * bitmap.height > MAX_PIXELS) return null;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    return draw(
      bitmap,
      Math.max(1, Math.round(bitmap.width * scale)),
      Math.max(1, Math.round(bitmap.height * scale)),
    );
  } finally {
    bitmap.close();
  }
}

/**
 * Pixels d'un SVG du site (un symbole de diagramme), dessiné sur un carré de
 * `size` pixels. Passe par `Image` : `createImageBitmap` ne décode pas le SVG
 * partout. Même origine, aucune requête vers un tiers.
 */
export async function svgPixels(url: string, size: number): Promise<DecodedPixels | null> {
  if (typeof Image === 'undefined' || typeof OffscreenCanvas === 'undefined') return null;
  const image = new Image(size, size);
  image.src = url;
  try {
    await image.decode();
  } catch {
    return null;
  }
  return draw(image, size, size);
}

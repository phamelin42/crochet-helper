/**
 * Lecture et réduction d'une image du disque (`createImageBitmap`,
 * `OffscreenCanvas`, `FileReader`) : le seul endroit où une fonctionnalité en
 * a besoin. Chargé par `import()` au moment où la lectrice choisit un fichier.
 */

/** Une image redessinée, prête à être enregistrée. */
export interface ResizedImage {
  readonly blob: Blob;
  readonly width: number;
  readonly height: number;
}

/** Au-delà, décoder l'image saturerait la mémoire d'une tablette (64 millions de pixels). */
const MAX_PIXELS = 64_000_000;

/**
 * Réduit une image à `maxSide` pixels au plus sur son plus long côté, sur fond
 * blanc (le JPEG n'a pas de transparence), et l'encode en JPEG. La qualité
 * baisse d'un cran tant que le fichier dépasse `maxBytes`. Renvoie `null`
 * quand l'image est illisible, démesurée ou reste trop lourde.
 */
export async function resizeImage(
  file: Blob,
  maxSide: number,
  qualities: readonly number[],
  maxBytes: number,
): Promise<ResizedImage | null> {
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
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.fillStyle = 'rgb(255, 255, 255)';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    for (const quality of qualities) {
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
      if (blob.size <= maxBytes) return { blob, width, height };
    }
    return null;
  } finally {
    bitmap.close();
  }
}

/** Contenu d'un fichier en `data:` URL — la couverture d'un projet en est une. */
export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

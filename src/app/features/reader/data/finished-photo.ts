import type { ResizedImage } from '../../../core/platform/image-resize';

/** Côté le plus long de la photo gardée : assez pour l'écran d'une tablette, léger pour IndexedDB. */
export const FINISHED_PHOTO_SIDE = 1600;
/** Qualités JPEG essayées dans l'ordre jusqu'à passer sous `MAX_FINISHED_PHOTO_BYTES`. */
export const FINISHED_PHOTO_QUALITIES: readonly number[] = [0.85, 0.7, 0.55, 0.4];
/** Taille maximale de la photo une fois réduite : sous la borne de la sauvegarde exportée. */
export const MAX_FINISHED_PHOTO_BYTES = 3 * 1024 * 1024;
/** Un fichier plus gros est refusé avant d'être décodé (un appareil photo récent en fait 10 à 15 Mo). */
export const MAX_FINISHED_PHOTO_INPUT_BYTES = 25 * 1024 * 1024;

export type PrepareResult =
  | { readonly ok: true; readonly photo: ResizedImage }
  | { readonly ok: false; readonly reason: 'too-large' | 'not-image' };

type Resize = (
  file: Blob,
  maxSide: number,
  qualities: readonly number[],
  maxBytes: number,
) => Promise<ResizedImage | null>;

/**
 * Prépare la photo d'un ouvrage : refuse proprement (jamais d'exception) un
 * fichier trop gros ou qui n'est pas une image décodable, sinon la réduit.
 * Chargée par `import()` au clic « Ajouter une photo ».
 */
export async function prepareFinishedPhoto(file: Blob, resize?: Resize): Promise<PrepareResult> {
  if (file.size > MAX_FINISHED_PHOTO_INPUT_BYTES) return { ok: false, reason: 'too-large' };
  // Un type vide existe (certains navigateurs ne le renseignent pas) : le décodeur tranche.
  if (file.type && !file.type.startsWith('image/')) return { ok: false, reason: 'not-image' };
  try {
    const run = resize ?? (await import('../../../core/platform/image-resize')).resizeImage;
    const photo = await run(
      file,
      FINISHED_PHOTO_SIDE,
      FINISHED_PHOTO_QUALITIES,
      MAX_FINISHED_PHOTO_BYTES,
    );
    return photo ? { ok: true, photo } : { ok: false, reason: 'not-image' };
  } catch {
    return { ok: false, reason: 'not-image' };
  }
}

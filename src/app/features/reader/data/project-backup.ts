import { Project, ProjectImage, imageId } from './project.model';

/**
 * Format du fichier de sauvegarde (écran « Mes projets »). Chargé par
 * `import()` à l'export ou à l'import seulement : sa validation et
 * l'encodage des photos n'ont rien à faire dans le bundle initial.
 */

/**
 * Version du format de fichier de sauvegarde — incrémentée à tout changement
 * de forme. Version 2 : les photos des projets, en base64 (fiche 34).
 */
export const BACKUP_SCHEMA_VERSION = 2;
/** Au-delà, un fichier de sauvegarde est refusé avant même d'être lu. */
export const MAX_BACKUP_BYTES = 60 * 1024 * 1024;
/** Taille maximale d'une photo d'une sauvegarde, une fois décodée. */
export const MAX_BACKUP_IMAGE_BYTES = 2 * 1024 * 1024;

/** Une photo dans un fichier de sauvegarde : `ProjectImage` avec son contenu en base64. */
export interface BackupImage {
  readonly id: string;
  readonly projectId: string;
  readonly n: number;
  readonly width: number;
  readonly height: number;
  readonly kind: 'pdf';
  readonly type: string;
  readonly data: string;
}

export interface ProjectBackup {
  readonly version: number;
  readonly projects: readonly Project[];
  readonly images: readonly BackupImage[];
}

const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;
const IMAGE_TYPE = /^image\/(?:jpeg|png|webp)$/;

/**
 * Valide une sauvegarde importée. Refuse en bloc — jamais d'import partiel —
 * dès que la version est inconnue, qu'un seul projet a une forme inattendue ou
 * qu'une seule photo est mal formée, orpheline ou trop lourde. La version 1,
 * sans photos, reste acceptée.
 */
export function parseBackup(data: unknown): ProjectBackup | null {
  if (!data || typeof data !== 'object') return null;
  const { version, projects, images = [] } = data as Record<string, unknown>;
  if (version !== 1 && version !== BACKUP_SCHEMA_VERSION) return null;
  if (!Array.isArray(projects) || !projects.every(isProject)) return null;
  if (!Array.isArray(images) || (version === 1 && images.length)) return null;
  const ids = new Set(projects.map((project) => project.id));
  if (!images.every((image) => isBackupImage(image, ids))) return null;
  return {
    version,
    projects: projects.map((project) => ({ ...project, imageCount: project.imageCount ?? 0 })),
    images,
  };
}

function isBackupImage(value: unknown, projectIds: ReadonlySet<string>): value is BackupImage {
  if (!value || typeof value !== 'object') return false;
  const i = value as Record<string, unknown>;
  return (
    typeof i['projectId'] === 'string' &&
    projectIds.has(i['projectId']) &&
    Number.isInteger(i['n']) &&
    (i['n'] as number) >= 1 &&
    i['id'] === imageId(i['projectId'], i['n'] as number) &&
    isPositiveInteger(i['width']) &&
    isPositiveInteger(i['height']) &&
    i['kind'] === 'pdf' &&
    typeof i['type'] === 'string' &&
    IMAGE_TYPE.test(i['type']) &&
    typeof i['data'] === 'string' &&
    // Taille décodée : trois octets pour quatre caractères.
    (i['data'].length * 3) / 4 <= MAX_BACKUP_IMAGE_BYTES &&
    BASE64.test(i['data'])
  );
}

function isPositiveInteger(value: unknown): boolean {
  return Number.isInteger(value) && (value as number) > 0;
}

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p['id'] === 'string' &&
    typeof p['name'] === 'string' &&
    typeof p['source'] === 'string' &&
    typeof p['image'] === 'string' &&
    typeof p['pieceIndex'] === 'number' &&
    typeof p['stepIndex'] === 'number' &&
    typeof p['done'] === 'object' &&
    p['done'] !== null &&
    typeof p['reps'] === 'object' &&
    p['reps'] !== null &&
    typeof p['elapsed'] === 'number' &&
    typeof p['expandAbbreviations'] === 'boolean' &&
    typeof p['createdAt'] === 'number' &&
    typeof p['lastOpenedAt'] === 'number' &&
    (p['imageCount'] === undefined ||
      (Number.isInteger(p['imageCount']) && (p['imageCount'] as number) >= 0))
  );
}

/** Octets → base64, par tranches : `String.fromCharCode(...)` d'un coup déborde la pile. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function base64ToBytes(data: string): Uint8Array<ArrayBuffer> {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Fichier de sauvegarde : tous les projets, et leurs photos en base64. */
export async function encodeBackup(
  projects: readonly Project[],
  files: readonly (ProjectImage | undefined)[],
): Promise<Blob> {
  const images: BackupImage[] = [];
  for (const file of files) {
    if (!file) continue;
    // Champs recopiés un à un : une déstructuration `...reste` ajoute un
    // utilitaire esbuild au morceau partagé du bundle initial.
    const { id, projectId, n, width, height, kind, blob } = file;
    const data = bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
    images.push({ id, projectId, n, width, height, kind, type: blob.type || 'image/jpeg', data });
  }
  const backup: ProjectBackup = { version: BACKUP_SCHEMA_VERSION, projects, images };
  return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
}

/** Photos d'une sauvegarde validée, redevenues fichiers, pour les seuls projets retenus. */
export function decodeImages(
  images: readonly BackupImage[],
  projectIds: ReadonlySet<string>,
): ProjectImage[] {
  return images
    .filter((image) => projectIds.has(image.projectId))
    .map(({ id, projectId, n, width, height, kind, type, data }) => ({
      id,
      projectId,
      n,
      width,
      height,
      kind,
      blob: new Blob([base64ToBytes(data)], { type }),
    }));
}

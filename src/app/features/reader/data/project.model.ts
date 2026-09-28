const MAX_NAME_LENGTH = 80;

/** Un projet : un patron, sa progression, ses compteurs et son chronomètre. */
export interface Project {
  readonly id: string;
  readonly name: string;
  readonly source: string;
  readonly image: string;
  readonly pieceIndex: number;
  readonly stepIndex: number;
  readonly done: Record<string, boolean>;
  readonly reps: Record<string, number>;
  readonly elapsed: number;
  readonly expandAbbreviations: boolean;
  readonly createdAt: number;
  /** Horodatage de la dernière reprise — sert au tri de l'écran de liste. */
  readonly lastOpenedAt: number;
  /**
   * Nombre de photos enregistrées avec le projet (import PDF), numérotées de 1
   * à `imageCount`. Absent des projets enregistrés avant la fiche 34 : 0.
   */
  readonly imageCount?: number;
}

/** Une photo d'un projet, enregistrée à part dans IndexedDB (magasin `images`). */
export interface ProjectImage {
  readonly id: string;
  readonly projectId: string;
  /** Numéro de l'image dans le texte : le marqueur `[image n]`. */
  readonly n: number;
  readonly blob: Blob;
  readonly width: number;
  readonly height: number;
  readonly kind: 'pdf';
}

export function imageId(projectId: string, n: number): string {
  return `${projectId}:${n}`;
}

/** Clés des photos d'un projet, de 1 à `imageCount`. */
export function imageIds(project: Pick<Project, 'id' | 'imageCount'>): string[] {
  return Array.from({ length: project.imageCount ?? 0 }, (_, i) => imageId(project.id, i + 1));
}

/** Forme de l'ancien état unique, stocké dans `localStorage` avant la fiche 16. */
export interface LegacyReaderState {
  readonly source?: string;
  readonly image?: string;
  readonly pieceIndex?: number;
  readonly stepIndex?: number;
  readonly done?: Record<string, boolean>;
  readonly reps?: Record<string, number>;
  readonly elapsed?: number;
  readonly expandAbbreviations?: boolean;
}

/**
 * Nom d'un projet, dérivé du titre détecté par le parseur ou, à défaut, de la
 * première ligne non vide du texte source. Jamais généré : un projet sans
 * titre ni contenu reste sans nom, à charge de l'interface d'afficher un
 * libellé de repli traduit.
 */
export function deriveProjectName(title: string, source: string): string {
  const trimmedTitle = title.trim();
  if (trimmedTitle) return truncate(trimmedTitle);
  const firstLine = source.split('\n').find((line) => line.trim());
  return truncate(firstLine?.trim() ?? '');
}

function truncate(value: string): string {
  return value.length > MAX_NAME_LENGTH ? `${value.slice(0, MAX_NAME_LENGTH - 1)}…` : value;
}

/**
 * Construit le premier projet à partir de l'ancien état localStorage unique.
 * `title` est le titre détecté par le parseur, comme pour un projet créé ensuite.
 */
export function legacyToProject(
  legacy: LegacyReaderState,
  title: string,
  id: string,
  now: number,
): Project {
  return {
    id,
    name: deriveProjectName(title, legacy.source ?? ''),
    source: legacy.source ?? '',
    image: legacy.image ?? '',
    pieceIndex: legacy.pieceIndex ?? 0,
    stepIndex: legacy.stepIndex ?? 0,
    done: legacy.done ?? {},
    reps: legacy.reps ?? {},
    elapsed: legacy.elapsed ?? 0,
    expandAbbreviations: legacy.expandAbbreviations ?? false,
    createdAt: now,
    lastOpenedAt: now,
    imageCount: 0,
  };
}

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

/**
 * Fusionne deux listes de projets par identifiant : jamais d'écrasement muet,
 * le doublon le plus récemment ouvert l'emporte.
 */
export function mergeProjects(
  current: readonly Project[],
  incoming: readonly Project[],
): Project[] {
  const merged = new Map(current.map((project) => [project.id, project]));
  for (const project of incoming) {
    const existing = merged.get(project.id);
    if (!existing || project.lastOpenedAt > existing.lastOpenedAt) merged.set(project.id, project);
  }
  return [...merged.values()];
}

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
  };
}

/** Version du format de fichier de sauvegarde — incrémentée à tout changement de forme. */
export const BACKUP_SCHEMA_VERSION = 1;

export interface ProjectBackup {
  readonly version: number;
  readonly projects: readonly Project[];
}

/**
 * Valide une sauvegarde importée. Refuse en bloc — jamais d'import partiel —
 * dès que la version diffère ou qu'un seul projet a une forme inattendue.
 */
export function parseBackup(data: unknown): ProjectBackup | null {
  if (!data || typeof data !== 'object') return null;
  const { version, projects } = data as Record<string, unknown>;
  if (version !== BACKUP_SCHEMA_VERSION) return null;
  if (!Array.isArray(projects) || !projects.every(isProject)) return null;
  return { version, projects };
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
    typeof p['lastOpenedAt'] === 'number'
  );
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

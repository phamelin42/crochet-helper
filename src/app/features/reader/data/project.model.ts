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
  /**
   * Nombre de diagrammes chargés par la lectrice (fiche 35), numérotés de 1 à
   * `chartCount`. Absent des projets antérieurs : 0.
   */
  readonly chartCount?: number;
  /** Diagramme épinglé à chaque pièce : indice de la pièce → numéro du diagramme. */
  readonly charts?: Record<number, number>;
}

/** Plafond de diagrammes par projet : chacun pèse jusqu'à quelques Mo dans IndexedDB. */
export const MAX_CHARTS = 20;

/** Une photo d'un projet, enregistrée à part dans IndexedDB (magasin `images`). */
export interface ProjectImage {
  readonly id: string;
  readonly projectId: string;
  /** Numéro de l'image dans le texte : le marqueur `[image n]`. */
  readonly n: number;
  readonly blob: Blob;
  readonly width: number;
  readonly height: number;
  /** `pdf` : photo d'un PDF importé ; `chart` : diagramme chargé par la lectrice. */
  readonly kind: 'pdf' | 'chart';
}

export function imageId(projectId: string, n: number): string {
  return `${projectId}:${n}`;
}

/** Clés des photos d'un projet, de 1 à `imageCount`. */
export function imageIds(project: Pick<Project, 'id' | 'imageCount'>): string[] {
  return Array.from({ length: project.imageCount ?? 0 }, (_, i) => imageId(project.id, i + 1));
}

export function chartId(projectId: string, n: number): string {
  return `${projectId}:chart:${n}`;
}

/** Clés des diagrammes d'un projet, de 1 à `chartCount`. */
export function chartIds(project: Pick<Project, 'id' | 'chartCount'>): string[] {
  return Array.from({ length: project.chartCount ?? 0 }, (_, i) => chartId(project.id, i + 1));
}

/** Toutes les clés de fichiers d'un projet : photos et diagrammes. */
export function fileIds(project: Pick<Project, 'id' | 'imageCount' | 'chartCount'>): string[] {
  return [...imageIds(project), ...chartIds(project)];
}

/**
 * Épingles lisibles : indices de pièce entiers positifs ou nuls, numéros de
 * diagramme dans `1..count`. Ce qui ne l'est pas est écarté sans erreur.
 */
export function sanitizeCharts(value: unknown, count: number): Record<number, number> {
  if (!value || typeof value !== 'object') return {};
  const clean: Record<number, number> = {};
  for (const [key, n] of Object.entries(value)) {
    const piece = Number(key);
    if (Number.isInteger(piece) && piece >= 0 && Number.isInteger(n) && n >= 1 && n <= count) {
      clean[piece] = n;
    }
  }
  return clean;
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

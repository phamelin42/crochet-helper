/**
 * Encode la progression d'un projet (patron, position, rangs cochés,
 * répétitions) dans un fragment d'URL partageable — « Envoyer ce projet ».
 * Réutilise la compression et les plafonds de taille de `pattern-link.ts` :
 * un lien de projet n'est qu'un patron accompagné de sa progression, encodée
 * en JSON avant compression.
 */

import { decodePattern, encodePattern } from './pattern-link';
import { parsePattern } from './pattern-parser';

const SCHEMA_VERSION = 1;

export interface SharedProgress {
  readonly source: string;
  readonly name: string;
  readonly pieceIndex: number;
  readonly stepIndex: number;
  readonly done: Readonly<Record<string, boolean>>;
  readonly reps: Readonly<Record<string, number>>;
}

interface SharedProgressPayload extends SharedProgress {
  readonly version: number;
}

export async function encodeProject(progress: SharedProgress): Promise<string> {
  const payload: SharedProgressPayload = { version: SCHEMA_VERSION, ...progress };
  return encodePattern(JSON.stringify(payload));
}

/**
 * Décode le fragment d'un lien de projet. Le lien vient potentiellement d'un
 * tiers : toute entrée invalide, trop longue ou d'une version inconnue
 * renvoie `null`, jamais une exception. Les index de position hors des
 * bornes du patron décodé sont ramenés dans ses limites plutôt que refusés.
 */
export async function decodeProject(encoded: string): Promise<SharedProgress | null> {
  const decoded = await decodePattern(encoded);
  if (decoded === null) return null;

  let data: unknown;
  try {
    data = JSON.parse(decoded);
  } catch {
    return null;
  }
  if (!isSharedProgressPayload(data)) return null;

  const pieces = parsePattern(data.source).pieces;
  const pieceIndex = pieces.length ? clamp(data.pieceIndex, 0, pieces.length - 1) : 0;
  const stepCount = pieces[pieceIndex]?.steps.length ?? 0;
  const stepIndex = stepCount ? clamp(data.stepIndex, 0, stepCount - 1) : 0;

  return {
    source: data.source,
    name: data.name,
    pieceIndex,
    stepIndex,
    done: data.done,
    reps: data.reps,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function isSharedProgressPayload(value: unknown): value is SharedProgressPayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v['version'] === SCHEMA_VERSION &&
    typeof v['source'] === 'string' &&
    typeof v['name'] === 'string' &&
    typeof v['pieceIndex'] === 'number' &&
    typeof v['stepIndex'] === 'number' &&
    isBooleanRecord(v['done']) &&
    isNumberRecord(v['reps'])
  );
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return (
    !!value &&
    typeof value === 'object' &&
    Object.values(value as Record<string, unknown>).every((item) => typeof item === 'boolean')
  );
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return (
    !!value &&
    typeof value === 'object' &&
    Object.values(value as Record<string, unknown>).every(
      (item) => typeof item === 'number' && Number.isFinite(item),
    )
  );
}

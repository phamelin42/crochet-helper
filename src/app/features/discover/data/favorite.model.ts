/**
 * Ce que l'appareil garde d'un patron Ravelry (ADR-004) : le strict nécessaire
 * pour retrouver sa fiche et lui rendre l'attribution due, jamais le texte ni
 * les photos. Données de tiers : tout ce qui entre depuis une sauvegarde est
 * borné et validé ici.
 */

/** Toute page de patron de Ravelry commence ainsi : l'app ne lie rien d'autre. */
export const RAVELRY_PATTERN_PREFIX = 'https://www.ravelry.com/patterns/library/';

/** Favoris gardés au plus : une sauvegarde n'en importe pas davantage. */
export const MAX_FAVORITES = 500;

/** Un patron mis de côté. `id` est l'identifiant Ravelry, en texte (clé IndexedDB). */
export interface Favorite {
  readonly id: string;
  readonly name: string;
  readonly designer: string;
  /** Adresse de la vignette ; absente hors ligne ou sans photo. */
  readonly thumbnail: string | null;
  readonly permalink: string;
  readonly addedAt: number;
}

/** D'où vient un projet : le patron Ravelry dont la lectrice a déposé le texte. */
export interface PatternOrigin {
  readonly source: 'ravelry';
  readonly id: string;
  readonly name: string;
  readonly designer: string;
  readonly permalink: string;
  readonly photoUrl: string | null;
}

const ID = /^[1-9]\d{0,9}$/;
const MAX_NAME = 200;
const MAX_DESIGNER = 100;
const MAX_URL = 600;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isHttps = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= MAX_URL && v.startsWith('https://');

const isPermalink = (v: unknown): v is string =>
  isHttps(v) && v.startsWith(RAVELRY_PATTERN_PREFIX) && v.length > RAVELRY_PATTERN_PREFIX.length;

const isText = (v: unknown, max: number, min = 0): v is string =>
  typeof v === 'string' && v.length >= min && v.length <= max;

export function validFavorite(value: unknown): value is Favorite {
  if (!isObject(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    ID.test(value['id']) &&
    isText(value['name'], MAX_NAME, 1) &&
    isText(value['designer'], MAX_DESIGNER) &&
    (value['thumbnail'] === null || isHttps(value['thumbnail'])) &&
    isPermalink(value['permalink']) &&
    typeof value['addedAt'] === 'number' &&
    Number.isFinite(value['addedAt'])
  );
}

export function validOrigin(value: unknown): value is PatternOrigin {
  if (!isObject(value)) return false;
  return (
    value['source'] === 'ravelry' &&
    typeof value['id'] === 'string' &&
    ID.test(value['id']) &&
    isText(value['name'], MAX_NAME, 1) &&
    isText(value['designer'], MAX_DESIGNER) &&
    isPermalink(value['permalink']) &&
    (value['photoUrl'] === null || isHttps(value['photoUrl']))
  );
}

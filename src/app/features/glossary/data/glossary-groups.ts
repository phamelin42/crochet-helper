import type { Locale } from '../../../core/i18n/locale';
import type { GlossaryEntry } from '../../reader/data/glossary';

export type CraftFilter = 'all' | 'crochet' | 'tricot';
export type LangFilter = 'all' | Locale;

export interface GlossaryFilters {
  readonly craft: CraftFilter;
  readonly lang: LangFilter;
  readonly query: string;
}

export interface GlossaryGroup {
  /** Lettre repère, en majuscule, sans accent. */
  readonly letter: string;
  readonly entries: readonly GlossaryEntry[];
}

export const NO_FILTERS: GlossaryFilters = { craft: 'all', lang: 'all', query: '' };

/** Ancre du groupe : `lettre-a`. Pas d'accent ni de majuscule dans une ancre. */
export function letterAnchor(letter: string): string {
  return `lettre-${letter.toLowerCase()}`;
}

function letterOf(term: string): string {
  return term.normalize('NFD').charAt(0).toUpperCase();
}

function matches(entry: GlossaryEntry, filters: GlossaryFilters): boolean {
  // Une abréviation « commun » sert aux deux techniques : elle ne disparaît jamais.
  if (filters.craft !== 'all' && entry.craft !== 'commun' && entry.craft !== filters.craft) {
    return false;
  }
  if (filters.lang !== 'all' && entry.lang !== filters.lang) return false;
  const needle = filters.query.trim().toLowerCase();
  if (!needle) return true;
  return (
    entry.term.toLowerCase().includes(needle) ||
    entry.fr.toLowerCase().includes(needle) ||
    entry.en.toLowerCase().includes(needle)
  );
}

/** Filtre, trie par terme (sans tenir compte de la casse) et regroupe par première lettre. */
export function groupGlossary(
  entries: readonly GlossaryEntry[],
  filters: GlossaryFilters = NO_FILTERS,
): GlossaryGroup[] {
  const sorted = entries
    .filter((entry) => matches(entry, filters))
    .sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
  const groups: { letter: string; entries: GlossaryEntry[] }[] = [];
  for (const entry of sorted) {
    const letter = letterOf(entry.term);
    const last = groups[groups.length - 1];
    if (last?.letter === letter) last.entries.push(entry);
    else groups.push({ letter, entries: [entry] });
  }
  return groups;
}

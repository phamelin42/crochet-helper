import { GLOSSARY, GlossaryEntry } from '../../reader/data/glossary';

/** Tête d'une définition, sans la glose qui suit un tiret cadratin. */
export function headOf(definition: string): string {
  return definition.split(/\s+—\s+/)[0];
}

export interface TermNeighbors {
  /** Même point, autre notation : `ms` et `sc`, `aug` et `inc`, `mr` et `magic ring`. */
  readonly synonyms: readonly GlossaryEntry[];
  /** Termes du même métier, pris de part et d'autre dans l'ordre du glossaire. */
  readonly related: readonly GlossaryEntry[];
}

/**
 * Termes à proposer depuis la page d'une abréviation.
 *
 * Les termes proches sont choisis autour de l'entrée, en boucle, plutôt que
 * « les N premiers du même métier » : sinon les mêmes quelques pages
 * recevraient tous les liens internes et les autres aucun.
 */
export function neighborsOf(
  entry: GlossaryEntry,
  glossary: readonly GlossaryEntry[] = GLOSSARY,
  relatedCount = 4,
): TermNeighbors {
  const synonyms = glossary.filter((e) => e !== entry && headOf(e.fr) === headOf(entry.fr));

  const family = glossary.filter((e) => e.craft === entry.craft);
  const index = family.indexOf(entry);
  const related: GlossaryEntry[] = [];
  for (let distance = 1; distance < family.length && related.length < relatedCount; distance++) {
    for (const candidate of [
      family[(index + distance) % family.length],
      family[(index - distance + family.length) % family.length],
    ]) {
      if (related.length >= relatedCount) break;
      if (candidate === entry || synonyms.includes(candidate) || related.includes(candidate)) {
        continue;
      }
      related.push(candidate);
    }
  }

  return { synonyms, related };
}

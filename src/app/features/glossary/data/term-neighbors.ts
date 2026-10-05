import { Locale } from '../../../core/i18n/locale';
import { GLOSSARY, GlossaryEntry, pageEntryOf } from '../../reader/data/glossary';

/** Tête d'une définition, sans la glose qui suit un tiret cadratin. */
export function headOf(definition: string): string {
  return definition.split(/\s+—\s+/)[0];
}

export interface TermNeighbors {
  /** Même point, autre notation qui a sa propre page : `ms` et `sc`, `aug` et `inc`. */
  readonly synonyms: readonly GlossaryEntry[];
  /**
   * Graphies servies par cette même page, sans page à elles (`slst` sur celle
   * de `sl st`, `mr` sur celle de `magic ring`) : on les nomme sans lien, un
   * lien vers soi-même ou vers une redirection n'apprendrait rien.
   */
  readonly variants: readonly GlossaryEntry[];
  /** Termes du même métier, pris de part et d'autre dans l'ordre du glossaire. */
  readonly related: readonly GlossaryEntry[];
}

/**
 * Termes à proposer depuis la page d'une abréviation, dans une langue.
 *
 * Seules les entrées qui ont une page dans cette langue sont proposées en
 * lien : une entrée qui redirige (`rnds` → `rnd`) ne reçoit jamais de lien
 * interne.
 *
 * Les termes proches sont choisis autour de l'entrée, en boucle, plutôt que
 * « les N premiers du même métier » : sinon les mêmes quelques pages
 * recevraient tous les liens internes et les autres aucun.
 */
export function neighborsOf(
  entry: GlossaryEntry,
  locale: Locale,
  glossary: readonly GlossaryEntry[] = GLOSSARY,
  relatedCount = 4,
): TermNeighbors {
  const page = pageEntryOf(entry, locale);
  const hasPage = (e: GlossaryEntry) => pageEntryOf(e, locale) === e;
  const sameConcept = glossary.filter(
    (e) => e !== page && (headOf(e.fr) === headOf(page.fr) || pageEntryOf(e, locale) === page),
  );
  const variants = sameConcept.filter((e) => pageEntryOf(e, locale) === page);
  const synonyms = sameConcept.filter(hasPage);

  const family = glossary.filter((e) => e.craft === page.craft && hasPage(e));
  const index = family.indexOf(page);
  const related: GlossaryEntry[] = [];
  // La liste montre la définition, pas la notation : « db — demi-bride » et
  // « hdc — demi-bride » y seraient deux liens que rien ne distingue. Un seul
  // sens y entre donc une fois, l'autre notation restant atteignable depuis la
  // section « autres façons de l'écrire » de sa jumelle.
  const seen = new Set([page, ...sameConcept].map((e) => headOf(e.fr)));
  for (let distance = 1; distance < family.length && related.length < relatedCount; distance++) {
    for (const candidate of [
      family[(index + distance) % family.length],
      family[(index - distance + family.length) % family.length],
    ]) {
      if (related.length >= relatedCount) break;
      const meaning = headOf(candidate.fr);
      if (seen.has(meaning)) continue;
      seen.add(meaning);
      related.push(candidate);
    }
  }

  return { synonyms, variants, related };
}

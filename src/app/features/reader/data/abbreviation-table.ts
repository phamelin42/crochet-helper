import { Locale } from '../../../core/i18n/locale';
import { GLOSSARY, GlossaryEntry, definitionHead } from './glossary';

/**
 * Les quinze abréviations anglaises qu'on rencontre le plus dans un patron.
 * Le tableau de la page « lire un patron anglais » les lit dans le glossaire :
 * aucun équivalent n'est recopié, donc aucun ne peut diverger de l'infobulle.
 */
export const COMMON_ENGLISH_TERMS: readonly string[] = [
  'ch',
  'sl st',
  'sc',
  'hdc',
  'dc',
  'tr',
  'st',
  'sp',
  'sk',
  'inc',
  'dec',
  'yo',
  'tog',
  'rep',
  'rnd',
];

export interface AbbreviationRow {
  readonly term: string;
  readonly meaning: string;
  readonly region?: 'US' | 'UK';
}

/**
 * Lignes du tableau, dans la langue de la page : le français lit des patrons
 * anglais (les quinze ci-dessus, traduits en français), l'anglais lit des
 * patrons français (toutes les entrées `lang: 'fr'`, traduites en anglais).
 */
export function abbreviationTable(pageLocale: Locale): AbbreviationRow[] {
  const entries: GlossaryEntry[] =
    pageLocale === 'fr'
      ? COMMON_ENGLISH_TERMS.map((term) => GLOSSARY.find((e) => e.term === term)).filter(
          (e): e is GlossaryEntry => e !== undefined,
        )
      : GLOSSARY.filter((e) => e.lang === 'fr');
  return entries.map((e) => ({
    term: e.term,
    meaning: definitionHead(e[pageLocale]),
    region: e.region,
  }));
}

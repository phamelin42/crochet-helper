/** Convention d'écriture d'un patron de crochet. */
export type Region = 'US' | 'UK';

/**
 * Le décalage d'un cran entre les deux conventions : chaque paire désigne le
 * même point, sous son nom américain puis britannique. `htr` et `trtr` sont
 * propres au Royaume-Uni ; `dc`, `tr` et `dtr` existent des deux côtés pour des
 * mailles différentes — c'est tout l'enjeu du convertisseur.
 */
const PAIRS: readonly { readonly us: string; readonly uk: string }[] = [
  { us: 'sc', uk: 'dc' },
  { us: 'hdc', uk: 'htr' },
  { us: 'dc', uk: 'tr' },
  { us: 'tr', uk: 'dtr' },
  { us: 'dtr', uk: 'trtr' },
];

/** Termes reconnus, quelle que soit la convention : les deux colonnes des paires. */
const KNOWN_TERMS = Array.from(new Set(PAIRS.flatMap((pair) => [pair.us, pair.uk])));

/**
 * Un jeton de hauteur de maille, avec ses formes composées : relief avant ou
 * arrière (`FPdc`, `BPtr`) et diminution groupée (`sc2tog`, `dc3tog`). Le
 * préfixe et le suffixe sont conservés tels quels, seul le cœur est converti.
 * Les bornes `\b` excluent tout jeton partiel (`dcs`, `abcdc`).
 */
const TOKEN_PATTERN = new RegExp(
  `\\b(fp|bp)?(${[...KNOWN_TERMS].sort((a, b) => b.length - a.length).join('|')})(\\d+tog)?\\b`,
  'gi',
);

function targetsFor(from: Region): ReadonlyMap<string, string> {
  return new Map(PAIRS.map((pair) => (from === 'US' ? [pair.us, pair.uk] : [pair.uk, pair.us])));
}

/** Applique la casse de `source` (majuscule, capitale, minuscule) à `target`. */
function matchCase(source: string, target: string): string {
  if (source === source.toUpperCase()) return target.toUpperCase();
  if (source[0] === source[0].toUpperCase()) return target[0].toUpperCase() + target.slice(1);
  return target;
}

export interface TermReplacement {
  /** Jeton tel que trouvé dans le texte, casse d'origine. */
  readonly term: string;
  readonly replacement: string;
}

export interface ConversionResult {
  readonly text: string;
  readonly replacements: readonly TermReplacement[];
  /**
   * Termes qui n'appartiennent pas à la convention de départ (`sc` dans un
   * patron dit britannique) : laissés intacts, mais signalés, car ils trahissent
   * le plus souvent une convention mal choisie.
   */
  readonly unmatched: readonly string[];
}

/**
 * Convertit les abréviations de hauteur de maille d'un patron entier, d'une
 * convention à l'autre.
 *
 * Un seul passage sur le texte d'origine : le jeton produit par un remplacement
 * n'est jamais relu par la même passe, donc jamais reconverti une seconde fois.
 */
export function convertTerms(text: string, from: Region, to: Region): ConversionResult {
  if (from === to) return { text, replacements: [], unmatched: [] };

  const targets = targetsFor(from);
  const replacements: TermReplacement[] = [];
  const unmatched: string[] = [];
  const seenUnmatched = new Set<string>();

  const converted = text.replace(
    TOKEN_PATTERN,
    (match, prefix: string | undefined, core: string, suffix: string | undefined) => {
      const target = targets.get(core.toLowerCase());
      if (!target) {
        // Un terme de l'autre convention (`htr` dans un patron dit américain) :
        // la convention choisie est sans doute la mauvaise, on le signale.
        const key = match.toLowerCase();
        if (!seenUnmatched.has(key)) {
          seenUnmatched.add(key);
          unmatched.push(match);
        }
        return match;
      }
      const replacement = `${prefix ?? ''}${matchCase(core, target)}${suffix ?? ''}`;
      replacements.push({ term: match, replacement });
      return replacement;
    },
  );

  return { text: converted, replacements, unmatched };
}

export interface RegionCrossReference {
  /** Ces lettres, dans un patron britannique, désignent une autre maille que celle de cette entrée. */
  readonly reusedInUk: boolean;
  readonly otherTerm: string;
}

/**
 * Repère si un terme du glossaire a un équivalent connu dans l'autre
 * convention. `dc`, `tr`, `dtr` et `htr` sont la cible d'une paire (leurs
 * lettres sont — ou deviennent, pour `htr` — celles de la notation
 * britannique) : c'est la relation la plus utile à afficher, car c'est celle
 * qui lève l'ambiguïté sur ce que ces lettres signifient dans un patron
 * britannique. `sc` et `hdc` n'existent qu'en notation américaine : seule
 * reste la relation directe vers leur équivalent.
 */
export function regionCrossReferenceOf(term: string): RegionCrossReference | undefined {
  const lower = term.toLowerCase();
  const asUkTarget = PAIRS.find((pair) => pair.uk === lower);
  if (asUkTarget) return { reusedInUk: true, otherTerm: asUkTarget.us };
  const asUsSource = PAIRS.find((pair) => pair.us === lower);
  if (asUsSource) return { reusedInUk: false, otherTerm: asUsSource.uk };
  return undefined;
}

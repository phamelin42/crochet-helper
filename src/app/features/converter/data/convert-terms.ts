/** Convention d'écriture d'un patron de crochet. */
export type Region = 'US' | 'UK';

/**
 * Le décalage d'un cran entre les deux conventions : chaque paire désigne le
 * même point, sous son nom américain puis britannique. `htr` est la seule
 * abréviation propre au Royaume-Uni qui n'existe pas déjà côté américain ; les
 * trois autres (`dc`, `tr`, `dtr`) réutilisent des lettres déjà prises par une
 * autre maille côté américain — c'est tout l'enjeu du convertisseur : les mêmes
 * lettres désignent des mailles différentes selon la convention.
 */
const PAIRS: readonly { readonly us: string; readonly uk: string }[] = [
  { us: 'sc', uk: 'dc' },
  { us: 'dc', uk: 'tr' },
  { us: 'hdc', uk: 'htr' },
  { us: 'tr', uk: 'dtr' },
];

/** Termes reconnus, quelle que soit la convention : les deux colonnes des paires. */
const KNOWN_TERMS = Array.from(new Set(PAIRS.flatMap((pair) => [pair.us, pair.uk])));

const TOKEN_PATTERN = new RegExp(
  `\\b(${[...KNOWN_TERMS].sort((a, b) => b.length - a.length).join('|')})\\b`,
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
  /** Termes reconnus mais sans équivalent défini dans ce sens : laissés intacts, mais signalés. */
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

  const converted = text.replace(TOKEN_PATTERN, (match) => {
    const target = targets.get(match.toLowerCase());
    if (!target) {
      const key = match.toLowerCase();
      if (!seenUnmatched.has(key)) {
        seenUnmatched.add(key);
        unmatched.push(match);
      }
      return match;
    }
    const replacement = matchCase(match, target);
    replacements.push({ term: match, replacement });
    return replacement;
  });

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

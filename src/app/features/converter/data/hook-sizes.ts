/** Une taille de crochet, dans les deux systèmes. Norme du Craft Yarn Council. */
export interface HookSize {
  readonly mm: number;
  readonly us: string; // « G-6 », « 7 » quand il n'y a pas de lettre
}

export const HOOK_SIZES: readonly HookSize[] = [
  { mm: 2.25, us: 'B-1' },
  { mm: 2.75, us: 'C-2' },
  { mm: 3.25, us: 'D-3' },
  { mm: 3.5, us: 'E-4' },
  { mm: 3.75, us: 'F-5' },
  { mm: 4, us: 'G-6' },
  { mm: 4.5, us: '7' },
  { mm: 5, us: 'H-8' },
  { mm: 5.5, us: 'I-9' },
  { mm: 6, us: 'J-10' },
  { mm: 6.5, us: 'K-10½' },
  { mm: 8, us: 'L-11' },
  { mm: 9, us: 'M/N-13' },
  { mm: 10, us: 'N/P-15' },
];

/** Décompose une notation américaine en sa (ou ses) lettre(s) et son numéro. */
function parseUs(us: string): { letter?: string; letter2?: string; number: string } {
  const match = /^(?:([A-Z])(?:\/([A-Z]))?-)?(\d+½?)$/.exec(us);
  if (!match) return { number: us };
  const [, letter, letter2, number] = match;
  return { letter, letter2, number };
}

/** Les formes acceptées d'une notation dans le texte : tiret, barre ou rien entre lettre et numéro. */
function usTokenPattern(us: string): string {
  const { letter, letter2, number } = parseUs(us);
  if (!letter) return number;
  if (letter2) return `${letter}\\/${letter2}-?${number}`;
  return `${letter}[-/]?${number}`;
}

/** Réduit une notation à sa forme canonique, pour la retrouver quelle que soit la ponctuation utilisée. */
function normalizeUsToken(raw: string): string {
  return raw.toUpperCase().replace(/[-/\s]/g, '');
}

const TOKEN_MAP = new Map(HOOK_SIZES.map((size) => [normalizeUsToken(size.us), size]));

/**
 * Tailles à une seule lettre (« G-6 ») : seules celles-là s'écrivent en
 * toutes lettres (« size G »), les lettres des notations à deux lettres
 * (« M/N-13 », « N/P-15 ») étant réutilisées d'une taille à l'autre.
 */
const LETTER_ONLY_ROWS: readonly { readonly letter: string; readonly size: HookSize }[] =
  HOOK_SIZES.flatMap((size) => {
    const { letter, letter2 } = parseUs(size.us);
    return letter && !letter2 ? [{ letter, size }] : [];
  });
const LETTER_ONLY_MAP = new Map(LETTER_ONLY_ROWS.map((row) => [row.letter, row.size]));

const US_ALTERNATION = HOOK_SIZES.map((size) => usTokenPattern(size.us)).join('|');
const LETTER_ALTERNATION = LETTER_ONLY_ROWS.map((row) => row.letter).join('|');

/**
 * Reconnaît une taille de crochet juste avant le mot « hook » (ou « crochet
 * hook »), dans l'un ou l'autre système. Le « \b » de tête suffit : le « \s+ »
 * exigé devant « hook » empêche déjà tout chevauchement avec un jeton voisin,
 * et un « \b » de fin échouerait sur le caractère « ½ » de « K-10½ », qui
 * n'est pas un caractère de mot.
 */
const HOOK_TOKEN_PATTERN = new RegExp(
  `\\b(?<mm>\\d+(?:[.,]\\d+)?)\\s?mm(?=\\s+(?:crochet\\s+)?hook\\b)` +
    `|\\b(?<us>${US_ALTERNATION})(?=\\s+(?:crochet\\s+)?hook\\b)` +
    `|(?<=\\bsize\\s)(?<usLetter>${LETTER_ALTERNATION})(?=\\s+(?:crochet\\s+)?hook\\b)`,
  'gi',
);

export interface HookConversion {
  readonly text: string;
  /** Chaque taille annotée : ce qui était écrit, ce qui a été ajouté. */
  readonly annotations: readonly { readonly original: string; readonly added: string }[];
  /** Tailles reconnues comme telles mais absentes du tableau. */
  readonly unknown: readonly string[];
}

/**
 * Ajoute, à côté de chaque taille de crochet trouvée dans un patron,
 * l'équivalent dans l'autre système. N'efface ni ne remplace jamais la taille
 * d'origine : la lectrice garde de quoi vérifier chaque ajout, comme pour les
 * abréviations de `convertTerms`.
 */
export function annotateHookSizes(text: string): HookConversion {
  const annotations: { original: string; added: string }[] = [];
  const unknown: string[] = [];
  const seenUnknown = new Set<string>();

  const converted = text.replace(HOOK_TOKEN_PATTERN, (match, ...rest) => {
    const groups = rest[rest.length - 1] as {
      mm?: string;
      us?: string;
      usLetter?: string;
    };

    if (groups.mm !== undefined) {
      const value = Number(groups.mm.replace(',', '.'));
      const size = HOOK_SIZES.find((s) => s.mm === value);
      if (!size) {
        const key = match.toLowerCase();
        if (!seenUnknown.has(key)) {
          seenUnknown.add(key);
          unknown.push(match);
        }
        return match;
      }
      annotations.push({ original: match, added: `US ${size.us}` });
      return `${match} (US ${size.us})`;
    }

    const size = groups.usLetter
      ? LETTER_ONLY_MAP.get(groups.usLetter.toUpperCase())
      : TOKEN_MAP.get(normalizeUsToken(match));
    if (!size) return match;
    annotations.push({ original: match, added: `${size.mm} mm` });
    return `${match} (${size.mm} mm)`;
  });

  return { text: converted, annotations, unknown };
}

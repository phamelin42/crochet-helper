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

/** Forme comparable d'une notation saisie : sans casse, sans tiret ni barre ni espace, « ½ » écrit « .5 ». */
function normalizeSearchToken(raw: string): string {
  return raw
    .toUpperCase()
    .replace('½', '.5')
    .replace(',', '.')
    .replace(/[-/\s]/g, '');
}

/**
 * Les écritures d'une taille, chacune menant à une seule ligne : la notation
 * complète (« G6 », « MN13 »), une lettre avec le numéro (« M13 », « N13 »),
 * ou une lettre seule (« G », « M »). Une écriture qui désignerait deux
 * lignes — la lettre « N », commune à M/N-13 et à N/P-15 — vaut `null` :
 * mieux ne rien proposer que la mauvaise taille.
 */
const SEARCH_ALIASES = new Map<string, HookSize | null>();
for (const size of HOOK_SIZES) {
  const { letter, letter2, number } = parseUs(size.us);
  const digits = number.replace('½', '.5');
  const aliases = new Set([normalizeSearchToken(size.us)]);
  for (const l of [letter, letter2]) {
    if (!l) continue;
    aliases.add(l);
    aliases.add(`${l}${digits}`);
  }
  for (const alias of aliases) {
    const known = SEARCH_ALIASES.get(alias);
    SEARCH_ALIASES.set(alias, known === undefined || known === size ? size : null);
  }
}

/** Le numéro seul d'une notation américaine (« 10.5 », « 13 »), pour une saisie qui n'est pas des millimètres. */
const SEARCH_NUMBERS = new Map(
  HOOK_SIZES.map((size) => [parseUs(size.us).number.replace('½', '.5'), size]),
);

/**
 * Retrouve une taille à partir de ce que la lectrice tape : des millimètres
 * (« 4 », « 4 mm », « 4,0 ») ou une notation américaine (« G », « G-6 »,
 * « g6 », « 7 », « M », « N-15 », « 10.5 »). Un nombre seul se lit d'abord en
 * millimètres, puis comme le numéro américain d'une taille. Une saisie avec
 * « mm » ne retombe jamais sur le système américain. Inconnu, ambigu ou
 * vide : `null`.
 */
export function findHookSize(input: string): HookSize | null {
  const text = input.trim();
  if (!text) return null;

  const mmMatch = /^(\d+(?:[.,]\d+)?)\s*(mm)?$/i.exec(text);
  if (mmMatch) {
    const value = Number(mmMatch[1].replace(',', '.'));
    const byMm = HOOK_SIZES.find((size) => size.mm === value);
    if (byMm || mmMatch[2]) return byMm ?? null;
  }

  const token = normalizeSearchToken(text);
  return SEARCH_ALIASES.get(token) ?? SEARCH_NUMBERS.get(token) ?? null;
}

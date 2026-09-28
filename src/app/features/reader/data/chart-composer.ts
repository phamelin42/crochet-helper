import { CHART_SYMBOLS, ChartSymbol } from './chart-symbols';

export type Convention = 'US' | 'UK' | 'FR';

export interface Token {
  /** Identifiant de `chart-symbols.ts`. */
  readonly symbol: string;
  /** 1 par défaut. */
  readonly count: number;
}

export interface Group {
  readonly tokens: readonly Token[];
  /** 1 = pas de répétition ; N → « *…* x N ». */
  readonly repeat: number;
}

export interface Round {
  readonly kind: 'round' | 'row';
  readonly groups: readonly Group[];
  /** Premier tour seulement. */
  readonly into?: 'magic-ring' | 'chain';
}

/** Un signal d'incohérence, jamais bloquant : le texte en est dit par le composant, dans la langue de la page. */
export interface ChartWarning {
  readonly kind: 'empty' | 'jump' | 'repeat';
  /** Numéro du tour, à partir de 1. */
  readonly round: number;
}

/**
 * Mailles produites et mailles reprises par un symbole. Une table de
 * convention : le diagramme ne dit pas où se pique la maille, la lectrice
 * garde la main et les avertissements ne bloquent rien.
 */
interface Arity {
  readonly produced: number;
  readonly consumed: number;
}

const ARITY: Readonly<Record<string, Arity>> = {
  'magic-ring': { produced: 0, consumed: 0 },
  blo: { produced: 0, consumed: 0 },
  flo: { produced: 0, consumed: 0 },
  ch: { produced: 1, consumed: 0 },
  'ch-space': { produced: 1, consumed: 0 },
  picot: { produced: 1, consumed: 0 },
  'sc-inc': { produced: 2, consumed: 1 },
  'dc-inc': { produced: 2, consumed: 1 },
  sc2tog: { produced: 1, consumed: 2 },
  dc2tog: { produced: 1, consumed: 2 },
  dc3tog: { produced: 1, consumed: 3 },
  // Une coquille est cinq brides dans une même maille (norme du Craft Yarn Council).
  shell: { produced: 5, consumed: 1 },
};
const PLAIN: Arity = { produced: 1, consumed: 1 };

/** Symboles qui changent le compte : une variation du tour n'a alors rien d'anormal. */
const CHANGES_COUNT = new Set(['sc-inc', 'dc-inc', 'sc2tog', 'dc2tog', 'dc3tog']);
/** Symboles dont le nombre de mailles reprises n'est pas devinable : pas d'avertissement de répétition. */
const AMBIGUOUS = new Set(['ch', 'ch-space', 'shell']);

const BY_ID = new Map(CHART_SYMBOLS.map((symbol) => [symbol.id, symbol]));

export function findSymbol(id: string): ChartSymbol | undefined {
  return BY_ID.get(id);
}

const arity = (id: string): Arity => ARITY[id] ?? PLAIN;

const tokens = (round: Round): readonly { token: Token; repeat: number }[] =>
  round.groups.flatMap((group) => group.tokens.map((token) => ({ token, repeat: group.repeat })));

/** Mailles produites par le tour. */
export function stitchCount(round: Round): number {
  return tokens(round).reduce(
    (sum, { token, repeat }) => sum + arity(token.symbol).produced * token.count * repeat,
    0,
  );
}

function consumedCount(round: Round): number {
  return tokens(round).reduce(
    (sum, { token, repeat }) => sum + arity(token.symbol).consumed * token.count * repeat,
    0,
  );
}

function abbreviation(symbol: ChartSymbol, convention: Convention): string {
  return convention === 'FR' ? symbol.fr : convention === 'UK' ? symbol.uk : symbol.us;
}

const NBSP = ' ';

const LABELS: Record<Convention, Record<Round['kind'], string>> = {
  US: { round: 'Rnd', row: 'Row' },
  UK: { round: 'Rnd', row: 'Row' },
  FR: { round: 'Tour', row: 'Rang' },
};

const INTO: Record<Convention, Record<NonNullable<Round['into']>, string>> = {
  US: { 'magic-ring': 'in a magic ring', chain: 'in 2nd ch from hook' },
  UK: { 'magic-ring': 'in a magic ring', chain: 'in 2nd ch from hook' },
  FR: {
    'magic-ring': 'dans un cercle magique',
    chain: 'dans la 2e ml à partir du crochet',
  },
};

function renderToken(token: Token, convention: Convention): string {
  const symbol = findSymbol(token.symbol);
  if (!symbol) return '';
  const abbr = abbreviation(symbol, convention);
  // Le français écrit toujours le nombre (« 1 ms ») ; l'anglais le tait quand il vaut 1.
  return convention === 'FR' || token.count > 1 ? `${token.count} ${abbr}` : abbr;
}

function renderGroup(group: Group, convention: Convention): string {
  const body = group.tokens
    .map((token) => renderToken(token, convention))
    .filter(Boolean)
    .join(', ');
  return group.repeat > 1 ? `*${body}* x ${group.repeat}` : body;
}

const isEmpty = (round: Round): boolean => tokens(round).length === 0;

/**
 * Une ligne que `parsePattern` découpe en une seule étape, compte entre
 * parenthèses : « Rnd 3: *sc, sc inc* x 6 (18) », « Tour 3 : *1 ms, 1 aug ms* x 6 (18) ».
 */
export function renderRound(round: Round, index: number, convention: Convention): string {
  const fr = convention === 'FR';
  const label = `${LABELS[convention][round.kind]} ${index}${fr ? NBSP : ''}:`;
  const parts = round.groups
    .map((group) => renderGroup(group, convention))
    .filter(Boolean)
    .join(', ');
  const into = round.into ? ` ${INTO[convention][round.into]}` : '';
  return `${label} ${parts}${into} (${stitchCount(round)})`;
}

/** Les tours vides sont sautés : la numérotation reste continue. */
export function renderPattern(rounds: readonly Round[], convention: Convention): string {
  return rounds
    .filter((round) => !isEmpty(round))
    .map((round, i) => renderRound(round, i + 1, convention))
    .join('\n');
}

/** Tour vide, compte qui chute de moitié ou double sans raison, répétition qui ne tombe pas juste. */
export function warnings(rounds: readonly Round[]): readonly ChartWarning[] {
  const found: ChartWarning[] = [];
  let previous: Round | null = null;
  rounds.forEach((round, i) => {
    const number = i + 1;
    if (isEmpty(round)) {
      found.push({ kind: 'empty', round: number });
      return;
    }
    if (previous) {
      const before = stitchCount(previous);
      const now = stitchCount(round);
      const changes = tokens(round).some(({ token }) => CHANGES_COUNT.has(token.symbol));
      if (before > 0 && !changes && (now * 2 < before || now > before * 2)) {
        found.push({ kind: 'jump', round: number });
      }
      const repeated = round.groups.some((group) => group.repeat > 1);
      const ambiguous = tokens(round).some(({ token }) => AMBIGUOUS.has(token.symbol));
      const ambiguousBefore = tokens(previous).some(({ token }) => AMBIGUOUS.has(token.symbol));
      if (
        repeated &&
        before > 0 &&
        !ambiguous &&
        !ambiguousBefore &&
        consumedCount(round) !== before
      ) {
        found.push({ kind: 'repeat', round: number });
      }
    }
    previous = round;
  });
  return found;
}

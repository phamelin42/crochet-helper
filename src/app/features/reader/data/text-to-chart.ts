import { Convention, Group, Round, Token, stitchCount } from './chart-composer';
import { CHART_SYMBOLS } from './chart-symbols';
import { PatternPiece, PatternStep } from './pattern.model';

/** Bornes : un patron collé est une entrée d'un tiers, jamais d'exception. */
const MAX_ROUNDS = 200;
const MAX_STITCHES = 400;

export interface PieceChart {
  /** Déduit des libellés : « Tour/Rnd » → round, « Rang/Row » → row. */
  readonly kind: Round['kind'];
  /** Un par étape, dans l'ordre ; null = non dessinable. */
  readonly rounds: readonly (Round | null)[];
  /** Nombre d'étapes non nulles. */
  readonly drawable: number;
}

const field = (convention: Convention) =>
  convention === 'FR' ? 'fr' : convention === 'UK' ? 'uk' : 'us';

// `\s` couvre déjà les espaces insécables que le français place avant « : ».
const normalize = (text: string): string => text.replace(/\s+/g, ' ').trim().toLowerCase();

const TABLES: Record<Convention, ReadonlyMap<string, string>> = {
  US: abbreviationTable('US'),
  UK: abbreviationTable('UK'),
  FR: abbreviationTable('FR'),
};

function abbreviationTable(convention: Convention): ReadonlyMap<string, string> {
  const table = new Map<string, string>();
  for (const symbol of CHART_SYMBOLS) {
    const abbr = normalize(symbol[field(convention)]);
    if (!table.has(abbr)) table.set(abbr, symbol.id);
  }
  return table;
}

const MAGIC_RING = /\b(?:in|into) (?:a |the )?magic ring\b|\bdans (?:un|le) cercle magique\b/;
const CHAIN = /\bin 2nd ch from hook\b|\bdans la 2e ml(?: [àa] partir du crochet)?(?=\s|,|$)/;
const EACH = /\b(?:in each st(?: (?:around|across))?|dans chaque maille(?: du tour)?)(?=\s|,|$)/;
const WRITTEN_COUNT = /\s*\((\d+)\)\s*\.?\s*$/;
const GROUP =
  /(?:\*([^*]+)\*|\(([^()]+)\))\s*,?\s*(?:[x×]\s*(\d+)|(?:repeat|r[ée]p[èe]te|r[ée]p[ée]ter|rep\.?)\s*(\d+)\s*(?:times|fois)|(\d+)\s*(?:times|fois))/g;

/** « 6 sc », « sc », « 2 dc inc », « sc x 6 » ; null si un mot n'est pas une maille connue. */
function parseToken(item: string, table: ReadonlyMap<string, string>): Token | null {
  const match = /^(?:(\d+)\s*)?(.+?)(?:\s*[x×]\s*(\d+))?$/.exec(item);
  if (!match) return null;
  const symbol = table.get(match[2].trim());
  if (!symbol) return null;
  const count = Number(match[1] ?? match[3] ?? 1);
  return count >= 1 && count <= MAX_STITCHES ? { symbol, count } : null;
}

/** « sc, sc inc » → jetons ; null dès qu'un morceau n'est pas lisible. */
function parseTokens(text: string, table: ReadonlyMap<string, string>): Token[] | null {
  const items = text
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const tokens: Token[] = [];
  for (const item of items) {
    const token = parseToken(item, table);
    if (!token) return null;
    tokens.push(token);
  }
  return tokens;
}

function parseGroups(text: string, table: ReadonlyMap<string, string>): Group[] | null {
  const groups: Group[] = [];
  const loose = (part: string): boolean => {
    const tokens = parseTokens(part, table);
    if (!tokens) return false;
    if (tokens.length > 0) groups.push({ tokens, repeat: 1 });
    return true;
  };
  let last = 0;
  for (const match of text.matchAll(GROUP)) {
    if (!loose(text.slice(last, match.index))) return null;
    const tokens = parseTokens(match[1] ?? match[2], table);
    const repeat = Number(match[3] ?? match[4] ?? match[5]);
    if (!tokens || tokens.length === 0 || repeat < 1 || repeat > MAX_STITCHES) return null;
    groups.push({ tokens, repeat });
    last = match.index + match[0].length;
  }
  return loose(text.slice(last)) ? groups : null;
}

/**
 * Une étape du lecteur en tour de diagramme, ou null quand elle n'est pas
 * dessinable. `convention` lève l'ambiguïté de « dc » (bride en US, maille
 * serrée en UK) ; sans elle, l'américaine.
 */
export function stepToRound(
  step: PatternStep,
  kind: Round['kind'],
  convention: Convention = 'US',
): Round | null {
  if (!step.label.trim()) return null;
  let text = normalize(step.body).replace(/[.:;]+$/, '');

  const writtenMatch = WRITTEN_COUNT.exec(text);
  const written = writtenMatch ? Number(writtenMatch[1]) : null;
  if (writtenMatch) text = text.slice(0, writtenMatch.index);

  let into: Round['into'];
  if (MAGIC_RING.test(text)) {
    into = 'magic-ring';
    text = text.replace(MAGIC_RING, ' ');
  } else if (CHAIN.test(text)) {
    into = 'chain';
    text = text.replace(CHAIN, ' ');
  }

  const table = TABLES[convention];
  let groups: Group[] | null;
  if (EACH.test(text)) {
    // « sc in each st around (24) » : le compte écrit dit combien de fois.
    const tokens = written ? parseTokens(text.replace(EACH, ' '), table) : null;
    if (!tokens || tokens.length !== 1 || tokens[0].count !== 1) return null;
    groups = [{ tokens: [{ symbol: tokens[0].symbol, count: written ?? 0 }], repeat: 1 }];
  } else {
    groups = parseGroups(text, table);
  }
  if (!groups || groups.length === 0) return null;

  const round: Round = { kind, groups, ...(into ? { into } : {}) };
  const count = stitchCount(round);
  if (count > MAX_STITCHES) return null;
  // Mieux vaut ne pas dessiner que dessiner faux.
  if (written !== null && count !== written) return null;
  return round;
}

const ROW_LABEL = /^(?:rangs?|rows?|rgs?)\b/i;
const ROUND_LABEL = /^(?:tours?|rounds?|rnds?)\b/i;

/** Abréviations propres à une convention : les seules qui la trahissent. */
function exclusive(convention: Convention, others: readonly Convention[]): RegExp | null {
  const own = [...TABLES[convention].keys()].filter(
    (abbr) => !others.some((other) => TABLES[other].has(abbr)),
  );
  if (own.length === 0) return null;
  const escaped = own.map((abbr) => abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(?<![\\p{L}\\d-])(?:${escaped.join('|')})(?![\\p{L}\\d-])`, 'gu');
}

const FR_ONLY = exclusive('FR', ['US', 'UK']);
const UK_ONLY = exclusive('UK', ['US', 'FR']);

/** Français si une abréviation française apparaît, britannique si une seule britannique, sinon américaine. */
export function detectConvention(steps: readonly PatternStep[]): Convention {
  const text = normalize(steps.map((step) => step.body).join(' '));
  const hits = (pattern: RegExp | null): number =>
    pattern ? (text.match(pattern) ?? []).length : 0;
  const fr = hits(FR_ONLY);
  const uk = hits(UK_ONLY);
  if (fr > 0 && fr >= uk) return 'FR';
  return uk > 0 ? 'UK' : 'US';
}

export function pieceToChart(piece: PatternPiece, convention?: Convention): PieceChart {
  const steps = piece.steps.slice(0, MAX_ROUNDS);
  const rows = steps.filter((step) => ROW_LABEL.test(step.label.trim())).length;
  const rounds = steps.filter((step) => ROUND_LABEL.test(step.label.trim())).length;
  const kind: Round['kind'] = rows > rounds ? 'row' : 'round';
  const used = convention ?? detectConvention(steps);
  const charts = piece.steps.map((step, i) =>
    i < MAX_ROUNDS ? stepToRound(step, kind, used) : null,
  );
  return { kind, rounds: charts, drawable: charts.filter(Boolean).length };
}

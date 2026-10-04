import { Convention, Group, Round, Token, roundSymbols, stitchCount } from './chart-composer';
import { CHART_SYMBOLS } from './chart-symbols';
import { PatternPiece, PatternStep } from './pattern.model';

/** Bornes : un patron collé est une entrée d'un tiers, jamais d'exception. */
const MAX_ROUNDS = 200;
const MAX_STITCHES = 400;
/** Une étape « Tours 5 à 8 » se dessine en quatre tours ; au-delà, on ne déplie pas. */
const MAX_SPAN = 50;
/** Mailles dessinées dans toute la pièce : au-delà, le dessin n'aide plus. */
const MAX_CELLS = 4000;
/** Un texte d'étape plus long n'est pas une consigne de maille. */
const MAX_BODY = 600;

export interface PieceChart {
  /** Déduit des libellés : « Tour/Rnd » → round, « Rang/Row » → row. */
  readonly kind: Round['kind'];
  /** Un par étape, dans l'ordre ; null = non dessinable. */
  readonly rounds: readonly (Round | null)[];
  /** Nombre d'étapes non nulles. */
  readonly drawable: number;
  /**
   * Mailles dessinées par étape, tous tours de l'étape compris (« Tours 5-8 »
   * en compte quatre) ; 0 si elle ne se dessine pas : le lecteur le lit sans
   * charger le dessin.
   */
  readonly stitches: readonly number[];
  /** Tours ou rangs couverts par chaque étape : 4 pour « Tours 5-8 », 1 sinon. */
  readonly spans: readonly number[];
  /** Numéro du premier tour de chaque étape, tel que le patron l'écrit. */
  readonly numbers: readonly number[];
}

const field = (convention: Convention) =>
  convention === 'FR' ? 'fr' : convention === 'UK' ? 'uk' : 'us';

// `\s` couvre déjà les espaces insécables que le français place avant « : ».
const normalize = (text: string): string =>
  text.replace(/[’`]/g, "'").replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Autres façons d'écrire une maille, propres à une convention : les patrons
 * trouvés en ligne écrivent « inc » pour « sc inc », « chain » pour « ch ».
 */
const ALIASES: Record<Convention, Readonly<Record<string, string>>> = {
  US: {
    inc: 'sc-inc',
    dec: 'sc2tog',
    invdec: 'sc2tog',
    'inv dec': 'sc2tog',
    'sc dec': 'sc2tog',
    'dc dec': 'dc2tog',
    chain: 'ch',
    slst: 'sl-st',
    'slip stitch': 'sl-st',
    'single crochet': 'sc',
    'half double crochet': 'hdc',
    'double crochet': 'dc',
    'treble crochet': 'tr',
    treble: 'tr',
    'double treble': 'dtr',
    'double treble crochet': 'dtr',
    popcorn: 'popcorn',
    pop: 'popcorn',
    'puff stitch': 'puff',
    'v-st': 'v-stitch',
    'v st': 'v-stitch',
    'v-stitch': 'v-stitch',
    cluster: 'cluster',
    '3 dc cl': 'cluster',
    'dc cl': 'cluster',
    'hdc cl': 'hdc-cluster',
  },
  UK: {
    inc: 'sc-inc',
    dec: 'sc2tog',
    invdec: 'sc2tog',
    chain: 'ch',
    slst: 'sl-st',
    'sl st': 'sl-st',
    'slip stitch': 'sl-st',
    'double crochet': 'sc',
    'half treble': 'hdc',
    'half treble crochet': 'hdc',
    treble: 'dc',
    'treble crochet': 'dc',
    'double treble': 'tr',
    popcorn: 'popcorn',
    pop: 'popcorn',
    'v-st': 'v-stitch',
    'v st': 'v-stitch',
    cluster: 'cluster',
  },
  FR: {
    aug: 'sc-inc',
    dim: 'sc2tog',
    'maille serrée': 'sc',
    'mailles serrées': 'sc',
    'demi-bride': 'hdc',
    'demi-brides': 'hdc',
    bride: 'dc',
    brides: 'dc',
    'double bride': 'tr',
    'doubles brides': 'tr',
    'double-bride': 'tr',
    'triple bride': 'dtr',
    'triple-bride': 'dtr',
    'maille en l’air': 'ch',
    "maille en l'air": 'ch',
    "mailles en l'air": 'ch',
    'maille coulée': 'sl-st',
    'mailles coulées': 'sl-st',
    tbr: 'dtr',
    'v-st': 'v-stitch',
    'point v': 'v-stitch',
    popcorn: 'popcorn',
  },
};

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
  for (const [alias, id] of Object.entries(ALIASES[convention])) {
    const key = normalize(alias);
    if (!table.has(key)) table.set(key, id);
  }
  return table;
}

/** « sc's », « dcs », « brides » : le pluriel ne change pas la maille. */
function lookup(name: string, table: ReadonlyMap<string, string>): string | undefined {
  const key = name.trim();
  return (
    table.get(key) ??
    table.get(`${key}.`) ??
    table.get(key.replace(/'s$/, '')) ??
    table.get(key.replace(/e?s$/, ''))
  );
}

/** Deux mailles dans la même : l'augmentation de cette maille, quand elle a un symbole. */
const INCREASE: Readonly<Record<string, string>> = { sc: 'sc-inc', dc: 'dc-inc' };

const MAGIC_RING =
  /\b(?:in|into|work) (?:a |the )?(?:magic (?:ring|loop|circle)|mr|adjustable ring)\b|\bdans (?:un|le) cercle magique\b/;
const CHAIN =
  /\b(?:in|into) (?:the )?(?:2nd|second) (?:ch|chain) from (?:the )?hook\b|\bdans la 2e ml(?: [àa] partir du crochet)?(?=\s|,|$)/;
/** Fermeture du tour : une maille coulée qui ne compte pas dans le tour. */
const JOIN =
  /(?:^|,|;|\.)\s*(?:and )?(?:join(?: with)?(?: an?)? (?:sl st|slst|slip stitch|ss)\b[^,;.]*|(?:sl st|slst|slip stitch|ss) (?:to|into|in) (?:the )?(?:first|1st|beg\w*|top)\b[^,;.]*|join (?:to|in|into) (?:the )?(?:first|1st|beg\w*|top)\b[^,;.]*|(?:fermer|joindre)(?: le tour)?(?: (?:par|avec))? (?:1 |une )?(?:mc|maille coulée)\b[^,;.]*|1 mc dans la (?:1re|première|premiere)\b[^,;.]*)/g;
/** Ce qui se fait sans maille : on l'écarte avant de lire les mailles. */
const NOISE =
  /\b(?:do not turn|don't turn|turn|pull (?:the )?(?:ring|loop) closed|tighten (?:the )?ring|tourner|serrer le cercle)\b/g;
const WRITTEN_COUNT =
  /[([]\s*(\d+)\s*(?:sts?|stitches|mailles?|m|ms)?\s*[)\]]|(?:^|\s)[-=]\s*(\d+)\s*(?:sts?|stitches|mailles?)?\s*$/;

/** Ce qui suit un groupe et dit combien de fois le faire. */
const REPEAT_TAIL = String.raw`\s*,?\s*(?:[x×]\s*(\d+)|(\d+)\s*(?:x|×|times|fois)\b|(?:repeat|rep\.?|r[ée]p[éèe]t[ée]r?|r[ée]p[éè]ter)(?: from \*)?\s*(?:(\d+)\s*(?:x|×|times|fois)\b|(around|across|to end|tout autour))|(around|across|all around|to end|tout autour|jusqu'à la fin))`;
const GROUP = new RegExp(String.raw`(?:\*([^*]+)\*|\(([^()]+)\)|\[([^[\]]+)\])` + REPEAT_TAIL, 'g');
/** « *sc, inc; rep from * around » : l'étoile ouvrante seule. */
const OPEN_STAR =
  /\*([^*]+?)[,;]?\s*(?:repeat|rep\.?|r[ée]p[éè]ter)\s+(?:from|depuis|de)\s+\*\s*(?:(\d+)\s*(more\s+|de plus\s+)?(?:times|fois)|(around|across|to end|tout autour))/;

/** Un morceau lu : des mailles, et ce qu'il faut savoir pour les compter. */
interface Piece {
  readonly tokens: Token[];
  /** « autour » : le nombre de répétitions vient du tour précédent. */
  readonly around?: boolean;
}

const PLACEMENT =
  /^(?:in|into|dans)\s+(?:the\s+|la\s+|le\s+|les\s+)?(?:(each of the next|each of next|next|same|last|first|remaining|each|every|chaque)\s+)?(?:(\d+)\s+)?(?:[\p{L}\d-]+(?:'s)?)?(?:\s+(?:sp|space|loop|st|stitch))?(?:\s+of (?:the )?(?:previous|last) (?:round|row|rnd))?(?:\s+(around|across))?$/u;
const FR_NEXT = /^dans (?:la|les) (?:(\d+) )?mailles? suivantes?$/;
const FR_EACH = /^(?:dans )?(?:chaque|toutes les) mailles?(?: du (?:tour|rang))?$/;
const AROUND = /^(?:all )?(?:around|across|to end|tout autour|jusqu'à la fin)$/;
const LOOP =
  /\b(?:in |into )?(?:the )?(blo|flo|back loops? only|front loops? only|back loops?|front loops?|brin arrière|brin avant)\b/;

/** « 6 sc », « sc », « 2 dc inc », « sc x 6 », « dc 11 », « 2 sc in next st », « sc around ». */
function parseItem(raw: string, table: ReadonlyMap<string, string>): Piece[] | null {
  let item = raw
    .trim()
    .replace(/^(?:and|then|make|work|puis|faire)\s+/, '')
    .replace(/[.:]+$/, '')
    .trim();
  if (!item) return [];

  // Le brin se dessine une fois, avant les mailles : il ne se répète pas avec elles.
  const pieces: Piece[] = [];
  // « sc in blo » : le brin se dessine avant la maille ; « 3 blo » seul reste un jeton.
  const loop = LOOP.exec(item);
  if (loop && /\p{L}/u.test(item.slice(0, loop.index) + item.slice(loop.index + loop[0].length))) {
    pieces.push({
      tokens: [{ symbol: /^(?:f|brin avant)/.test(loop[1]) ? 'flo' : 'blo', count: 1 }],
    });
    item = (item.slice(0, loop.index) + item.slice(loop.index + loop[0].length))
      .replace(/\s+/g, ' ')
      .trim();
    if (!item) return pieces;
  }

  // La maille, son nombre devant ou derrière, puis où la faire.
  const match =
    /^(?:(\d+)\s*)?([\p{L}][\p{L}\d' .-]*?)(?:\s*(\d+))?(?:\s*[x×]\s*(\d+))?(?:\s+((?:in|into|dans|around|across|all around|to end|tout autour|jusqu'à)\b.*|chaque.*))?$/u.exec(
      item,
    );
  if (!match) return null;
  let symbol = lookup(match[2], table);
  if (!symbol) return null;
  const before = Number(match[1] ?? 1);
  const after = Number(match[3] ?? match[4] ?? 1);
  if (match[1] && (match[3] || match[4])) return null;
  let perStitch = before * after;
  let stitches = 1;
  let around = false;

  const where = match[5]?.trim();
  if (where) {
    let place: RegExpExecArray | null;
    if (AROUND.test(where) || FR_EACH.test(where)) {
      around = true;
    } else if ((place = FR_NEXT.exec(where))) {
      stitches = Number(place[1] ?? 1);
    } else if ((place = PLACEMENT.exec(where))) {
      const [, which, n, tail] = place;
      if (which === 'each' || which === 'every' || which === 'chaque') {
        if (n) return null;
        around = true;
      } else {
        stitches = Number(n ?? 1);
        if (tail) around = true;
      }
    } else {
      return null;
    }
  }

  // « 2 sc in next st » est une augmentation ; « 5 dc in next st », une coquille.
  if (perStitch > 1 && (where || match[1])) {
    if (where && perStitch === 2 && INCREASE[symbol]) {
      symbol = INCREASE[symbol];
      perStitch = 1;
    } else if (where && perStitch === 5 && symbol === 'dc') {
      symbol = 'shell';
      perStitch = 1;
    } else if (where) {
      return null;
    }
  }
  const count = perStitch * stitches;
  if (count < 1 || count > MAX_STITCHES) return null;
  const tokens = [{ symbol, count }];
  pieces.push(around ? { tokens, around: true } : { tokens });
  return pieces;
}

/** « sc, sc inc » → morceaux ; null dès qu'un morceau n'est pas lisible. */
function parseItems(text: string, table: ReadonlyMap<string, string>): Piece[] | null {
  const pieces: Piece[] = [];
  for (const item of text.split(/[,;]|\bthen\b|\bpuis\b/)) {
    const read = parseItem(item, table);
    if (!read) return null;
    pieces.push(...read);
  }
  return pieces;
}

/** Ce qu'un morceau de consigne a lu : mailles libres, groupes répétés, groupes « autour ». */
interface Part {
  readonly tokens: Token[];
  /** Nombre de répétitions, ou `around` : à déduire du tour précédent. */
  readonly repeat: number | 'around';
  /** Un groupe entre crochets ; les mailles libres voisines se fondent en un seul groupe. */
  readonly bracketed: boolean;
}

function parseLoose(text: string, table: ReadonlyMap<string, string>, parts: Part[]): boolean {
  // Un aparté sans répétition (« [not the chain!] », « (both loops) ») n'est pas une maille.
  const cleaned = text.replace(/\(([^()]*)\)|\[([^[\]]*)\]/g, (whole, a, b) => {
    const inner = (a ?? b) as string;
    return parseItems(inner, table)?.length ? `, ${inner},` : ' ';
  });
  const pieces = parseItems(cleaned, table);
  if (!pieces) return false;
  for (const piece of pieces) {
    parts.push({
      tokens: piece.tokens,
      repeat: piece.around ? 'around' : 1,
      bracketed: false,
    });
  }
  return true;
}

function parseParts(text: string, table: ReadonlyMap<string, string>): Part[] | null {
  const open = OPEN_STAR.exec(text);
  if (open) {
    const before = text.slice(0, open.index);
    const after = text.slice(open.index + open[0].length);
    const inner = parseItems(open[1], table);
    if (!inner || inner.some((piece) => piece.around)) return null;
    const times = open[2] ? Number(open[2]) + (open[3] ? 1 : 0) : null;
    const head = parseParts(before, table);
    const tail = parseParts(after, table);
    if (!head || !tail) return null;
    return [
      ...head,
      {
        tokens: inner.flatMap((piece) => piece.tokens),
        repeat: times ?? 'around',
        bracketed: true,
      },
      ...tail,
    ];
  }

  const parts: Part[] = [];
  let last = 0;
  for (const match of text.matchAll(GROUP)) {
    if (!parseLoose(text.slice(last, match.index), table, parts)) return null;
    const inner = parseItems(match[1] ?? match[2] ?? match[3], table);
    if (!inner || inner.length === 0 || inner.some((piece) => piece.around)) return null;
    const times = match[4] ?? match[5] ?? match[6];
    const repeat = times ? Number(times) : 'around';
    if (repeat !== 'around' && (repeat < 1 || repeat > MAX_STITCHES)) return null;
    parts.push({ tokens: inner.flatMap((piece) => piece.tokens), repeat, bracketed: true });
    last = match.index + match[0].length;
  }
  return parseLoose(text.slice(last), table, parts) ? parts : null;
}

/** Mailles reprises au tour précédent : ce qui dit combien de fois « autour » se répète. */
function consumed(tokens: readonly Token[]): number {
  return tokens.reduce((sum, token) => sum + CONSUMES(token.symbol) * token.count, 0);
}
function produced(tokens: readonly Token[]): number {
  return stitchCount({ kind: 'round', groups: [{ tokens, repeat: 1 }] });
}
const CONSUMES = (id: string): number =>
  ({
    'magic-ring': 0,
    blo: 0,
    flo: 0,
    ch: 0,
    'ch-space': 0,
    picot: 0,
    sc2tog: 2,
    dc2tog: 2,
    dc3tog: 3,
    sc3tog: 3,
  })[id] ?? 1;

/** Le compte écrit en fin d'étape, « (18) », « - 18 sts » ; null s'il n'y en a pas. */
export function writtenCount(body: string): number | null {
  const match = WRITTEN_COUNT.exec(normalize(body));
  return match ? Number(match[1] ?? match[2]) : null;
}

/**
 * Une étape du lecteur en tour de diagramme, ou null quand elle n'est pas
 * dessinable. `convention` lève l'ambiguïté de « dc » (bride en US, maille
 * serrée en UK) ; sans elle, l'américaine. `previous` est le nombre de mailles
 * du tour d'avant : c'est lui qui dit combien de fois répéter « sc around ».
 */
export function stepToRound(
  step: PatternStep,
  kind: Round['kind'],
  convention: Convention = 'US',
  previous = 0,
): Round | null {
  if (!step.label.trim() || step.body.length > MAX_BODY) return null;
  const body = normalize(step.body);
  // La consigne, puis la consigne sans ses phrases suivantes : « (12) Stuff firmly. »
  const sentences = body.split(/(?<=[a-z\d)\]!])\.\s+(?=[a-z])/);
  for (let keep = sentences.length; keep >= 1; keep--) {
    const round = readRound(sentences.slice(0, keep).join('. '), kind, convention, previous);
    if (round) return round;
  }
  return null;
}

function readRound(
  source: string,
  kind: Round['kind'],
  convention: Convention,
  previous: number,
): Round | null {
  let text = source;
  const countMatch = WRITTEN_COUNT.exec(text);
  const written = countMatch ? Number(countMatch[1] ?? countMatch[2]) : null;
  // Ce qui suit le compte écrit est un commentaire (« Stuff firmly »).
  if (countMatch) text = text.slice(0, countMatch.index);
  // Un intitulé entre parenthèses en tête : « (Increase row): ».
  text = text
    .replace(/^\s*\([^()]*\)\s*:\s*/, '')
    .replace(/[.:;,\s-]+$/, '')
    .trim();

  let into: Round['into'];
  if (MAGIC_RING.test(text)) {
    into = 'magic-ring';
    text = text.replace(MAGIC_RING, ' ');
  } else if (CHAIN.test(text)) {
    into = 'chain';
    text = text.replace(CHAIN, ' ');
  }

  let joins = 0;
  text = text.replace(JOIN, () => {
    joins++;
    return ',';
  });
  text = text.replace(NOISE, ' ').replace(/\s+/g, ' ');
  if (joins > 1) return null;

  const table = TABLES[convention];
  const parts = parseParts(text, table);
  if (!parts || parts.length === 0) return null;

  // « autour » : ce qui reste de mailles au tour précédent, ou à défaut au compte écrit.
  const arounds = parts.filter((part) => part.repeat === 'around');
  if (arounds.length > 1) return null;
  const join: Token[] = joins ? [{ symbol: 'sl-st', count: 1 }] : [];
  const resolved: { tokens: Token[]; repeat: number; bracketed: boolean }[] = [];
  for (const part of parts) {
    if (part.repeat !== 'around') {
      resolved.push({ ...part, repeat: part.repeat });
      continue;
    }
    const others = parts.filter((other) => other !== part);
    const flat = (list: readonly Part[]) =>
      list.flatMap((other) =>
        other.tokens.map((token) => ({
          ...token,
          count: token.count * (other.repeat === 'around' ? 0 : other.repeat),
        })),
      );
    let times = 0;
    const per = consumed(part.tokens);
    if (previous > 0 && per > 0) {
      const left = previous - consumed(flat(others));
      if (left > 0 && left % per === 0) times = left / per;
    }
    if (!times && written !== null) {
      const left = written - produced(flat(others));
      const each = produced(part.tokens);
      if (each > 0 && left > 0 && left % each === 0) times = left / each;
    }
    if (!times || times > MAX_STITCHES) return null;
    resolved.push({ ...part, repeat: times });
  }

  // Une maille seule répétée « autour » s'écrit « 24 sc », comme le patron la compte.
  const groups: Group[] = [];
  let loose: Token[] = [];
  const flush = () => {
    if (loose.length) groups.push({ tokens: loose, repeat: 1 });
    loose = [];
  };
  for (const part of resolved) {
    if (part.bracketed && part.repeat > 1) {
      flush();
      groups.push({ tokens: part.tokens, repeat: part.repeat });
    } else {
      for (const token of part.tokens) {
        const count = token.count * part.repeat;
        if (count > MAX_STITCHES) return null;
        loose.push({ ...token, count });
      }
    }
  }
  loose.push(...join);
  flush();
  if (groups.length === 0) return null;

  const round: Round = { kind, groups, ...(into ? { into } : {}) };
  const count = stitchCount(round);
  if (count > MAX_STITCHES) return null;
  if (written !== null && !countMatches(groups, count, joins, written)) return null;
  return round;
}

/**
 * Mieux vaut ne pas dessiner que dessiner faux : le compte écrit doit tomber
 * juste, la chaînette de départ et la maille coulée de fermeture comptées ou
 * non, comme les patrons le font chacun à sa manière (« ch 3 compte pour une
 * bride »).
 */
function countMatches(groups: Group[], count: number, joins: number, written: number): boolean {
  const chains = (group: Group | undefined, token: Token | undefined): number =>
    group && token?.symbol === 'ch' && group.repeat === 1 ? token.count : 0;
  const start = chains(groups[0], groups[0].tokens[0]);
  const end = chains(groups.at(-1), groups.at(-1)?.tokens.at(-1));
  const options = (n: number) => (n ? [0, n, n - 1] : [0]);
  return options(start).some((s) =>
    options(end).some((e) => [0, joins].some((j) => count - s - e - j === written)),
  );
}

const ROW_LABEL = /^(?:rangs?|rows?|rgs?)\b/i;
const ROUND_LABEL = /^(?:tours?|rounds?|rnds?)\b/i;

/** « Tours 5-8 » → [5, 4] ; « Rang 3 » → [3, 1] ; null sans numéro. */
export function labelRange(label: string): readonly [number, number] | null {
  const match = /(\d+)(?:\s*(?:-|–|—|to|à|au)\s*(\d+))?/.exec(label);
  if (!match) return null;
  const first = Number(match[1]);
  const last = match[2] ? Number(match[2]) : first;
  if (last < first || last - first >= MAX_SPAN) return [first, 1];
  return [first, last - first + 1];
}

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

  const charts: (Round | null)[] = [];
  const spans: number[] = [];
  const numbers: number[] = [];
  let previous = 0;
  let next = 1;
  let cells = 0;
  piece.steps.forEach((step, i) => {
    const range = labelRange(step.label);
    const [number, span] = range ?? [next, 1];
    numbers.push(number);
    spans.push(span);
    next = number + span;
    let round = i < MAX_ROUNDS ? stepToRound(step, kind, used, previous) : null;
    const size = round ? roundSymbols(round).length * span : 0;
    if (round && cells + size > MAX_CELLS) round = null;
    if (round) {
      cells += size;
      previous = writtenCount(step.body) ?? stitchCount(round);
    } else {
      // Le compte écrit d'une étape non dessinée sert encore au tour suivant.
      previous = writtenCount(step.body) ?? 0;
    }
    charts.push(round);
  });
  return {
    kind,
    rounds: charts,
    drawable: charts.filter(Boolean).length,
    stitches: charts.map((round, i) => (round ? roundSymbols(round).length * spans[i] : 0)),
    spans,
    numbers,
  };
}

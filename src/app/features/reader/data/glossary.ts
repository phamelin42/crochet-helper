import { Locale } from '../../../core/i18n/locale';

/** Une abréviation de patron et sa traduction en clair. */
export interface GlossaryEntry {
  /** Abréviation telle qu'elle apparaît dans les patrons. */
  readonly term: string;
  readonly fr: string;
  readonly en: string;
  readonly craft: 'crochet' | 'tricot' | 'commun';
}

/**
 * Glossaire crochet / tricot, français et anglais.
 *
 * Sert deux usages : l'infobulle du lecteur, et la page `/glossaire`, qui est
 * la principale porte d'entrée de référencement du site (les tricoteuses
 * cherchent « ms crochet signification », « what does sc mean »…).
 */
export const GLOSSARY: readonly GlossaryEntry[] = [
  {
    term: 'crab st',
    fr: "maille serrée à l'envers — point d'écrevisse, travaillé de gauche à droite",
    en: 'crab stitch — reverse single crochet, worked left to right',
    craft: 'crochet',
  },
  {
    term: 'rsc',
    fr: "maille serrée à l'envers — point d'écrevisse, travaillé de gauche à droite",
    en: 'reverse single crochet — worked left to right',
    craft: 'crochet',
  },
  {
    term: 'fpdc',
    fr: 'bride relief endroit — la bride passe autour du montant de la maille',
    en: 'front post double crochet — worked around the stitch post',
    craft: 'crochet',
  },
  {
    term: 'bpdc',
    fr: 'bride relief envers — la bride passe derrière le montant de la maille',
    en: 'back post double crochet — worked behind the stitch post',
    craft: 'crochet',
  },
  { term: 'slst', fr: 'maille coulée', en: 'slip stitch', craft: 'crochet' },
  { term: 'rnd', fr: 'tour', en: 'round', craft: 'crochet' },
  { term: 'rnds', fr: 'tours', en: 'rounds', craft: 'crochet' },
  {
    term: 'puff',
    fr: 'point bouillon — plusieurs boucles fermées ensemble',
    en: 'puff stitch — several loops closed together',
    craft: 'crochet',
  },
  {
    term: 'bobble',
    fr: 'point popcorn — plusieurs brides fermées ensemble',
    en: 'bobble — several double crochets closed together',
    craft: 'crochet',
  },
  {
    term: 'v-st',
    fr: 'point V — deux brides séparées par une maille en l’air, dans la même maille',
    en: 'V-stitch — two doubles with a chain between, in the same stitch',
    craft: 'crochet',
  },
  { term: 'sp', fr: 'espace', en: 'space', craft: 'crochet' },
  { term: 'beg', fr: 'début', en: 'beginning', craft: 'commun' },
  { term: 'rem', fr: 'restant', en: 'remaining', craft: 'commun' },
  { term: 'tbl', fr: 'par le brin arrière', en: 'through the back loop', craft: 'tricot' },
  { term: 'ms', fr: 'maille serrée', en: 'single crochet', craft: 'crochet' },
  { term: 'sc', fr: 'maille serrée', en: 'single crochet', craft: 'crochet' },
  { term: 'dc', fr: 'bride', en: 'double crochet', craft: 'crochet' },
  { term: 'db', fr: 'demi-bride', en: 'half double crochet', craft: 'crochet' },
  { term: 'hdc', fr: 'demi-bride', en: 'half double crochet', craft: 'crochet' },
  { term: 'tr', fr: 'double bride', en: 'treble crochet', craft: 'crochet' },
  { term: 'dtr', fr: 'triple bride', en: 'double treble', craft: 'crochet' },
  { term: 'mc', fr: 'maille coulée', en: 'slip stitch', craft: 'crochet' },
  { term: 'sl st', fr: 'maille coulée', en: 'slip stitch', craft: 'crochet' },
  { term: 'ss', fr: 'maille coulée', en: 'slip stitch', craft: 'crochet' },
  { term: 'ml', fr: "maille en l'air", en: 'chain stitch', craft: 'crochet' },
  { term: 'ch', fr: "maille en l'air", en: 'chain', craft: 'crochet' },
  {
    term: 'aug',
    fr: 'augmentation — 2 mailles dans la même maille',
    en: 'increase — 2 stitches in one',
    craft: 'commun',
  },
  {
    term: 'inc',
    fr: 'augmentation — 2 mailles dans la même maille',
    en: 'increase — 2 stitches in one',
    craft: 'commun',
  },
  {
    term: 'dim',
    fr: 'diminution — 2 mailles ensemble',
    en: 'decrease — 2 stitches together',
    craft: 'commun',
  },
  {
    term: 'dec',
    fr: 'diminution — 2 mailles ensemble',
    en: 'decrease — 2 stitches together',
    craft: 'commun',
  },
  { term: 'sts', fr: 'mailles', en: 'stitches', craft: 'commun' },
  { term: 'st', fr: 'maille', en: 'stitch', craft: 'commun' },
  { term: 'magic ring', fr: 'cercle magique', en: 'magic ring', craft: 'crochet' },
  { term: 'cercle magique', fr: 'cercle magique', en: 'magic ring', craft: 'crochet' },
  { term: 'mr', fr: 'cercle magique', en: 'magic ring', craft: 'crochet' },
  {
    term: 'blo',
    fr: 'dans le brin arrière uniquement',
    en: 'back loop only',
    craft: 'crochet',
  },
  { term: 'flo', fr: 'dans le brin avant uniquement', en: 'front loop only', craft: 'crochet' },
  { term: 'yo', fr: 'jeté', en: 'yarn over', craft: 'commun' },
  { term: 'tog', fr: 'ensemble', en: 'together', craft: 'commun' },
  { term: 'rep', fr: 'répéter', en: 'repeat', craft: 'commun' },
  { term: 'sk', fr: 'sauter une maille', en: 'skip a stitch', craft: 'commun' },
  { term: 'fo', fr: 'arrêter le fil', en: 'fasten off', craft: 'commun' },
  { term: 'rs', fr: 'endroit du travail', en: 'right side', craft: 'commun' },
  { term: 'ws', fr: 'envers du travail', en: 'wrong side', craft: 'commun' },
  { term: 'k2tog', fr: '2 mailles endroit ensemble', en: 'knit 2 together', craft: 'tricot' },
  { term: 'ssk', fr: 'glisser, glisser, tricoter', en: 'slip slip knit', craft: 'tricot' },
  { term: 'm1', fr: 'une maille augmentée', en: 'make one stitch', craft: 'tricot' },
  { term: 'co', fr: 'monter les mailles', en: 'cast on', craft: 'tricot' },
  { term: 'bo', fr: 'rabattre les mailles', en: 'bind off', craft: 'tricot' },
];

const DEFINITIONS = new Map<string, GlossaryEntry>(
  GLOSSARY.map((entry) => [entry.term.toLowerCase(), entry]),
);

/** Termes triés du plus long au plus court, pour que « sl st » gagne sur « st ». */
const PATTERN = new RegExp(
  `(?<![\\p{L}'’])(${GLOSSARY.map((e) => e.term)
    .sort((a, b) => b.length - a.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'))
    .join('|')})(?![\\p{L}'’])`,
  'giu',
);

/** Un morceau de texte, éventuellement porteur d'une définition. */
export interface TextSegment {
  readonly text: string;
  readonly definition?: string;
}

export function definitionOf(term: string, locale: Locale): string | undefined {
  const entry = DEFINITIONS.get(term.toLowerCase().replace(/\s+/g, ' '));
  return entry ? entry[locale] : undefined;
}

/**
 * Découpe un texte en segments neutres et segments annotés d'une définition.
 *
 * Renvoyer des segments plutôt que du HTML évite tout `innerHTML` : le gabarit
 * les rend avec un `@for`, donc rien d'issu du texte collé par l'utilisateur
 * n'est jamais interprété comme du balisage.
 */
export function annotate(text: string, locale: Locale): TextSegment[] {
  const segments: TextSegment[] = [];
  let index = 0;
  PATTERN.lastIndex = 0;

  for (const match of text.matchAll(PATTERN)) {
    const start = match.index ?? 0;
    const definition = definitionOf(match[0], locale);
    if (!definition) continue;
    if (start > index) segments.push({ text: text.slice(index, start) });
    segments.push({ text: match[0], definition });
    index = start + match[0].length;
  }
  if (index < text.length) segments.push({ text: text.slice(index) });
  return segments.length ? segments : [{ text }];
}

/**
 * Remplace chaque abréviation connue par sa définition en clair.
 *
 * Rendu **d'affichage uniquement** : le texte source du patron n'est jamais
 * modifié, sinon le découpage — qui reparse `source` à chaque changement —
 * travaillerait sur un texte réécrit.
 *
 * Le résultat est plus long que l'original : c'est un compromis lisibilité
 * contre compacité, laissé au choix de la personne qui crochète.
 */
export function expand(text: string, locale: Locale): string {
  const parts = annotate(text, locale).map((segment) => {
    if (!segment.definition) return segment.text;
    // Les définitions portent parfois une glose après un tiret cadratin
    // (« augmentation — 2 mailles dans la même maille ») : dans le fil d'une
    // consigne, seule la tête sert.
    return { expanded: segment.definition.split(/\s+—\s+/)[0] };
  });

  // Les patrons collent l'abréviation au nombre (« 1sc », « Ch3 »). Développée,
  // la forme collée devient illisible : on insère l'espace qui manquait.
  return parts
    .map((part, index) => {
      if (typeof part === 'string') return part;
      const before = parts[index - 1];
      const after = parts[index + 1];
      const left = typeof before === 'string' && /\d$/.test(before) ? ' ' : '';
      const right = typeof after === 'string' && /^\d/.test(after) ? ' ' : '';
      return `${left}${part.expanded}${right}`;
    })
    .join('');
}

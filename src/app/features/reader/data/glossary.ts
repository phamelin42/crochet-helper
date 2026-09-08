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
  return annotate(text, locale)
    .map((segment) => {
      if (!segment.definition) return segment.text;
      // Les définitions du glossaire portent parfois une glose après un tiret
      // cadratin (« augmentation — 2 mailles dans la même maille ») : dans le
      // fil d'une consigne, seule la tête sert.
      return segment.definition.split(/\s+—\s+/)[0];
    })
    .join('');
}

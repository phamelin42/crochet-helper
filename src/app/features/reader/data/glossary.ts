import { Locale } from '../../../core/i18n/locale';

/** Une abréviation de patron et sa traduction en clair. */
export interface GlossaryEntry {
  /** Abréviation telle qu'elle apparaît dans les patrons. */
  readonly term: string;
  readonly fr: string;
  readonly en: string;
  readonly craft: 'crochet' | 'tricot' | 'commun';
  /** Langue des patrons où l'on rencontre cette abréviation : `ms` est française, `sc` anglaise. */
  readonly lang: Locale;
  /**
   * Convention à laquelle appartient cette définition, quand l'abréviation
   * désigne une hauteur de maille qui diffère entre les deux : `sc` et `hdc`
   * n'existent qu'en notation américaine, `htr` et `trtr` qu'en notation
   * britannique.
   * Des lettres comme `dc`, `tr` ou `dtr` sont réutilisées par les deux
   * conventions pour des mailles différentes — la définition ici est
   * l'américaine ; le convertisseur (`features/converter/data/convert-terms.ts`)
   * porte la correspondance complète.
   */
  readonly region?: 'US' | 'UK';
  /**
   * Un rang réaliste qui l'emploie, écrit dans sa propre notation. Il préremplit
   * l'essai de la page d'abréviation : un rang qui a du sens montre ce que fait
   * le lecteur, un gabarit générique (« Row 1: 6 bo, ch 1 ») le dessert.
   */
  readonly example: string;
  /**
   * Identifiant d'URL, dérivé de `term`. `glossary.spec.ts` fige les slugs
   * publiés : un changement de dérivation ne peut pas déplacer une URL indexée
   * sans qu'un test casse.
   */
  readonly slug: string;
}

/** Dérive un identifiant d'URL d'un terme : minuscules, ASCII, tirets. */
function slugify(term: string): string {
  return term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type RawGlossaryEntry = Omit<GlossaryEntry, 'slug'>;

/**
 * Glossaire crochet / tricot, français et anglais.
 *
 * Sert deux usages : l'infobulle du lecteur, et la page `/glossaire`, qui est
 * la principale porte d'entrée de référencement du site (les tricoteuses
 * cherchent « ms crochet signification », « what does sc mean »…).
 */
const RAW_GLOSSARY: readonly RawGlossaryEntry[] = [
  {
    term: 'crab st',
    fr: "maille serrée à l'envers — point d'écrevisse, travaillé de gauche à droite",
    en: 'crab stitch — reverse single crochet, worked left to right',
    craft: 'crochet',
    lang: 'en',
    example: 'Rnd 12: ch 1, crab st in each st around, sl st to first st. Fasten off.',
  },
  {
    term: 'rsc',
    fr: "maille serrée à l'envers — point d'écrevisse, travaillé de gauche à droite",
    en: 'reverse single crochet — worked left to right',
    craft: 'crochet',
    lang: 'en',
    example: 'Rnd 10: ch 1, rsc in each st around, sl st to first rsc. Fasten off.',
  },
  {
    term: 'fpdc',
    fr: 'bride relief endroit — la bride passe autour du montant de la maille',
    en: 'front post double crochet — worked around the stitch post',
    craft: 'crochet',
    lang: 'en',
    example: 'Row 3: ch 2, *fpdc around next st, bpdc around next st; rep from * across, turn.',
  },
  {
    term: 'bpdc',
    fr: 'bride relief envers — la bride passe derrière le montant de la maille',
    en: 'back post double crochet — worked behind the stitch post',
    craft: 'crochet',
    lang: 'en',
    example: 'Row 4: ch 2, *bpdc around next st, fpdc around next st; rep from * across, turn.',
  },
  {
    term: 'slst',
    fr: 'maille coulée',
    en: 'slip stitch',
    craft: 'crochet',
    lang: 'en',
    example: 'Rnd 1: 6 sc in magic ring, slst to first sc to join (6)',
  },
  {
    term: 'rnd',
    fr: 'tour',
    en: 'round',
    craft: 'crochet',
    lang: 'en',
    example: 'Rnd 2: inc in each st around (12)',
  },
  {
    term: 'rnds',
    fr: 'tours',
    en: 'rounds',
    craft: 'crochet',
    lang: 'en',
    example: 'Rnds 5-8: sc in each st around (24)',
  },
  {
    term: 'puff',
    fr: 'point bouillon — plusieurs boucles fermées ensemble',
    en: 'puff stitch — several loops closed together',
    craft: 'crochet',
    lang: 'en',
    example:
      'Row 2: ch 2, puff in next st, *ch 1, sk next st, puff in next st; rep from * to end, turn.',
  },
  {
    term: 'bobble',
    fr: 'point popcorn — plusieurs brides fermées ensemble',
    en: 'bobble — several double crochets closed together',
    craft: 'crochet',
    lang: 'en',
    example: 'Row 5: ch 1, *sc in next 3 sts, bobble in next st; rep from * to end, turn.',
  },
  {
    term: 'v-st',
    fr: 'point V — deux brides séparées par une maille en l’air, dans la même maille',
    en: 'V-stitch — two doubles with a chain between, in the same stitch',
    craft: 'crochet',
    lang: 'en',
    example:
      'Row 2: ch 3, *sk next 2 sts, v-st in next st; rep from * to last st, dc in last st, turn.',
  },
  {
    term: 'sp',
    fr: 'espace',
    en: 'space',
    craft: 'crochet',
    lang: 'en',
    example: 'Rnd 3: sl st in next ch-sp, ch 3, 2 dc in same sp, ch 2, 3 dc in next sp.',
  },
  {
    term: 'beg',
    fr: 'début',
    en: 'beginning',
    craft: 'commun',
    lang: 'en',
    example: 'Rnd 2: ch 3, dc in same st, 2 dc in each st around, sl st to top of beg ch (24)',
  },
  {
    term: 'rem',
    fr: 'restant',
    en: 'remaining',
    craft: 'commun',
    lang: 'en',
    example: 'Row 9: sc in next 10 sts, leave rem sts unworked, turn (10)',
  },
  {
    term: 'tbl',
    fr: 'par le brin arrière',
    en: 'through the back loop',
    craft: 'tricot',
    lang: 'en',
    example: 'Row 3: *k1 tbl, p1; rep from * to end.',
  },
  {
    term: 'ms',
    fr: 'maille serrée',
    en: 'single crochet',
    craft: 'crochet',
    lang: 'fr',
    example: 'Tour 2 : 2 ms dans chaque maille (12)',
  },
  {
    term: 'sc',
    fr: 'maille serrée',
    en: 'single crochet',
    craft: 'crochet',
    lang: 'en',
    region: 'US',
    example: 'Rnd 3: *sc in next st, inc in next st; rep from * around (18)',
  },
  {
    term: 'dc',
    fr: 'bride',
    en: 'double crochet',
    craft: 'crochet',
    lang: 'en',
    region: 'US',
    example: 'Row 2: ch 3 (counts as dc), dc in each st across, turn (20)',
  },
  {
    term: 'db',
    fr: 'demi-bride',
    en: 'half double crochet',
    craft: 'crochet',
    lang: 'fr',
    example: 'Rang 3 : 2 ml, 1 db dans chaque maille, tourner (20)',
  },
  {
    term: 'hdc',
    fr: 'demi-bride',
    en: 'half double crochet',
    craft: 'crochet',
    lang: 'en',
    region: 'US',
    example: 'Row 2: ch 2, hdc in each st across, turn (18)',
  },
  {
    term: 'htr',
    fr: 'demi-bride',
    en: 'half treble crochet',
    craft: 'crochet',
    lang: 'en',
    region: 'UK',
    example: 'Row 2: ch 2, htr in each st across, turn (18)',
  },
  {
    term: 'tr',
    fr: 'double bride',
    en: 'treble crochet',
    craft: 'crochet',
    lang: 'en',
    region: 'US',
    example: 'Row 4: ch 4 (counts as tr), tr in each st across, turn (20)',
  },
  {
    term: 'dtr',
    fr: 'triple bride',
    en: 'double treble',
    craft: 'crochet',
    lang: 'en',
    region: 'US',
    example: 'Row 5: ch 5 (counts as dtr), dtr in each st across, turn (20)',
  },
  {
    term: 'trtr',
    fr: 'triple bride',
    en: 'triple treble crochet',
    craft: 'crochet',
    lang: 'en',
    region: 'UK',
    example: 'Row 5: ch 5 (counts as trtr), trtr in each st across, turn (20)',
  },
  {
    term: 'mc',
    fr: 'maille coulée',
    en: 'slip stitch',
    craft: 'crochet',
    lang: 'fr',
    example: 'Tour 3 : 1 ms dans chaque maille, fermer par 1 mc dans la première ms (18)',
  },
  {
    term: 'sl st',
    fr: 'maille coulée',
    en: 'slip stitch',
    craft: 'crochet',
    lang: 'en',
    example: 'Rnd 1: 6 sc in magic ring, sl st to first sc to join (6)',
  },
  {
    term: 'ss',
    fr: 'maille coulée',
    en: 'slip stitch',
    craft: 'crochet',
    lang: 'en',
    example: 'Last rnd: ss in each st around, fasten off and weave in ends.',
  },
  {
    term: 'ml',
    fr: "maille en l'air",
    en: 'chain stitch',
    craft: 'crochet',
    lang: 'fr',
    example: 'Rang 1 : 21 ml, 1 ms dans la 2e ml à partir du crochet, 1 ms dans chaque ml (20)',
  },
  {
    term: 'ch',
    fr: "maille en l'air",
    en: 'chain',
    craft: 'crochet',
    lang: 'en',
    example: 'Foundation: ch 21, sc in 2nd ch from hook and in each ch across, turn (20)',
  },
  {
    term: 'aug',
    fr: 'augmentation — 2 mailles dans la même maille',
    en: 'increase — 2 stitches in one',
    craft: 'commun',
    lang: 'fr',
    example: 'Tour 3 : *1 ms, 1 aug* 6 fois (18)',
  },
  {
    term: 'inc',
    fr: 'augmentation — 2 mailles dans la même maille',
    en: 'increase — 2 stitches in one',
    craft: 'commun',
    lang: 'en',
    example: 'Rnd 2: inc in each st around (12)',
  },
  {
    term: 'dim',
    fr: 'diminution — 2 mailles ensemble',
    en: 'decrease — 2 stitches together',
    craft: 'commun',
    lang: 'fr',
    example: 'Tour 8 : *4 ms, 1 dim* 6 fois (30)',
  },
  {
    term: 'dec',
    fr: 'diminution — 2 mailles ensemble',
    en: 'decrease — 2 stitches together',
    craft: 'commun',
    lang: 'en',
    example: 'Rnd 9: *sc in next 3 sts, dec* 6 times (24)',
  },
  {
    term: 'sts',
    fr: 'mailles',
    en: 'stitches',
    craft: 'commun',
    lang: 'en',
    example: 'Row 1: sc in next 10 sts, turn (10 sts)',
  },
  {
    term: 'st',
    fr: 'maille',
    en: 'stitch',
    craft: 'commun',
    lang: 'en',
    example: 'Rnd 5: sc in each st around (24)',
  },
  {
    term: 'magic ring',
    fr: 'cercle magique',
    en: 'magic ring',
    craft: 'crochet',
    lang: 'en',
    example: 'Rnd 1: 6 sc in a magic ring (6)',
  },
  {
    term: 'cercle magique',
    fr: 'cercle magique',
    en: 'magic ring',
    craft: 'crochet',
    lang: 'fr',
    example: 'Tour 1 : 6 ms dans un cercle magique (6)',
  },
  {
    term: 'mr',
    fr: 'cercle magique',
    en: 'magic ring',
    craft: 'crochet',
    lang: 'en',
    example: 'Rnd 1: 6 sc in mr (6)',
  },
  {
    term: 'blo',
    fr: 'dans le brin arrière uniquement',
    en: 'back loop only',
    craft: 'crochet',
    lang: 'en',
    example: 'Rnd 7: sc in blo of each st around (24)',
  },
  {
    term: 'flo',
    fr: 'dans le brin avant uniquement',
    en: 'front loop only',
    craft: 'crochet',
    lang: 'en',
    example: 'Rnd 8: sc in flo of each st around (24)',
  },
  {
    term: 'yo',
    fr: 'jeté',
    en: 'yarn over',
    craft: 'commun',
    lang: 'en',
    example:
      'Hdc: yo, insert hook in next st, yo and pull up a loop, yo and pull through all 3 loops.',
  },
  {
    term: 'tog',
    fr: 'ensemble',
    en: 'together',
    craft: 'commun',
    lang: 'en',
    example: 'Rnd 10: *sc in next 2 sts, sc2tog* 6 times (18)',
  },
  {
    term: 'rep',
    fr: 'répéter',
    en: 'repeat',
    craft: 'commun',
    lang: 'en',
    example: 'Row 3: ch 1, *sc in next st, ch 1, sk next st; rep from * to end, turn.',
  },
  {
    term: 'sk',
    fr: 'sauter une maille',
    en: 'skip a stitch',
    craft: 'commun',
    lang: 'en',
    example: 'Row 2: ch 3, sk first st, dc in each st across, turn.',
  },
  {
    term: 'fo',
    fr: 'arrêter le fil',
    en: 'fasten off',
    craft: 'commun',
    lang: 'en',
    example: 'Rnd 12: sc in each st around. FO, leaving a long tail for sewing.',
  },
  {
    term: 'rs',
    fr: 'endroit du travail',
    en: 'right side',
    craft: 'commun',
    lang: 'en',
    example: 'Row 1 (RS): sc in each st across, turn.',
  },
  {
    term: 'ws',
    fr: 'envers du travail',
    en: 'wrong side',
    craft: 'commun',
    lang: 'en',
    example: 'Row 2 (WS): ch 1, sc in each st across, turn.',
  },
  {
    term: 'k2tog',
    fr: '2 mailles endroit ensemble',
    en: 'knit 2 together',
    craft: 'tricot',
    lang: 'en',
    example: 'Row 5: k2, *k2tog, k3; rep from * to end.',
  },
  {
    term: 'ssk',
    fr: 'glisser, glisser, tricoter',
    en: 'slip slip knit',
    craft: 'tricot',
    lang: 'en',
    example: 'Row 7: k1, ssk, knit to last 3 sts, k2tog, k1.',
  },
  {
    term: 'm1',
    fr: 'une maille augmentée',
    en: 'make one stitch',
    craft: 'tricot',
    lang: 'en',
    example: 'Row 3: k1, m1, knit to last st, m1, k1.',
  },
  {
    term: 'co',
    fr: 'monter les mailles',
    en: 'cast on',
    craft: 'tricot',
    lang: 'en',
    example: 'CO 40 sts. Work in k1, p1 rib for 6 rows.',
  },
  {
    term: 'bo',
    fr: 'rabattre les mailles',
    en: 'bind off',
    craft: 'tricot',
    lang: 'en',
    example: 'Row 30: BO all sts loosely, leaving a long tail.',
  },
];

export const GLOSSARY: readonly GlossaryEntry[] = RAW_GLOSSARY.map((entry) => ({
  ...entry,
  slug: slugify(entry.term),
}));

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

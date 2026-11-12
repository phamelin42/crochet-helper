import { EMPTY_PATTERN, Pattern, PatternPiece, PatternStep } from './pattern.model';

/**
 * Découpage d'un tutoriel de crochet ou de tricot collé en texte brut.
 *
 * Fonction pure, sans dépendance au DOM : c'est le cœur métier de l'application
 * et la surface de test principale.
 *
 * Le parseur vise trois choses, dans cet ordre :
 *  1. **ne rien inventer** — une page sans rang ne produit aucune étape ;
 *  2. **ne rien perdre** — ce qui n'est pas une étape va dans `materials` ou
 *     `notes`, jamais à la poubelle ;
 *  3. **alléger l'étape** — les conseils rédigés par l'auteur sont séparés des
 *     mailles à réaliser, pour que le lecteur affiche une ou deux lignes.
 */

/**
 * « Rang 1 », « Rangs 3-6 », « Rangs 5 à 8 », « Round 12 », « Rnd 5 », « T. 4 », « Row 2 à 4 »,
 * et « Step 1 » / « Étape 1 », la numérotation que choisit souvent un
 * assistant IA quand on lui demande de mettre un patron en étapes.
 */
const ROW =
  /^(rangs?|tours?|rows?|rounds?|rnds?|rgs?|steps?|[ée]tapes?|r|t)\s*\.?\s*(\d+)(?:(?:\s*[-–—/]\s*|\s+(?:à|a|to|au)\s+)(\d+))?\s*(?:[:.)\]]|\s+[-–—]\s+)?\s*/i;

/**
 * Numérotation nue : « 1. », « 5-17. », « 4-5 - », « 3) ».
 *
 * N'est activée que si le document ne contient **aucun** libellé de rang
 * reconnu (voir `parsePattern`). Sinon une liste de matériel numérotée ou une
 * ligne « 3.5 oz de laine » deviendrait une étape. Choix délibéré : mieux vaut
 * rater un format rare que hacher un patron correct.
 */
const BARE_ROW = /^(\d{1,3})(?!\d)(?:\s*[-–—]\s*(\d{1,3}))?\s*(?:[.):]\s+|\s+[-–—]\s+)/;

/**
 * Vocabulaire d'un en-tête de section matériel, français et anglais : verbe
 * d'invitation (« what you'll need »), nom de la section (« materials »,
 * « supplies », « tools »…) ou un des mots isolés qui l'annoncent seuls sur
 * leur ligne (« yarn », « hook »).
 */
const MAT_WORDS =
  "(?:what\\s+)?you(?:'ll|\\s+will)?\\s+need|materials?(?:\\s+needed)?|supplies(?:\\s+needed)?|notions|tools(?:\\s+and\\s+materials)?|yarn|hooks?|liste\\s+du\\s+mat[ée]riel|mat[ée]riel(?:\\s+(?:n[ée]cessaire|requis))?|fournitures(?:\\s+n[ée]cessaires?)?|il\\s+(?:vous\\s+)?faut|vous\\s+aurez\\s+besoin|ce\\s+dont\\s+vous\\s+(?:aurez|avez)\\s+besoin";

/** En-tête de section matériel, sur sa propre ligne. */
const MAT = new RegExp(`^(?:${MAT_WORDS})\\b\\s*:?\\s*$`, 'i');

/** Même chose, mais suivie de texte sur la même ligne et terminée par « : ». */
const MAT_LOOSE = new RegExp(`^(?:${MAT_WORDS})\\b.*:\\s*$`, 'i');

/**
 * En-tête de matériel avec du contenu sur la même ligne (« Materials: 4 mm
 * hook, 100 g DK yarn ») : le texte après « : » devient le premier élément de
 * la liste, et la section reste ouverte pour les lignes suivantes.
 */
const MAT_INLINE = new RegExp(`^(?:${MAT_WORDS})\\s*:\\s*(\\S.*)$`, 'i');

/** En-tête qui referme la section matériel et ouvre les instructions. */
const INSTR = /^(instructions?|pattern|steps?|[ée]tapes?|r[ée]alisation)\s*:?\s*$/i;

/**
 * En-tête d'une section à conserver mais à ne jamais compter comme des étapes.
 * Le contenu part dans `Pattern.notes`.
 */
const ASIDE =
  /^(notes?|abbreviations?|abr[ée]viations?|gauge|[ée]chantillon|sizes?|tailles?|taille|skill\s+level|pattern\s+details|difficult[ée])\b\s*(?:\([^)]*\))?\s*:?\s*$/i;

/** En-tête qui ouvre spécifiquement une table d'abréviations. */
const ABBREV_HEADER = /^(abbreviations?|abr[ée]viations?)\b/i;

/** Même chose mais avec du contenu sur la même ligne : « Size: 6-12 months ». */
const ASIDE_INLINE =
  /^(sizes?|tailles?|taille|gauge|[ée]chantillon|skill\s+level|yarn\s+(?:brand|name|weight)|hook\s+size|niveau)\s*:\s*\S/i;

/** Consigne de répétition autonome, rattachée à l'étape précédente. */
const REPEAT = /^(repeat|rep\.?|r[ée]p[èe]te|r[ée]p[ée]t\w*|work)\b/i;

/** Indication endroit/envers en tête de corps : « (RS): », « (envers) : ». */
const SIDE = /^\(\s*(rs|ws|endroit|envers)\s*\)\s*:?\s*/i;

const SIDE_VALUE: Record<string, 'rs' | 'ws'> = { rs: 'rs', endroit: 'rs', ws: 'ws', envers: 'ws' };

/** Détache un suffixe endroit/envers du début d'un texte de rang. */
function extractSide(text: string): { side?: 'rs' | 'ws'; rest: string } {
  const match = SIDE.exec(text);
  if (!match) return { rest: text };
  return { side: SIDE_VALUE[match[1].toLowerCase()], rest: text.slice(match[0].length) };
}

const BULLET = /^[-–—•*·§o]\s+/;

/**
 * Décorations à ignorer avant de reconnaître un en-tête de matériel : gras
 * Markdown (`**Materials**`), titre (`# Materials`, `## Materials`) et puce
 * (`• Materials:`).
 */
function stripHeaderDecoration(line: string): string {
  return line
    .replace(/^\*\*(.+)\*\*$/, '$1')
    .replace(/^#{1,6}\s+/, '')
    .replace(BULLET, '')
    .trim();
}

/**
 * Mise en forme Markdown d'un texte passé par un assistant IA : titres
 * (`### Back`), gras autour du libellé (`**Row 1:**`, `**Row 1**:`), puce ou
 * numéro de liste devant un rang (`- Row 1:`, `1. **Row 1**:`). Sans ce
 * nettoyage, le libellé de rang n'est plus en tête de ligne et le patron
 * entier donne zéro étape.
 *
 * Prudente par construction : le gras n'est retiré que s'il entoure un
 * libellé de rang, un en-tête (`**Back:**`) ou la ligne entière, et la puce
 * ou le numéro de liste seulement s'ils précèdent un rang. Une ligne qui
 * commence par `**` comme marque de répétition (`**sc, inc** 6 fois`) reste
 * intacte, comme une liste de matériel à puces.
 */
const MD_HEADING = /^#{1,6}\s+/;
const MD_LIST = /^(?:[-•·]|\d{1,3}[.)])\s+/;
const MD_BOLD_LEAD = /^(\*\*|__)(.{1,60}?)\1/;

function unbold(line: string): string {
  const match = MD_BOLD_LEAD.exec(line);
  if (!match) return line;
  const inner = match[2].trim();
  const rest = line.slice(match[0].length);
  const labelled = ROW.test(inner) || inner.endsWith(':') || /^\s*:/.test(rest) || !rest.trim();
  return labelled ? `${inner}${rest}` : line;
}

function stripMarkdown(line: string): string {
  const text = unbold(line.replace(MD_HEADING, ''));
  const listless = text.replace(MD_LIST, '');
  if (listless !== text) {
    const row = unbold(listless);
    if (ROW.test(row)) return row;
  }
  return text;
}

/** Cases à cocher des patrons imprimables : « [_] », « [ ] », « [x][x] ». */
const CHECKBOX = /^(?:\[[\s_xX]?\]\s*)+/;

/**
 * Rebut de mise en page : pieds de page PDF, mentions légales, navigation de
 * site. Retiré avant toute analyse, ligne par ligne.
 */
const CHROME =
  /^(?:©|copyright\b|skip to content|privacy policy|terms\b|search\.{0,3}$|similar posts|view (?:the full pattern|this pattern)|posted\s*:|partner login|web stories|all rights reserved)/i;

/** Entrée de table d'abréviations : « sc - single crochet », « dc = double ». */
const ABBREV = /^\S+(?:\s\S+)?\s*[-=]\s+\S/;

/** Note entre crochets, fréquente chez les auteurs qui commentent leur méthode. */
const BRACKET_NOTE = /^\[[^\]]/;

/**
 * Emplacement d'une image, posé par l'import PDF (« [image 3] »). Reconnu avant
 * `BRACKET_NOTE`, qui en ferait une note.
 */
const IMAGE_MARKER = /^\[image\s+(\d{1,3})\]$/i;

/** Mots qui désignent une illustration, en anglais et en français. */
const IMAGE_WORD = String.raw`(?:images?|photos?|pictures?|pics?\.?|figures?|fig\.?)`;

/** Référence numérotée : « see image 3 », « (fig. 2) », « voir photo n° 4 », « photos 3 et 4 ». */
const IMAGE_REF = new RegExp(
  String.raw`\b${IMAGE_WORD}\s*(?:n[°º]\s*|#\s*)?(\d{1,3}(?:\s*(?:,|&|and|et)\s*\d{1,3})*)\b`,
  'gi',
);

/** Référence sans numéro : « see photo », « comme sur l'image », « as shown in the picture ». */
const IMAGE_REF_BARE = new RegExp(
  String.raw`\b(?:see|voir|as\s+(?:shown\s+)?in|shown\s+in|like\s+in|comme\s+(?:sur|dans))\s+(?:the\s+|la\s+|le\s+|l['’]\s*)?${IMAGE_WORD}(?!\s*(?:n[°º]\s*|#\s*)?\d)`,
  'i',
);

/** Numéros d'image cités dans un texte, dans l'ordre, sans doublon. */
function imageRefs(text: string): number[] {
  const numbers = [...text.matchAll(IMAGE_REF)].flatMap((match) =>
    (match[1].match(/\d+/g) ?? []).map(Number),
  );
  return [...new Set(numbers)];
}

/** Fin de phrase ou de groupe : une ligne qui s'y termine n'appelle pas de suite. */
const LINE_COMPLETE = /[.!?:;)\]»"']\s*$/;

/** Mot qui ne peut pas terminer une consigne : la suite est sur la ligne suivante. */
const DANGLING =
  /\b(?:and|or|in|on|of|to|the|a|an|with|from|for|into|until|your|each|next|et|ou|dans|de|du|des|la|le|les|un|une|avec|pour|sur|jusqu'|chaque|prochain)\s*$/i;

/**
 * Recolle les retours à la ligne durs.
 *
 * Les patrons viennent presque toujours d'un PDF ou d'une colonne étroite : une
 * même consigne y est coupée en trois. Sans recollage, « Yarn in Orange and » et
 * « Green - (Shown in » deviennent deux fournitures, et un conseil se retrouve
 * tranché en plein milieu.
 *
 * Trois signaux seulement, tous conservateurs — un recollage abusif souderait
 * deux pièces distinctes, ce qui est bien pire qu'une ligne coupée :
 *  1. une parenthèse ouverte et pas encore refermée ;
 *  2. une ligne qui se termine sur un mot de liaison (« and », « in », « de ») ;
 *  3. une ligne suivante qui commence en minuscule, donc en plein milieu d'une
 *     phrase.
 *
 * Conséquence assumée : un titre coupé en deux lignes capitalisées
 * (« Pumpkin » / « Harvest Hat ») n'est pas recollé, parce que rien ne le
 * distingue d'un nom de pièce suivant un titre.
 */
function unwrap(lines: readonly string[], hasKeywordRow: boolean): string[] {
  const out: string[] = [];

  const opensStructure = (line: string): boolean => {
    const header = stripHeaderDecoration(line);
    return (
      ROW.test(line) ||
      (!hasKeywordRow && BARE_ROW.test(line)) ||
      MAT.test(header) ||
      MAT_LOOSE.test(header) ||
      MAT_INLINE.test(header) ||
      INSTR.test(line) ||
      ASIDE.test(line) ||
      ASIDE_INLINE.test(line) ||
      ABBREV.test(line) ||
      BRACKET_NOTE.test(line) ||
      BULLET.test(line)
    );
  };

  const unclosedParen = (line: string): boolean =>
    (line.match(/\(/g) ?? []).length > (line.match(/\)/g) ?? []).length;

  for (const line of lines) {
    if (IMAGE_MARKER.test(line)) {
      out.push(line);
      continue;
    }
    // On recolle par-dessus les marqueurs d'image : une photo posée au milieu
    // d'une phrase ne la coupe pas, le marqueur passe simplement après elle.
    let at = out.length - 1;
    while (at >= 0 && IMAGE_MARKER.test(out[at])) at--;
    const previous = out[at];
    const continues =
      previous &&
      !opensStructure(line) &&
      (unclosedParen(previous) ||
        (!LINE_COMPLETE.test(previous) &&
          (DANGLING.test(previous) ||
            // La minuscule ne vaut que sous une ligne assez longue pour avoir
            // été coupée : « 4 mm hook » puis « green yarn » sont deux
            // fournitures, pas une phrase tranchée.
            (previous.length >= 30 && /^[a-zà-ÿ]/.test(line)))));

    if (continues) {
      out[at] = `${previous} ${line}`;
      continue;
    }
    out.push(line);
  }
  return out;
}

/** Une ligne courte, capitalisée et sans ponctuation finale : un nom de pièce. */
function isHeading(line: string): boolean {
  if (ROW.test(line) || MAT.test(line) || INSTR.test(line)) return false;
  // « Tip: use a marker » ou « FO and weave in ends » sont courts et sans point,
  // mais ce sont des consignes, pas des noms de pièce.
  if (ANNOUNCE.test(line) || FINISH_LEAD.test(line)) return false;
  // « Squares (make 13): » est un nom de pièce : la parenthèse qualifie le nom,
  // elle ne doit pas le disqualifier parce qu'elle contient un chiffre.
  const bare = line
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/:$/, '')
    .trim();
  if (!bare) return false;
  const words = bare.split(/\s+/);
  if (words.length > 6) return false;
  if (/\d/.test(bare) && words.length > 2) return false;
  if (/[.,;!?]$/.test(bare)) return false;
  return /^[A-ZÀ-ÝŒ0-9(«"]/.test(bare) || bare === bare.toLocaleUpperCase();
}

/** Nombres de deux à douze écrits en toutes lettres, français et anglais. */
const NUMBER_WORDS: Record<string, number> = {
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  onze: 11,
  douze: 12,
};

/**
 * « 6 times », « four more times », « quatre fois » : un compte de répétition
 * en chiffres ou en toutes lettres, avec un éventuel mot de liaison
 * (« more », « de plus ») entre le nombre et « times »/« fois ».
 */
const REPEAT_COUNT = new RegExp(
  `\\b(\\d{1,2}|${Object.keys(NUMBER_WORDS).join('|')})\\b(?:\\s+(?:more|de\\s+plus))?\\s+(?:times?|fois)\\b`,
  'i',
);

/**
 * Le « x N » le moins imbriqué du corps : dans `[[sc, inc] x 2, dec] x 3`, la
 * lectrice répète 3 fois l'ensemble, pas 2. À profondeur égale, le premier gagne.
 */
function outermostMultiplier(body: string): number {
  let best: { depth: number; count: number } | null = null;
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (char === '[' || char === '(') depth++;
    else if (char === ']' || char === ')') depth = Math.max(0, depth - 1);
    else if (char === 'x' || char === '×') {
      const match = /^[x×]\s*(\d{1,2})\b/i.exec(body.slice(i));
      if (match && (!best || depth < best.depth)) {
        best = { depth, count: Number.parseInt(match[1], 10) };
      }
    }
  }
  return best?.count ?? 0;
}

/**
 * Nombre de répétitions d'une étape : d'abord l'étendue du libellé
 * (« Rangs 3-6 » → 4), sinon un « x6 », un « 6 times » ou un « quatre fois »
 * dans le corps.
 */
function repeatTarget(range: number, body: string): number {
  if (range) return range;
  const direct = outermostMultiplier(body);
  if (direct) return direct;
  const worded = REPEAT_COUNT.exec(body);
  if (!worded) return 0;
  const raw = worded[1].toLowerCase();
  return NUMBER_WORDS[raw] ?? Number.parseInt(raw, 10);
}

/** Jetons qui trahissent une consigne de maille plutôt qu'une phrase de conseil. */
const STITCH_TOKEN =
  /\d|\b(?:sc|dc|hdc|tr|dtr|sl\s?st|slst|ch|inc|dec|blo|flo|fo|fpdc|bpdc|rsc|crab\s?st|sts|mr|ms|mc|br|dbr|aug|dim|mailles?|chain|stitch(?:es)?|magic\s+ring|finish\s+off)\b/i;

/**
 * Sépare les mailles à réaliser du conseil rédigé par l'auteur.
 *
 * Méthode : on découpe en phrases et on remonte depuis la fin tant qu'une
 * phrase ne contient **aucun** jeton de maille. Ce bloc final est du commentaire
 * — « veille à retourner l'ouvrage sur l'endroit » — et sort du corps.
 *
 * Rien n'est généré : sans phrase de ce type, il n'y a pas de conseil.
 */
function splitTip(body: string): { body: string; tip?: string } {
  const sentences = body.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g);
  if (!sentences || sentences.length < 2) return { body };

  // Une phrase qui s'annonce conseil (« Astuce : … ») l'est jusqu'à la fin, même
  // pleine de chiffres : le test des jetons de maille ne s'applique pas.
  const announced = sentences.findIndex((sentence, at) => at > 0 && ANNOUNCE.test(sentence.trim()));
  if (announced > 0) {
    return {
      body: sentences.slice(0, announced).join(' ').replace(/\s+/g, ' ').trim(),
      tip: sentences.slice(announced).join(' ').replace(/\s+/g, ' ').trim(),
    };
  }

  let cut = sentences.length;
  while (cut > 1 && !STITCH_TOKEN.test(sentences[cut - 1])) cut--;
  if (cut === sentences.length) return { body };

  const tip = sentences.slice(cut).join(' ').replace(/\s+/g, ' ').trim();
  // Un fragment trop court est du bruit de ponctuation, pas un conseil.
  if (tip.length < 25) return { body };

  return { body: sentences.slice(0, cut).join(' ').replace(/\s+/g, ' ').trim(), tip };
}

/** Fin de mot pour du texte français : `\b` ne voit pas « é ». */
const WORD_END = String.raw`(?![\p{L}\p{N}])`;

/**
 * Mots qui annoncent un commentaire de l'auteur (« Astuce : », « Tip: »,
 * « N’oubliez pas »…). Une ligne qui commence ainsi est un conseil même
 * quand elle contient des chiffres (« tous les 10 rangs »).
 */
const ANNOUNCE_WORDS = String.raw`beware|notes?|n\.?\s?b\.?|tips?|hints?|remember|make\s+sure|don['’]t\s+forget|attention|astuces?|conseils?|remarques?|pensez|n['’]oubliez|important|warning|careful|veillez|prenez\s+soin|mind`;

const ANNOUNCE = new RegExp(`^(?:${ANNOUNCE_WORDS})${WORD_END}`, 'iu');

/** Annonces explicites, plus les amorces de phrase de conseil (« Si vous… », « You can… »). */
const ADVICE_LEAD = new RegExp(
  `^(?:${ANNOUNCE_WORDS}|if\\s+you|you\\s+can|si\\s+vous|vous\\s+pouvez)${WORD_END}`,
  'iu',
);

/**
 * Verbe de finition ou d'assemblage qui ouvre une consigne : « Fasten off. »,
 * « Sew the ears… », « Arrêter le fil. Coudre… », « Rabattre toutes les
 * mailles ». Après le dernier rang d'une pièce, c'est une chose à faire, pas
 * un commentaire.
 */
const FINISH_LEAD = new RegExp(
  String.raw`^(?:(?:now|then|next|finally|ensuite|puis|maintenant|enfin)[\s,]+)?(?:fasten\s+off|finish(?:ing)?\s+off|cast\s+off|bind\s+off|fo|cut\s+(?:the\s+)?(?:yarn|thread)|sew|stuff|weave|embroider|attach|assemble|arr[êe]te[rz]?|termine[rz]?|coud(?:re|s|ez)|rembourre[rz]?|assemble[rz]?|rentre[rz]?|brode[rz]?|fixe[rz]?|rabatt(?:re|ez|s)|coupe[rz]?|couper|ferme[rz]?)${WORD_END}`,
  'iu',
);

/** Abréviations et chiffres qui trahissent une consigne de maille. */
const STITCH_IN_LINE =
  /\d|\b(?:sc|dc|hdc|tr|dtr|sl\s?st|slst|ch|inc|dec|blo|flo|fo|fpdc|bpdc|rsc|mr|ms|mc|br|aug|dim)\b/i;

/**
 * Rebut de mise en page : ces lignes sont retirées exprès, la lectrice n'a pas
 * à les retrouver. Exposé pour que le test « rien ne se perd » les écarte
 * avec la même règle que le parseur.
 */
export function isChromeLine(line: string): boolean {
  return CHROME.test(line.trim());
}

/**
 * En-tête de section (Matériel, Instructions, Notes, Abréviations…) : il ouvre
 * une section et n'est pas un contenu à restituer tel quel.
 */
export function isSectionHeader(line: string): boolean {
  const text = stripHeaderDecoration(stripMarkdown(line.trim()));
  return MAT.test(text) || MAT_LOOSE.test(text) || INSTR.test(text) || ASIDE.test(text);
}

interface MutablePiece {
  name: string;
  steps: PatternStep[];
}

/** Emplacement d'une image dans le texte, avec ce qui l'entourait à ce moment. */
interface ImageMarker {
  readonly n: number;
  /** Nombre d'étapes créées avant le marqueur. */
  readonly stepsBefore: number;
  /** Pièce en cours au moment du marqueur. */
  readonly piece: MutablePiece | null;
  /** Le marqueur suit un titre de pièce qui n'a encore aucune étape. */
  readonly underTitle: boolean;
}

export function parsePattern(raw: string): Pattern {
  const source = String(raw ?? '');
  if (!source.trim()) return EMPTY_PATTERN;

  const cleaned = source
    .replace(/\r/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .split('\n')
    .map((line) => stripMarkdown(line.trim().replace(CHECKBOX, '').trim()).trim())
    // Un filet (« - », « *** ») n'a rien à restituer.
    .filter((line) => /[\p{L}\p{N}]/u.test(line) && !CHROME.test(line));

  // Pré-passe : la numérotation nue ne s'active qu'à défaut de vrai libellé.
  const hasKeywordRow = cleaned.some((line) => ROW.test(line));
  const lines = unwrap(cleaned, hasKeywordRow);

  const pieces: MutablePiece[] = [];
  const materials: string[] = [];
  const notes: string[] = [];
  let title = '';
  let piece: MutablePiece | null = null;
  let pending: string[] = [];
  let inMaterials = false;
  /** Dernier numéro nu lu dans la liste de fournitures ; 0 hors liste. */
  let lastMaterialNumber = 0;
  let inAside = false;
  let asideIsAbbrevTable = false;
  let seenStep = false;
  /** Étapes dans leur ordre de création, toutes pièces confondues. */
  const created: { piece: MutablePiece; index: number }[] = [];
  /** Marqueurs d'image lus, avec le nombre d'étapes créées avant chacun. */
  const markers: ImageMarker[] = [];
  /** La pièce courante n'a aucun rang : son texte est fait d'étapes sans libellé. */
  let rowless = false;
  /** La dernière étape est une finition : ce qui suit n'est plus la suite d'un rang. */
  let inTail = false;
  /** Amorce « in white: » d'une pièce sans rang, collée à la ligne suivante. */
  let lead = '';

  // TypeScript ne voit pas les affectations de `piece` faites dans les fonctions
  // ci-dessous : il croit la pièce toujours nulle dans la boucle.
  const current = (): MutablePiece | null => piece;
  const lastStep = (): PatternStep | null =>
    piece && piece.steps.length ? piece.steps[piece.steps.length - 1] : null;

  /** Un rang (numéroté) suit-il avant le prochain en-tête ? */
  const rowAhead = (from: number): boolean => {
    for (let at = from; at < lines.length; at++) {
      const candidate = lines[at];
      if (IMAGE_MARKER.test(candidate)) continue;
      if (ROW.test(candidate) || (!hasKeywordRow && BARE_ROW.test(candidate))) return true;
      if (isHeading(candidate) || isSectionHeader(candidate)) return false;
    }
    return false;
  };

  /** Ajoute une étape sans libellé de rang : finition, assemblage, pièce en phrases. */
  const addFree = (text: string): void => {
    const target = piece ?? newPiece('');
    // Pas de compteur de répétitions : « 50 fois » d'une frange n'est pas un rang.
    target.steps.push({ label: '', body: text, notes: pending.slice(), reps: 0 });
    created.push({ piece: target, index: target.steps.length - 1 });
    pending = [];
    inTail = true;
  };

  const appendTip = (text: string): void => {
    const previous = lastStep();
    if (!previous) return;
    piece!.steps[piece!.steps.length - 1] = {
      ...previous,
      tip: previous.tip ? `${previous.tip} ${text}` : text,
    };
  };

  /** Ce qui n'a pas trouvé de rang à qui se rattacher : aucune ligne ne se perd. */
  const closePiece = (): void => {
    if (lead) {
      addFree(lead);
      lead = '';
    }
    if (pending.length && piece && !piece.steps.length) {
      for (const text of pending.splice(0)) addFree(text);
    }
  };

  /**
   * `from` : indice de la ligne qui suit l'en-tête, pour savoir si la pièce a des
   * rangs. Absent pour la pièce implicite, créée par son premier rang.
   */
  const newPiece = (name: string, from?: number): MutablePiece => {
    closePiece();
    // Du texte lu avant toute pièce est une introduction, pas la note d'un rang.
    if (from !== undefined && !piece && pending.length) notes.push(...pending.splice(0));
    piece = { name, steps: [] };
    pieces.push(piece);
    rowless = from !== undefined && !rowAhead(from);
    inTail = false;
    return piece;
  };

  const addStep = (label: string, rawBody: string, range: number, side?: 'rs' | 'ws'): void => {
    const target = piece ?? newPiece('');
    const { body, tip } = splitTip(rawBody);
    target.steps.push({
      label,
      body,
      ...(tip ? { tip } : {}),
      ...(side ? { side } : {}),
      notes: pending.slice(),
      reps: repeatTarget(range, rawBody),
    });
    created.push({ piece: target, index: target.steps.length - 1 });
    pending = [];
    seenStep = true;
    inTail = false;
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const marker = IMAGE_MARKER.exec(line);
    if (marker) {
      const n = Number(marker[1]);
      if (!markers.some((m) => m.n === n)) {
        markers.push({
          n,
          stepsBefore: created.length,
          piece: current(),
          // Une photo posée sous un titre de pièce illustre ce qui suit ce titre.
          underTitle: (current()?.steps.length ?? 1) === 0,
        });
      }
      continue;
    }
    let after = index + 1;
    while (after < lines.length && IMAGE_MARKER.test(lines[after])) after++;
    const next = lines[after] ?? '';
    const nextIsRow = ROW.test(next) || (!hasKeywordRow && BARE_ROW.test(next));

    const materialHeader = stripHeaderDecoration(line);
    if (MAT.test(materialHeader) || MAT_LOOSE.test(materialHeader)) {
      inMaterials = true;
      lastMaterialNumber = 0;
      inAside = false;
      continue;
    }
    const inlineMaterial = MAT_INLINE.exec(materialHeader);
    if (inlineMaterial) {
      inMaterials = true;
      lastMaterialNumber = 0;
      inAside = false;
      materials.push(inlineMaterial[1].trim());
      continue;
    }
    if (INSTR.test(line)) {
      inMaterials = false;
      inAside = false;
      continue;
    }
    if (ASIDE.test(line)) {
      inAside = true;
      asideIsAbbrevTable = ABBREV_HEADER.test(line);
      inMaterials = false;
      continue;
    }
    if (ASIDE_INLINE.test(line)) {
      notes.push(line);
      continue;
    }

    const isRow = ROW.test(line) || (!hasKeywordRow && BARE_ROW.test(line));

    if (inAside) {
      // Une table d'abréviations se reconnaît à sa forme « terme - définition ».
      // Dès qu'une ligne n'en a plus l'allure, la section est finie : sinon le
      // titre du patron, qui suit souvent la table, y serait englouti. Les
      // autres sections à part (Notes, Gauge, Sizes…) sont des paragraphes
      // libres : elles se poursuivent tant qu'aucun rang ni titre n'apparaît,
      // quelle que soit la longueur de la ligne.
      const continuesAside = asideIsAbbrevTable
        ? !isRow && (ABBREV.test(line) || (!isHeading(line) && line.length < 40))
        : !isRow && !isHeading(line);
      if (continuesAside) {
        notes.push(line.replace(BULLET, ''));
        continue;
      }
      inAside = false;
    }

    if (inMaterials) {
      const bare = line
        .replace(/\s*\([^)]*\)\s*/g, ' ')
        .replace(/:$/, '')
        .trim();
      // Un nom de pièce clôt la liste de fournitures. Deux formes le trahissent :
      // un en-tête classique sans chiffre, ou une ligne courte terminée par
      // « : » qui n'est pas une amorce de sous-liste (« Small amount of: »).
      const isPieceHeading =
        materials.length > 0 &&
        ((isHeading(line) && !/\d/.test(line) && line.split(/\s+/).length <= 3) ||
          (/:$/.test(line) && !DANGLING.test(bare) && bare.split(/\s+/).length <= 4));
      // Une liste de fournitures est souvent numérotée (« 1. Cotton yarn »).
      // Une ligne numérotée y reste une fourniture, sauf si la numérotation
      // repart en arrière (« 1. » après « 2. ») : c'est alors la première
      // étape des instructions qui commence.
      const bareMaterial = ROW.test(line) ? null : BARE_ROW.exec(line);
      const bareNumber = bareMaterial ? Number.parseInt(bareMaterial[1], 10) : 0;
      const restarts = bareMaterial !== null && bareNumber <= lastMaterialNumber;
      const endsMaterials = bareMaterial ? restarts : isRow;
      if (!endsMaterials && !isPieceHeading) {
        if (bareMaterial) lastMaterialNumber = bareNumber;
        materials.push(line.replace(BULLET, ''));
        continue;
      }
      inMaterials = false;
    }

    if (BRACKET_NOTE.test(line)) {
      const text = line.replace(/^\[|\]$/g, '').trim();
      // La remarque entre crochets commente l'étape qu'elle suit.
      if (lastStep()) appendTip(text);
      else if (rowless) addFree(text);
      else if (piece) pending.push(text);
      else notes.push(text);
      continue;
    }

    const row = ROW.exec(line);
    if (row) {
      const from = Number.parseInt(row[2], 10);
      const to = row[3] ? Number.parseInt(row[3], 10) : 0;
      const word = row[1].replace(/s$/i, '');
      const label = (to ? `${word} ${from}–${to}` : `${word} ${from}`).replace(/^./, (c) =>
        c.toUpperCase(),
      );
      const { side, rest } = extractSide(line.slice(row[0].length));
      addStep(label, rest.trim() || line, to ? Math.max(0, to - from + 1) : 0, side);
      continue;
    }

    const bare = !hasKeywordRow ? BARE_ROW.exec(line) : null;
    if (bare) {
      const from = Number.parseInt(bare[1], 10);
      const to = bare[2] ? Number.parseInt(bare[2], 10) : 0;
      const label = to ? `${from}–${to}` : String(from);
      const { side, rest } = extractSide(line.slice(bare[0].length));
      addStep(label, rest.trim() || line, to ? Math.max(0, to - from + 1) : 0, side);
      continue;
    }

    const couldTitle = !seenStep && !pieces.length && !title && !materials.length;

    if (isHeading(line)) {
      const name = line.replace(/:$/, '');
      // Le tout premier en-tête est le titre, même si un rang le suit
      // immédiatement : un patron d'une seule pièce n'a pas de nom de pièce.
      if (couldTitle) {
        title = name;
        continue;
      }
      // Un titre coupé sur deux lignes (« Pumpkin » / « Harvest Hat ») ne se
      // prolonge que s'il est encore court et que rien d'autre n'a été lu. Un
      // rang juste après signe un nom de pièce, pas une suite de titre.
      if (
        title &&
        title.split(/\s+/).length <= 4 &&
        !seenStep &&
        !pieces.length &&
        !materials.length &&
        !nextIsRow
      ) {
        title = `${title} ${name}`;
        continue;
      }
      newPiece(name, index + 1);
      continue;
    }

    // Beaucoup de patrons annoncent leur titre en une ligne trop longue pour
    // `isHeading` (« Lipbalm Mushroom Bag/Keychain - Pattern by … »). Tant que
    // rien n'a encore été lu, une telle ligne est le titre, pas une consigne.
    if (couldTitle && !REPEAT.test(line) && line.split(/\s+/).length <= 12) {
      title = line.replace(/:$/, '');
      continue;
    }

    if (REPEAT.test(line) && lastStep()) {
      addStep('', line, 0);
      continue;
    }

    const text = line.replace(BULLET, '');
    const previous = lastStep();
    const announced = ADVICE_LEAD.test(text);

    if (rowless) {
      // Pièce décrite en phrases : chaque paragraphe est une étape à faire.
      if (previous && announced) appendTip(text);
      else if (/:$/.test(text) && !announced) lead = lead ? `${lead} ${text}` : text;
      else {
        addFree(lead ? `${lead} ${text}` : text);
        lead = '';
      }
      continue;
    }
    if (!previous) {
      pending.push(text);
      continue;
    }
    if (announced) {
      appendTip(text);
    } else if (rowAhead(index + 1)) {
      // Un rang suit : la ligne est la suite d'un rang coupé en colonne (des
      // mailles), sinon le commentaire de l'auteur.
      if (STITCH_IN_LINE.test(text)) {
        piece!.steps[piece!.steps.length - 1] = { ...previous, body: `${previous.body} ${text}` };
      } else appendTip(text);
    } else if (inTail || FINISH_LEAD.test(text) || !STITCH_IN_LINE.test(text)) {
      // Plus aucun rang dans la pièce : finitions et assemblage sont à faire.
      addFree(text);
    } else {
      piece!.steps[piece!.steps.length - 1] = { ...previous, body: `${previous.body} ${text}` };
    }
  }

  closePiece();

  const patternImages = attachImages(created, markers);

  const kept: PatternPiece[] = pieces.filter((p) => p.steps.length);
  const total = kept.reduce((n, p) => n + p.steps.length, 0);

  // Aucun rang : ce n'est pas un patron. Une page de blog ne doit pas
  // ressortir avec un titre pris dans son menu de navigation, ni un texte sans
  // rang devenir une suite d'étapes.
  if (!total || !seenStep) return EMPTY_PATTERN;

  return {
    title,
    materials,
    notes,
    pieces: kept,
    total,
    ...(patternImages.length ? { images: patternImages } : {}),
  };
}

/**
 * Rattache chaque image à une étape : d'abord par la référence explicite du
 * texte (« see image 3 »), sinon par sa position — l'étape lue juste avant son
 * marqueur. Une référence sans numéro (« see photo ») désigne l'image dont le
 * marqueur suit l'étape. Un numéro sans marqueur est ignoré : un lien `#p=`
 * transporte le texte sans les images, et un patron collé cite parfois des
 * photos qui n'ont jamais été importées.
 *
 * Renvoie les images rattachées à aucune étape, qui vont au patron.
 */
function attachImages(
  created: readonly { piece: MutablePiece; index: number }[],
  markers: readonly ImageMarker[],
): number[] {
  if (!markers.length) return [];
  const known = new Set(markers.map((m) => m.n));
  const cited = new Map<number, Set<number>>();
  const cite = (n: number, ordinal: number): void => {
    cited.set(n, (cited.get(n) ?? new Set()).add(ordinal));
  };

  created.forEach(({ piece, index }, ordinal) => {
    const step = piece.steps[index];
    const text = step.tip ? `${step.body} ${step.tip}` : step.body;
    const numbers = imageRefs(text).filter((n) => known.has(n));
    if (numbers.length) {
      numbers.forEach((n) => cite(n, ordinal));
    } else if (IMAGE_REF_BARE.test(text)) {
      const following = markers.find((m) => m.stepsBefore > ordinal);
      if (following) cite(following.n, ordinal);
    }
  });

  const byStep = new Map<number, number[]>();
  const orphans: number[] = [];
  for (const marker of markers) {
    const { n, stepsBefore } = marker;
    const next = created[stepsBefore];
    // La photo qui suit un titre de pièce, ou qui sépare deux pièces, illustre le
    // premier rang de la pièce qui commence, pas la fin de la précédente. Avant
    // toute étape et sans titre, c'est une photo du patron (couverture).
    const startsPiece =
      next !== undefined &&
      next.index === 0 &&
      (marker.underTitle || (stepsBefore > 0 && next.piece !== marker.piece));
    const following = startsPiece ? stepsBefore : stepsBefore > 0 ? stepsBefore - 1 : null;
    const owners = cited.get(n) ?? (following === null ? null : new Set([following]));
    if (!owners) {
      orphans.push(n);
      continue;
    }
    for (const ordinal of owners) byStep.set(ordinal, [...(byStep.get(ordinal) ?? []), n]);
  }

  for (const [ordinal, images] of byStep) {
    const { piece, index } = created[ordinal];
    piece.steps[index] = { ...piece.steps[index], images: images.sort((a, b) => a - b) };
  }
  return orphans;
}

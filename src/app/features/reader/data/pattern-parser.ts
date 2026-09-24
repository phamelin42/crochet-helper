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

/** « Rang 1 », « Rangs 3-6 », « Round 12 », « Rnd 5 », « T. 4 », « Row 2 à 4 ». */
const ROW =
  /^(rangs?|tours?|rows?|rounds?|rnds?|rgs?|r|t)\s*\.?\s*(\d+)\s*(?:(?:[-–—/]|\s+(?:à|a|to|au)\s+)\s*(\d+))?\s*(?:[:.)\]]|\s+[-–—]\s+)?\s*/i;

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
    const previous = out[out.length - 1];
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
      out[out.length - 1] = `${previous} ${line}`;
      continue;
    }
    out.push(line);
  }
  return out;
}

/** Une ligne courte, capitalisée et sans ponctuation finale : un nom de pièce. */
function isHeading(line: string): boolean {
  if (ROW.test(line) || MAT.test(line) || INSTR.test(line)) return false;
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
 * Nombre de répétitions d'une étape : d'abord l'étendue du libellé
 * (« Rangs 3-6 » → 4), sinon un « x6 », un « 6 times » ou un « quatre fois »
 * dans le corps.
 */
function repeatTarget(range: number, body: string): number {
  if (range) return range;
  const direct = body.match(/[x×]\s*(\d{1,2})\b/i);
  if (direct) return Number.parseInt(direct[1], 10);
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

  let cut = sentences.length;
  while (cut > 1 && !STITCH_TOKEN.test(sentences[cut - 1])) cut--;
  if (cut === sentences.length) return { body };

  const tip = sentences.slice(cut).join(' ').replace(/\s+/g, ' ').trim();
  // Un fragment trop court est du bruit de ponctuation, pas un conseil.
  if (tip.length < 25) return { body };

  return { body: sentences.slice(0, cut).join(' ').replace(/\s+/g, ' ').trim(), tip };
}

/** « Beware », « Note », « Astuce », « Make sure »… : la ligne s'annonce comme
 *  un commentaire, même si elle contient un chiffre. */
const ADVICE =
  /^(beware|note|tip|hint|remember|make sure|if you|you can|don'?t forget|attention|astuce|conseil|remarque|pensez|n'oubliez|si vous|vous pouvez)\b/i;

/** Abréviations et chiffres qui trahissent une consigne de maille. */
const STITCH_IN_LINE =
  /\d|\b(?:sc|dc|hdc|tr|dtr|sl\s?st|slst|ch|inc|dec|blo|flo|fo|fpdc|bpdc|rsc|mr|ms|mc|br|aug|dim)\b/i;

/**
 * Une ligne libre qui suit une étape la commente-t-elle, ou prolonge-t-elle
 * ses consignes ?
 *
 * Un patron mis en colonne coupe ses rangs : « FPDC in the same » puis « DC,
 * *(dc, FPDC) in the next dc… ». Cette suite-là doit rejoindre le corps. En
 * revanche « Stitch to tan. » ou « You can switch color if you want » sont des
 * commentaires. Le départage se fait sur la présence de mailles.
 */
function isAdvice(line: string): boolean {
  return ADVICE.test(line) || !STITCH_IN_LINE.test(line);
}

interface MutablePiece {
  name: string;
  steps: PatternStep[];
}

export function parsePattern(raw: string): Pattern {
  const source = String(raw ?? '');
  if (!source.trim()) return EMPTY_PATTERN;

  const cleaned = source
    .replace(/\r/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .split('\n')
    .map((line) => line.trim().replace(CHECKBOX, '').trim())
    .filter((line) => line && !CHROME.test(line));

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

  const newPiece = (name: string): MutablePiece => {
    piece = { name, steps: [] };
    pieces.push(piece);
    return piece;
  };
  const lastStep = (): PatternStep | null =>
    piece && piece.steps.length ? piece.steps[piece.steps.length - 1] : null;

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
    pending = [];
    seenStep = true;
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const next = lines[index + 1] ?? '';
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
      notes.push(line.replace(/^\[|\]$/g, '').trim());
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
      newPiece(name);
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

    const previous = lastStep();
    if (previous && pending.length === 0) {
      // Décision produit : une ligne libre qui suit une étape commente cette
      // étape, elle ne s'ajoute pas aux mailles à réaliser. « Stitch to tan. »,
      // « You can switch color if you want » sont des conseils, et les mêler au
      // corps rallongeait l'étape sans rien apporter à l'exécution.
      const addition = line.replace(BULLET, '');
      const merged: PatternStep = isAdvice(addition)
        ? { ...previous, tip: previous.tip ? `${previous.tip} ${addition}` : addition }
        : { ...previous, body: `${previous.body} ${addition}` };
      piece!.steps[piece!.steps.length - 1] = merged;
    } else {
      pending.push(line.replace(BULLET, ''));
    }
  }

  if (pending.length && piece && (piece as MutablePiece).steps.length) {
    const current = piece as MutablePiece;
    const last = current.steps[current.steps.length - 1];
    current.steps[current.steps.length - 1] = { ...last, after: pending.slice() };
  }

  const kept: PatternPiece[] = pieces.filter((p) => p.steps.length);
  const total = kept.reduce((n, p) => n + p.steps.length, 0);

  // Aucune étape : ce n'est pas un patron. Une page de blog ne doit pas
  // ressortir avec un titre pris dans son menu de navigation.
  if (!total) return EMPTY_PATTERN;

  return { title, materials, notes, pieces: kept, total };
}

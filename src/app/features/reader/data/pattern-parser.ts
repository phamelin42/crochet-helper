import { EMPTY_PATTERN, Pattern, PatternPiece, PatternStep } from './pattern.model';

/**
 * Découpage d'un tutoriel de crochet ou de tricot collé en texte brut.
 *
 * Fonction pure, sans dépendance au DOM : c'est le cœur métier de l'application
 * et la surface de test principale. Elle reconnaît les libellés de rang en
 * français et en anglais, isole la section matériel, et rattache les lignes
 * libres à l'étape qu'elles commentent.
 *
 * Port typé du `parser.js` du design ; le comportement doit rester identique.
 */

/** « Rang 1 », « Rangs 3-6 », « Round 12 », « Rnd 5 », « T. 4 », « Row 2 à 4 ». */
const ROW =
  /^(rangs?|tours?|rows?|rounds?|rnds?|rgs?|r|t)\s*\.?\s*(\d+)\s*(?:(?:[-–—/]|\s+(?:à|a|to|au)\s+)\s*(\d+))?\s*(?:[:.)\]]|\s+[-–—]\s+)?\s*/i;

/** En-tête de section matériel, sur sa propre ligne. */
const MAT =
  /^(you(?:'ll)?\s+will\s+need|you\s+need|materials?|supplies|notions|mat[ée]riel|fournitures|il\s+(?:vous\s+)?faut|vous\s+aurez\s+besoin)\b\s*:?\s*$/i;

/** Même chose, mais suivie de texte sur la même ligne et terminée par « : ». */
const MAT_LOOSE =
  /^(you(?:'ll)?\s+will\s+need|materials?|supplies|mat[ée]riel|fournitures|il\s+vous\s+faut)\b.*:\s*$/i;

/** En-tête qui referme la section matériel et ouvre les instructions. */
const INSTR = /^(instructions?|pattern|steps?|[ée]tapes?|r[ée]alisation)\s*:?\s*$/i;

/** Consigne de répétition autonome, rattachée à l'étape précédente. */
const REPEAT = /^(repeat|rep\.?|r[ée]p[èe]te|r[ée]p[ée]t\w*|work)\b/i;

const BULLET = /^[-–—•*·]\s*/;

/** Une ligne courte, capitalisée et sans ponctuation finale : un nom de pièce. */
function isHeading(line: string): boolean {
  if (ROW.test(line) || MAT.test(line) || INSTR.test(line)) return false;
  const words = line.replace(/:$/, '').split(/\s+/);
  if (words.length > 6) return false;
  if (/\d/.test(line) && words.length > 2) return false;
  if (/[.,;!?]$/.test(line)) return false;
  return /^[A-ZÀ-ÝŒ0-9(«"]/.test(line) || line === line.toLocaleUpperCase();
}

/**
 * Nombre de répétitions d'une étape : d'abord l'étendue du libellé
 * (« Rangs 3-6 » → 4), sinon un « x6 » ou « 6 fois » dans le corps.
 */
function repeatTarget(range: number, body: string): number {
  if (range) return range;
  const match =
    body.match(/[x×]\s*(\d{1,2})\b/i) ?? body.match(/\b(\d{1,2})\s*(?:times|fois|x)\b/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

interface MutablePiece {
  name: string;
  steps: PatternStep[];
}

export function parsePattern(raw: string): Pattern {
  const source = String(raw ?? '');
  if (!source.trim()) return EMPTY_PATTERN;

  const lines = source
    .replace(/\r/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .split('\n');

  const pieces: MutablePiece[] = [];
  const materials: string[] = [];
  let title = '';
  let piece: MutablePiece | null = null;
  let pending: string[] = [];
  let inMaterials = false;
  let seenStep = false;

  const newPiece = (name: string): MutablePiece => {
    piece = { name, steps: [] };
    pieces.push(piece);
    return piece;
  };
  const lastStep = (): PatternStep | null =>
    piece && piece.steps.length ? piece.steps[piece.steps.length - 1] : null;

  const addStep = (label: string, body: string, range: number): void => {
    const target = piece ?? newPiece('');
    target.steps.push({ label, body, notes: pending.slice(), reps: repeatTarget(range, body) });
    pending = [];
    seenStep = true;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (MAT.test(line) || MAT_LOOSE.test(line)) {
      inMaterials = true;
      continue;
    }
    if (INSTR.test(line)) {
      inMaterials = false;
      continue;
    }
    if (inMaterials) {
      const isRow = ROW.test(line);
      const isPieceHeading =
        materials.length > 0 &&
        isHeading(line) &&
        !/\d/.test(line) &&
        line.split(/\s+/).length <= 3;
      if (!isRow && !isPieceHeading) {
        materials.push(line.replace(BULLET, ''));
        continue;
      }
      inMaterials = false;
    }

    const row = ROW.exec(line);
    if (row) {
      const from = Number.parseInt(row[2], 10);
      const to = row[3] ? Number.parseInt(row[3], 10) : 0;
      const word = row[1].replace(/s$/i, '');
      const label = (to ? `${word} ${from}–${to}` : `${word} ${from}`).replace(/^./, (c) =>
        c.toUpperCase(),
      );
      addStep(label, line.slice(row[0].length).trim() || line, to ? Math.max(0, to - from + 1) : 0);
      continue;
    }

    if (isHeading(line)) {
      const name = line.replace(/:$/, '');
      if (!seenStep && !pieces.length && !title && !materials.length) {
        title = name;
        continue;
      }
      newPiece(name);
      continue;
    }

    if (REPEAT.test(line) && lastStep()) {
      addStep('', line, 0);
      continue;
    }

    const previous = lastStep();
    if (previous && pending.length === 0) {
      const merged: PatternStep = {
        ...previous,
        body: `${previous.body} ${line.replace(BULLET, '')}`,
      };
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
  return {
    title,
    materials,
    pieces: kept,
    total: kept.reduce((n, p) => n + p.steps.length, 0),
  };
}

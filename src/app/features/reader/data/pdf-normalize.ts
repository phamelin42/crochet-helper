/**
 * Nettoyage du texte extrait d'un PDF, page par page.
 *
 * Fonction pure, sans dépendance à pdf.js : les tests lui passent directement
 * des tableaux de chaînes, jamais un PDF binaire.
 */

/** Levée quand aucune page ne contient de texte : le PDF est une image scannée. */
export class PdfEmptyTextError extends Error {}

/**
 * Une page déjà découpée en lignes, avec l'emplacement de ses images :
 * `afterLine` est l'indice de la dernière ligne au-dessus de l'image (-1 : en
 * tête de page). Une chaîne seule vaut une page sans image.
 */
export interface PdfPageText {
  readonly lines: readonly string[];
  readonly images?: readonly { readonly afterLine: number }[];
}

/** Marqueur inséré dans le texte à l'emplacement d'une image, reconnu par le parseur. */
export function imageMarker(n: number): string {
  return `[image ${n}]`;
}

const NBSP = /\u00a0/g;
const MULTI_SPACE = /[ \t]{2,}/g;
const PAGE_NUMBER = /^\d{1,3}$/;
/** Lettre suivie d'un tiret en fin de ligne : une césure. Un chiffre ne compte jamais. */
const HYPHEN_BREAK = /[a-zà-ÿ]-$/i;
const LOWERCASE_START = /^[a-zà-ÿ]/;
const MARKER_LINE = /^\[image \d+\]$/;

function splitLines(page: string | PdfPageText): string[] {
  const lines = typeof page === 'string' ? page.split('\n') : page.lines;
  return lines.map((line) => line.replace(NBSP, ' ').replace(MULTI_SPACE, ' ').trim());
}

/** Lignes d'en-tête ou de pied de page : celles qui figurent parmi les 3
 *  premières ou les 3 dernières lignes d'au moins deux pages. */
function findBoilerplate(pages: readonly string[][]): Set<string> {
  const counts = new Map<string, number>();
  for (const lines of pages) {
    const zone = new Set([...lines.slice(0, 3), ...lines.slice(-3)].filter(Boolean));
    for (const line of zone) counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, n]) => n >= 2).map(([line]) => line));
}

function isNoise(
  lines: readonly string[],
  index: number,
  boilerplate: ReadonlySet<string>,
): boolean {
  const line = lines[index];
  if (!line) return false;
  if (boilerplate.has(line)) return true;
  const nearEdge = index < 2 || index >= lines.length - 2;
  return nearEdge && PAGE_NUMBER.test(line);
}

/**
 * Retire le bruit de la page et place un marqueur `[image N]` après la ligne
 * au-dessus de chaque image. Les marqueurs sont posés après le repérage du
 * bruit : ils ne doivent pas décaler les « trois premières lignes » d'une page.
 */
function cleanPage(
  lines: readonly string[],
  images: readonly { readonly afterLine: number }[],
  boilerplate: ReadonlySet<string>,
  firstNumber: number,
): string[] {
  const markersAfter = new Map<number, string[]>();
  images.forEach(({ afterLine }, i) => {
    const at = Math.max(-1, Math.min(afterLine, lines.length - 1));
    markersAfter.set(at, [...(markersAfter.get(at) ?? []), imageMarker(firstNumber + i)]);
  });
  const out = [...(markersAfter.get(-1) ?? [])];
  lines.forEach((line, index) => {
    if (!isNoise(lines, index, boilerplate)) out.push(line);
    out.push(...(markersAfter.get(index) ?? []));
  });
  return out;
}

/** Recolle les lignes coupées par une césure, sans le tiret. */
function mergeHyphenation(lines: readonly string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const previous = out[out.length - 1];
    if (previous && HYPHEN_BREAK.test(previous) && LOWERCASE_START.test(line)) {
      out[out.length - 1] = previous.slice(0, -1) + line;
      continue;
    }
    out.push(line);
  }
  return out;
}

/**
 * Texte du patron, page après page. Les images sont numérotées à partir de 1
 * dans l'ordre où elles sont données (page, puis tableau `images`) : l'image
 * N du texte est la N-ième du tableau aplati, ce qui permet à l'appelant
 * d'enregistrer chaque fichier sous son numéro.
 */
export function normalizePdfPages(pages: readonly (string | PdfPageText)[]): string {
  const pageLines = pages.map(splitLines);
  const boilerplate = findBoilerplate(pageLines);
  let next = 1;
  const cleaned = pageLines.flatMap((lines, index) => {
    const page = pages[index];
    const images = typeof page === 'string' ? [] : (page.images ?? []);
    const out = cleanPage(lines, images, boilerplate, next);
    next += images.length;
    return out;
  });
  const merged = mergeHyphenation(cleaned);

  while (merged.length && !merged[0]) merged.shift();
  while (merged.length && !merged[merged.length - 1]) merged.pop();

  // Un PDF scanné n'a que des images : sans texte, il n'y a rien à découper.
  if (!merged.some((line) => line && !MARKER_LINE.test(line))) throw new PdfEmptyTextError();
  return merged.join('\n');
}

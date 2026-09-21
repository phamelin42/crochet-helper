/**
 * Nettoyage du texte extrait d'un PDF, page par page.
 *
 * Fonction pure, sans dépendance à pdf.js : les tests lui passent directement
 * des tableaux de chaînes, jamais un PDF binaire.
 */

/** Levée quand aucune page ne contient de texte : le PDF est une image scannée. */
export class PdfEmptyTextError extends Error {}

const NBSP = /\u00a0/g;
const MULTI_SPACE = /[ \t]{2,}/g;
const PAGE_NUMBER = /^\d{1,3}$/;
/** Lettre suivie d'un tiret en fin de ligne : une césure. Un chiffre ne compte jamais. */
const HYPHEN_BREAK = /[a-zà-ÿ]-$/i;
const LOWERCASE_START = /^[a-zà-ÿ]/;

function splitLines(page: string): string[] {
  return page
    .replace(NBSP, ' ')
    .split('\n')
    .map((line) => line.replace(MULTI_SPACE, ' ').trim());
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

function removeNoise(lines: readonly string[], boilerplate: ReadonlySet<string>): string[] {
  return lines.filter((line, index) => {
    if (!line) return true;
    if (boilerplate.has(line)) return false;
    const nearEdge = index < 2 || index >= lines.length - 2;
    if (nearEdge && PAGE_NUMBER.test(line)) return false;
    return true;
  });
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

export function normalizePdfPages(pages: readonly string[]): string {
  const pageLines = pages.map(splitLines);
  const boilerplate = findBoilerplate(pageLines);
  const cleaned = pageLines.flatMap((lines) => removeNoise(lines, boilerplate));
  const merged = mergeHyphenation(cleaned);

  while (merged.length && !merged[0]) merged.shift();
  while (merged.length && !merged[merged.length - 1]) merged.pop();

  if (!merged.length) throw new PdfEmptyTextError();
  return merged.join('\n');
}

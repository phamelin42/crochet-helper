/**
 * Ordre de lecture d'une page de PDF. pdf.js rend le texte dans l'ordre où le
 * logiciel de mise en page l'a écrit, pas dans celui où on le lit : un titre
 * posé en dernier dans le fichier se retrouve après son paragraphe, ou collé à
 * la section voisine. Fonction pure, sans pdf.js, pour se tester seule.
 */

/** Une ligne de texte avec sa position dans la page (origine en bas à gauche). */
export interface PositionedLine {
  readonly text: string;
  /** Ligne de base ; `NaN` pour une ligne vide. */
  readonly y: number;
  /** Corps du texte, pour juger si deux lignes sont sur la même ligne de base. */
  readonly size: number;
  readonly left: number;
  readonly right: number;
}

/** `upper` est écrite avant `lower` dans le fichier, mais se lit après : à échanger. */
function inverted(before: PositionedLine, after: PositionedLine): boolean {
  if (Number.isNaN(before.y) || Number.isNaN(after.y)) return false;
  const tolerance = 0.5 * Math.min(before.size || 12, after.size || 12);
  if (after.y - before.y <= tolerance) return false;
  // Deux lignes de colonnes différentes ne se comparent pas : l'ordre d'écriture
  // (une colonne puis l'autre) est déjà un ordre de lecture.
  return Math.min(before.right, after.right) - Math.max(before.left, after.left) > 0;
}

/**
 * Remonte chaque ligne au-dessus des lignes écrites avant elle qui sont plus bas
 * dans la même colonne. Une page déjà dans l'ordre est rendue telle quelle ; sinon
 * les lignes vides, dont la place est inconnue, disparaissent.
 */
export function readingOrder<T extends PositionedLine>(lines: readonly T[]): T[] {
  const needed = lines.some((line, i) => i > 0 && inverted(lines[i - 1], line));
  if (!needed) return [...lines];
  const ordered = lines.filter((line) => !Number.isNaN(line.y));
  for (let i = 1; i < ordered.length; i++) {
    for (let j = i; j > 0 && inverted(ordered[j - 1], ordered[j]); j--) {
      [ordered[j - 1], ordered[j]] = [ordered[j], ordered[j - 1]];
    }
  }
  return ordered;
}

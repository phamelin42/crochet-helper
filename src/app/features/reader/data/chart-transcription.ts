import { parsePattern } from './pattern-parser';

/**
 * Séparé de `chart-composer.ts` : le magasin du lecteur (bundle initial)
 * n'importe que ceci, pas la table des symboles.
 */

/** « Diagramme 1 », puis 2… : le premier numéro qu'aucune pièce du patron ne porte déjà. */
export function defaultPieceName(existing: readonly string[], word: string): string {
  const taken = new Set(existing.map((name) => name.trim().toLowerCase()));
  let n = 1;
  while (taken.has(`${word} ${n}`.toLowerCase())) n++;
  return `${word} ${n}`;
}

/**
 * Ajoute la transcription en **nouvelle pièce**, à la fin du texte, sans
 * toucher au reste. Le nom devient une ligne d'en-tête que le parseur doit
 * reconnaître comme nom de pièce : un nom qu'il lirait autrement (« tour 2 »,
 * une longue phrase) est remplacé par `fallback`, sinon les tours se
 * glisseraient dans la pièce précédente.
 */
export function appendTranscription(
  source: string,
  name: string,
  text: string,
  fallback: string,
): string {
  const base = source.trimEnd();
  const build = (heading: string) => `${base}${base ? '\n\n' : ''}${heading}\n${text}`;
  const cleaned = name
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;:!?]+$/, '');
  const heading = cleaned.charAt(0).toLocaleUpperCase() + cleaned.slice(1);
  if (heading) {
    const before = base ? parsePattern(base).pieces.length : 0;
    const after = parsePattern(build(heading)).pieces;
    if (after.length === before + 1 && after[after.length - 1].name === heading) {
      return build(heading);
    }
  }
  return build(fallback);
}

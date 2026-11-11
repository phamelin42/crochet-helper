import { describe, expect, it } from 'vitest';
import { CORPUS } from './fixtures/corpus';
import { isChromeLine, isSectionHeader, parsePattern } from './pattern-parser';
import type { Pattern } from './pattern.model';

/**
 * Normalisation commune à la source et au résultat : minuscules, entités,
 * pluriel du mot de libellé (« Rows 4-10 » devient « Row 4–10 » dans le
 * parseur), puis seuls les lettres et chiffres comptent. Un seul endroit, pour
 * que les deux côtés de la comparaison ne puissent pas diverger.
 */
export function normalize(text: string): string {
  return (
    text
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      // « (RS) » devient `side`, qui n'est pas du texte de l'étape.
      .replace(/\((?:rs|ws|endroit|envers)\)/gi, '')
      .toLowerCase()
      .trim()
      .replace(/^(?:[-–—•*·§]|o(?=\s))\s*/, '')
      // « Rangs 5 à 8 » devient le libellé « Rang 5–8 ».
      .replace(/(\d)\s*(?:à|to|au)\s*(\d)/giu, '$1-$2')
      .replace(/^(rang|tour|row|round|rnd|rg|step|étape|etape)s(?![\p{L}])/u, '$1')
      .replace(/[^\p{L}\p{N}]+/gu, '')
  );
}

/** Tout le texte du patron, dans l'ordre de lecture, sans séparateur. */
function haystack(pattern: Pattern): string {
  const parts: string[] = [pattern.title, ...pattern.materials, ...pattern.notes];
  for (const piece of pattern.pieces) {
    parts.push(piece.name);
    for (const step of piece.steps) {
      parts.push(...step.notes, step.label, step.body, step.tip ?? '');
    }
  }
  return parts.map(normalize).join('');
}

const IMAGE_MARKER_LINE = /^\[image\s+\d+\]$/i;

/** Lignes de la source qui ne se retrouvent pas dans le patron. */
export function lostLines(raw: string): string[] {
  const pattern = parsePattern(raw);
  const stream = haystack(pattern);
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !IMAGE_MARKER_LINE.test(line) && !isChromeLine(line))
    .filter((line) => !isSectionHeader(line))
    .filter((line) => {
      const wanted = normalize(line);
      if (wanted.length < 2 || stream.includes(wanted)) return false;
      // « Materials: 4 mm hook » : l'en-tête est retiré, le contenu reste.
      const colon = line.indexOf(':');
      if (colon > 0 && isSectionHeader(`${line.slice(0, colon)}:`)) {
        return !stream.includes(normalize(line.slice(colon + 1)));
      }
      return true;
    });
}

describe('rien ne se perd', () => {
  // La fiche 01 est une page de blog : aucune étape, donc aucun patron. C'est
  // le cas « à passer par l'IA » ; il est traité à part ci-dessous, pas exclu.
  const IA_ONLY = new Set(['01-mabel-market-bag.txt']);

  it.each(CORPUS.filter((f) => !IA_ONLY.has(f.name)).map((f) => [f.name, f.raw]))(
    '« %s » : chaque ligne de la source se retrouve dans le patron',
    (_name, raw) => {
      expect(lostLines(raw)).toEqual([]);
    },
  );

  it('01 (page de blog sans rang) ne produit aucun patron : c’est à l’IA de le mettre en forme', () => {
    const fixture = CORPUS.find((f) => IA_ONLY.has(f.name))!;
    expect(parsePattern(fixture.raw).total).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { PositionedLine, readingOrder } from './pdf-reading-order';

/** Une ligne de 14 pt à la marge gauche, large comme un paragraphe. */
function ligne(text: string, y: number, left = 59, right = 540, size = 14): PositionedLine {
  return { text, y, size, left, right };
}

const textes = (lignes: readonly PositionedLine[]): string[] => lignes.map((l) => l.text);

describe('ordre de lecture d’une page de PDF', () => {
  it('une page déjà dans l’ordre reste telle quelle, lignes vides comprises', () => {
    const page = [ligne('Rang 1', 700), ligne('', Number.NaN), ligne('Rang 2', 680)];
    expect(readingOrder(page)).toEqual(page);
  });

  it('un titre écrit après son texte revient au-dessus de lui (First Sleeve)', () => {
    // Ordre d'écriture du PDF « Chunky Mesh Overshirt », page 3.
    const page = [
      ligne('Pattern', 781, 232, 300, 36),
      ligne('To begin, chain 30 (34, 38)', 722),
      ligne('Repeat row 3 for a total of 5 rows of mesh.', 526),
      ligne('First Sleeve', 754, 59, 160, 17),
      ligne('Front panel', 463, 59, 140, 17),
      ligne('With working yarn still attached, chain 29', 440),
    ];
    expect(textes(readingOrder(page))).toEqual([
      'Pattern',
      'First Sleeve',
      'To begin, chain 30 (34, 38)',
      'Repeat row 3 for a total of 5 rows of mesh.',
      'Front panel',
      'With working yarn still attached, chain 29',
    ]);
  });

  it('deux titres écrits d’affilée retrouvent chacun leur texte (Front panel opening, Other sleeve)', () => {
    const page = [
      ligne('Pattern Continued', 781, 141, 400, 36),
      ligne('On the next row: continue in mesh', 708),
      ligne('Again, skip the first 5 chs', 642),
      ligne('Front panel opening', 740, 59, 220, 17),
      ligne('Other sleeve', 556, 59, 160, 17),
      ligne('On the 7 (9, 10)th front panel row', 528),
    ];
    expect(textes(readingOrder(page))).toEqual([
      'Pattern Continued',
      'Front panel opening',
      'On the next row: continue in mesh',
      'Again, skip the first 5 chs',
      'Other sleeve',
      'On the 7 (9, 10)th front panel row',
    ]);
  });

  it('deux colonnes écrites l’une après l’autre ne sont pas mélangées', () => {
    const gauche = (text: string, y: number) => ligne(text, y, 40, 250);
    const droite = (text: string, y: number) => ligne(text, y, 320, 540);
    const page = [
      gauche('Yarn', 734),
      gauche('Hook', 634),
      gauche('10mm', 611),
      droite('Gauge', 741),
      droite('Sizing', 646),
    ];
    expect(textes(readingOrder(page))).toEqual(['Yarn', 'Hook', '10mm', 'Gauge', 'Sizing']);
  });

  it('un titre pleine largeur écrit en dernier remonte au-dessus des deux colonnes', () => {
    const page = [
      ligne('Yarn', 734, 40, 250),
      ligne('Gauge', 741, 320, 540),
      ligne('OVERVIEW', 760, 40, 540, 19),
    ];
    expect(readingOrder(page)[0].text).toBe('OVERVIEW');
  });

  it('deux fragments de la même ligne de base gardent leur ordre', () => {
    const page = [ligne('Rang 1 :', 700, 59, 110), ligne('6 ms dans un cercle', 699, 120, 300)];
    expect(textes(readingOrder(page))).toEqual(['Rang 1 :', '6 ms dans un cercle']);
  });
});

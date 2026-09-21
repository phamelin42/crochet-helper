import { describe, expect, it } from 'vitest';
import { PdfEmptyTextError, normalizePdfPages } from './pdf-normalize';

describe('normalizePdfPages', () => {
  it('rend le cas de référence exactement', () => {
    const pages = [
      'Little Bee Amigurumi — Pattern Reader test\n1\nLittle Bee Amigurumi\nMaterials: 4 mm hook, yellow and black yarn\nRound 1: 6 sc in magic ring (6)\nRound 2: inc in each st around (12)\nRound 3: [sc, inc] x 6 (18) — work in the back loop for a smoo-\nther finish',
      'Little Bee Amigurumi — Pattern Reader test\n2\nRound 4: [2 sc, inc] x 6 (24)\nRounds 5-8: sc around (24)\nFasten off and weave in ends.',
    ];

    expect(normalizePdfPages(pages)).toBe(
      [
        'Little Bee Amigurumi',
        'Materials: 4 mm hook, yellow and black yarn',
        'Round 1: 6 sc in magic ring (6)',
        'Round 2: inc in each st around (12)',
        'Round 3: [sc, inc] x 6 (18) — work in the back loop for a smoother finish',
        'Round 4: [2 sc, inc] x 6 (24)',
        'Rounds 5-8: sc around (24)',
        'Fasten off and weave in ends.',
      ].join('\n'),
    );
  });

  it('insère un saut de ligne entre deux pages sans le coller au contenu suivant', () => {
    const result = normalizePdfPages(['Round 1: sc around (6)', 'Round 2: 2 sc in each st (12)']);

    expect(result).toBe('Round 1: sc around (6)\nRound 2: 2 sc in each st (12)');
  });

  it('retire une ligne répétée parmi les 3 premières ou dernières lignes d’au moins 2 pages', () => {
    const header = 'My Pattern Shop — page';
    const pages = [
      `${header}\nRow 1: sc around\n${header}`,
      `${header}\nRow 2: inc in each st\n${header}`,
      `Row 3: sc around\nRow 4: inc in each st`,
    ];

    const result = normalizePdfPages(pages);

    expect(result).not.toContain(header);
    expect(result).toBe('Row 1: sc around\nRow 2: inc in each st\nRow 3: sc around\nRow 4: inc in each st');
  });

  it('retire les numéros de page isolés en tête ou en fin de page', () => {
    const pages = ['1\nRow 1: sc around\nRow 2: inc in each st\n7', '2\nRow 3: sc around'];

    const result = normalizePdfPages(pages);

    expect(result).toBe('Row 1: sc around\nRow 2: inc in each st\nRow 3: sc around');
  });

  it('recolle une césure sans le tiret, mais laisse les chiffres et les étendues intacts', () => {
    const pages = [
      'Rounds 5-8: sc around (24)\n2-3 sc in next st\nWork the back loop for a smoo-\nther finish\nRepeat rows 5-',
    ];

    const result = normalizePdfPages(pages);

    expect(result).toBe(
      [
        'Rounds 5-8: sc around (24)',
        '2-3 sc in next st',
        'Work the back loop for a smoother finish',
        'Repeat rows 5-',
      ].join('\n'),
    );
  });

  it('convertit les espaces insécables, réduit les espaces multiples et coupe les lignes vides en tête et en fin', () => {
    const pages = ['\n\nRound 1:  6  sc   around (6)\n\n'];

    const result = normalizePdfPages(pages);

    expect(result).toBe('Round 1: 6 sc around (6)');
  });

  it('lève PdfEmptyTextError quand aucune page ne contient de texte', () => {
    expect(() => normalizePdfPages(['', '   \n  \n'])).toThrow(PdfEmptyTextError);
  });
});

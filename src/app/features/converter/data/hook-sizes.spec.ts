import { describe, expect, it } from 'vitest';
import { HOOK_SIZES, annotateHookSizes, findHookSize } from './hook-sizes';

describe('annotateHookSizes', () => {
  it('ajoute l’équivalent millimétrique après une taille américaine, sans la remplacer', () => {
    const result = annotateHookSizes('Row 1: with a G-6 hook, ch 20');
    expect(result.text).toBe('Row 1: with a G-6 (4 mm) hook, ch 20');
    expect(result.annotations).toEqual([{ original: 'G-6', added: '4 mm' }]);
  });

  it('ajoute l’équivalent américain après une taille en millimètres', () => {
    const result = annotateHookSizes('4mm hook');
    expect(result.text).toBe('4mm (US G-6) hook');
    expect(result.annotations).toEqual([{ original: '4mm', added: 'US G-6' }]);
  });

  it('reconnaît les écritures « 4 mm », « 4mm », « 4.0 mm » et « 4,0 mm »', () => {
    for (const written of ['4 mm', '4mm', '4.0 mm', '4,0 mm']) {
      const result = annotateHookSizes(`${written} hook`);
      expect(result.text).toBe(`${written} (US G-6) hook`);
    }
  });

  it('reconnaît les écritures « G-6 », « G6 » et « G/6 »', () => {
    for (const written of ['G-6', 'G6', 'G/6']) {
      const result = annotateHookSizes(`${written} hook`);
      expect(result.text).toBe(`${written} (4 mm) hook`);
    }
  });

  it('reconnaît « size G » suivi de hook', () => {
    const result = annotateHookSizes('using a size G hook');
    expect(result.text).toBe('using a size G (4 mm) hook');
  });

  it('reconnaît « crochet hook » comme suffixe', () => {
    const result = annotateHookSizes('a G-6 crochet hook');
    expect(result.text).toBe('a G-6 (4 mm) crochet hook');
  });

  it('parcourt toutes les tailles du tableau, dans les deux sens', () => {
    for (const size of HOOK_SIZES) {
      const fromUs = annotateHookSizes(`with a ${size.us} hook`);
      expect(fromUs.text).toBe(`with a ${size.us} (${size.mm} mm) hook`);
      expect(fromUs.annotations).toEqual([{ original: size.us, added: `${size.mm} mm` }]);

      const fromMm = annotateHookSizes(`with a ${size.mm} mm hook`);
      expect(fromMm.text).toBe(`with a ${size.mm} mm (US ${size.us}) hook`);
      expect(fromMm.annotations).toEqual([{ original: `${size.mm} mm`, added: `US ${size.us}` }]);
    }
  });

  it('laisse une taille absente du tableau telle quelle, et la signale', () => {
    const result = annotateHookSizes('a 3 mm hook, then a 7 mm hook');
    expect(result.text).toBe('a 3 mm hook, then a 7 mm hook');
    expect(result.unknown).toEqual(['3 mm', '7 mm']);
  });

  it('n’annote pas une taille déjà écrite dans les deux systèmes', () => {
    const result = annotateHookSizes('5 mm (H-8) hook');
    expect(result.text).toBe('5 mm (H-8) hook');
    expect(result.annotations).toEqual([]);
  });

  it('n’ajoute pas une deuxième parenthèse à un texte déjà annoté', () => {
    const once = annotateHookSizes('with a G-6 hook').text;
    const twice = annotateHookSizes(once).text;
    expect(twice).toBe(once);
  });

  it('ne touche pas une mesure en millimètres qui ne désigne pas un crochet', () => {
    const result = annotateHookSizes('a 4 mm yarn, a 4mm cord length');
    expect(result.text).toBe('a 4 mm yarn, a 4mm cord length');
    expect(result.annotations).toEqual([]);
    expect(result.unknown).toEqual([]);
  });
});

/** Écritures d'un diamètre qu'une lectrice peut taper : « 4 », « 4 mm », « 4,0 », « 4.00mm »… */
function mmForms(mm: number): string[] {
  const comma = String(mm).replace('.', ',');
  const fixed = mm.toFixed(2);
  return [
    String(mm),
    comma,
    `${mm} mm`,
    `${mm}mm`,
    `${comma} mm`,
    fixed,
    fixed.replace('.', ','),
    `${fixed}mm`,
    ` ${mm} MM `,
  ];
}

/**
 * Écritures d'une notation américaine : « G-6 », « g6 », « G/6 », « G 6 »,
 * « G », « US G-6 », « size G ». Le numéro seul n'en fait partie que pour le
 * « 7 », seule taille sans lettre : « 6 » est le crochet de 6 mm.
 */
function usForms(us: string): string[] {
  const match = /^(?:([A-Z])(?:\/([A-Z]))?-)?(\d+½?)$/.exec(us);
  if (!match) throw new Error(`Notation inattendue : ${us}`);
  const [, letter, letter2, number] = match;
  if (!letter) return [number, `US ${number}`, `size ${number}`];
  const letters = letter2 ? `${letter}/${letter2}` : letter;
  const forms = [
    us,
    us.toLowerCase(),
    `${letters}${number}`,
    `${letters}${number}`.toLowerCase(),
    `${letters}/${number}`,
    `${letters} ${number}`,
    `${letters} - ${number}`,
    letters,
    letters.toLowerCase(),
    `US ${us}`,
    `size ${letters}`,
  ];
  if (number.endsWith('½')) {
    forms.push(`${letters}-${number.replace('½', '.5')}`, `${letters}${number.replace('½', ',5')}`);
  }
  return forms;
}

describe('findHookSize', () => {
  it('retrouve chaque taille du tableau depuis son diamètre, sous chaque écriture acceptée', () => {
    for (const size of HOOK_SIZES) {
      for (const written of mmForms(size.mm)) {
        expect(findHookSize(written), `« ${written} »`).toEqual(size);
      }
    }
  });

  it('retrouve chaque taille du tableau depuis sa notation américaine, sous chaque écriture acceptée', () => {
    for (const size of HOOK_SIZES) {
      for (const written of usForms(size.us)) {
        expect(findHookSize(written), `« ${written} »`).toEqual(size);
      }
    }
  });

  it('accepte les exemples de la page : 4, 4 mm, 4,0, G, G-6, g6 et 7', () => {
    const g6 = { mm: 4, us: 'G-6' };
    for (const written of ['4', '4 mm', '4,0', 'G', 'G-6', 'g6']) {
      expect(findHookSize(written), `« ${written} »`).toEqual(g6);
    }
    expect(findHookSize('7')).toEqual({ mm: 4.5, us: '7' });
  });

  it('lit un nombre seul en millimètres avant de le lire comme un numéro américain', () => {
    expect(findHookSize('6')).toEqual({ mm: 6, us: 'J-10' });
    expect(findHookSize('8')).toEqual({ mm: 8, us: 'L-11' });
    expect(findHookSize('10')).toEqual({ mm: 10, us: 'N/P-15' });
    expect(findHookSize('10,5')).toEqual({ mm: 6.5, us: 'K-10½' });
  });

  it('renvoie null pour une saisie vide ou hors de la norme, sans exception', () => {
    for (const written of [
      '',
      '   ',
      '3 mm',
      '7 mm',
      'Z',
      'N',
      'G-7',
      '0',
      '-4',
      'mm',
      'US',
      '4 mm mm',
      'G'.repeat(1000),
      '4'.repeat(30),
    ]) {
      expect(findHookSize(written), `« ${written.slice(0, 20)} »`).toBeNull();
    }
  });
});

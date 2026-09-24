import { describe, expect, it } from 'vitest';
import { HOOK_SIZES, annotateHookSizes } from './hook-sizes';

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

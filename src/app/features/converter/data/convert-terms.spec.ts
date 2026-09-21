import { describe, expect, it } from 'vitest';
import { convertTerms, regionCrossReferenceOf } from './convert-terms';

describe('convertTerms', () => {
  it('convertit une abréviation US en son équivalent UK', () => {
    const result = convertTerms('Row 2: ch 2, sc in each st across, turn (18)', 'US', 'UK');
    expect(result.text).toBe('Row 2: ch 2, dc in each st across, turn (18)');
    expect(result.replacements).toEqual([{ term: 'sc', replacement: 'dc' }]);
  });

  it('convertit dans le sens inverse', () => {
    const result = convertTerms('Row 2: ch 2, dc in each st across, turn (18)', 'UK', 'US');
    expect(result.text).toBe('Row 2: ch 2, sc in each st across, turn (18)');
    expect(result.replacements).toEqual([{ term: 'dc', replacement: 'sc' }]);
  });

  it('ne touche pas un jeton partiel', () => {
    const result = convertTerms('12 dcs, abcdc, sc2dc', 'US', 'UK');
    expect(result.text).toBe('12 dcs, abcdc, sc2dc');
    expect(result.replacements).toEqual([]);
  });

  it('préserve la casse majuscule', () => {
    const result = convertTerms('HDC in next st', 'US', 'UK');
    expect(result.text).toBe('HTR in next st');
  });

  it('préserve la casse capitale', () => {
    const result = convertTerms('Dc in next st', 'US', 'UK');
    expect(result.text).toBe('Tr in next st');
  });

  it('ne convertit jamais deux fois le même jeton', () => {
    // sc → dc côté US→UK : le « dc » produit ne doit pas être reconverti en tr.
    const result = convertTerms('sc, sc', 'US', 'UK');
    expect(result.text).toBe('dc, dc');
    expect(result.replacements).toHaveLength(2);
  });

  it('laisse les nombres et la ponctuation intacts', () => {
    const result = convertTerms('Rnd 3: 6 sc, inc, (12)', 'US', 'UK');
    expect(result.text).toBe('Rnd 3: 6 dc, inc, (12)');
  });

  it('signale un terme reconnu mais sans équivalent dans ce sens', () => {
    const result = convertTerms('ch 5 (counts as dtr), dtr in each st', 'US', 'UK');
    expect(result.text).toBe('ch 5 (counts as dtr), dtr in each st');
    expect(result.replacements).toEqual([]);
    expect(result.unmatched).toEqual(['dtr']);
  });

  it('ne signale un terme sans équivalent qu’une seule fois', () => {
    const result = convertTerms('dtr, dtr, DTR', 'US', 'UK');
    expect(result.unmatched).toEqual(['dtr']);
  });

  it('ne change rien quand les deux conventions sont identiques', () => {
    const result = convertTerms('sc, dc, dtr', 'US', 'US');
    expect(result).toEqual({ text: 'sc, dc, dtr', replacements: [], unmatched: [] });
  });

  it('convertit plusieurs abréviations différentes dans le même texte', () => {
    const result = convertTerms('sc in next st, then hdc, then tr', 'US', 'UK');
    expect(result.text).toBe('dc in next st, then htr, then dtr');
    expect(result.replacements).toEqual([
      { term: 'sc', replacement: 'dc' },
      { term: 'hdc', replacement: 'htr' },
      { term: 'tr', replacement: 'dtr' },
    ]);
  });
});

describe('regionCrossReferenceOf', () => {
  it('signale qu’un terme réutilisé par le britannique désigne une autre maille', () => {
    expect(regionCrossReferenceOf('dc')).toEqual({ reusedInUk: true, otherTerm: 'sc' });
    expect(regionCrossReferenceOf('DC')).toEqual({ reusedInUk: true, otherTerm: 'sc' });
  });

  it('renvoie l’équivalent britannique d’un terme uniquement américain', () => {
    expect(regionCrossReferenceOf('sc')).toEqual({ reusedInUk: false, otherTerm: 'dc' });
    expect(regionCrossReferenceOf('hdc')).toEqual({ reusedInUk: false, otherTerm: 'htr' });
  });

  it('ne trouve rien pour un terme hors du système US/UK', () => {
    expect(regionCrossReferenceOf('ch')).toBeUndefined();
  });
});

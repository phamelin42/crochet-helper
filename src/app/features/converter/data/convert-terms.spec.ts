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

  it('convertit la double bride américaine en triple bride britannique', () => {
    // Laisser `dtr` intact serait faux : un lecteur britannique y lirait une double bride.
    const result = convertTerms('ch 5 (counts as dtr), dtr in each st', 'US', 'UK');
    expect(result.text).toBe('ch 5 (counts as trtr), trtr in each st');
    expect(result.unmatched).toEqual([]);
  });

  it('signale un terme étranger à la convention de départ, sans le toucher', () => {
    const result = convertTerms('htr in next st, sc in next st', 'US', 'UK');
    expect(result.text).toBe('htr in next st, dc in next st');
    expect(result.unmatched).toEqual(['htr']);
  });

  it('ne signale un terme sans équivalent qu’une seule fois', () => {
    const result = convertTerms('sc, sc, SC', 'UK', 'US');
    expect(result.unmatched).toEqual(['sc']);
  });

  it('convertit les diminutions groupées', () => {
    const result = convertTerms('sc2tog, dc3tog, HDC2TOG', 'US', 'UK');
    expect(result.text).toBe('dc2tog, tr3tog, HTR2TOG');
    expect(result.replacements).toEqual([
      { term: 'sc2tog', replacement: 'dc2tog' },
      { term: 'dc3tog', replacement: 'tr3tog' },
      { term: 'HDC2TOG', replacement: 'HTR2TOG' },
    ]);
  });

  it('convertit les mailles en relief en gardant le préfixe', () => {
    const result = convertTerms('FPdc around next st, BPtr', 'UK', 'US');
    expect(result.text).toBe('FPsc around next st, BPdc');
  });

  it('ne reconvertit pas le résultat d’une chaîne de paires', () => {
    // dc → tr puis tr → dtr serait une double conversion.
    const result = convertTerms('dc, tr, dtr', 'US', 'UK');
    expect(result.text).toBe('tr, dtr, trtr');
  });

  it('fait l’aller-retour sans perte', () => {
    const us = 'Rnd 4: ch 3, *dc in next st, FPdc, sc2tog, hdc, tr, dtr* (24)';
    const uk = convertTerms(us, 'US', 'UK').text;
    expect(convertTerms(uk, 'UK', 'US').text).toBe(us);
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

  it('privilégie, pour dtr, ce que ces lettres signifient au Royaume-Uni', () => {
    expect(regionCrossReferenceOf('dtr')).toEqual({ reusedInUk: true, otherTerm: 'tr' });
    expect(regionCrossReferenceOf('trtr')).toEqual({ reusedInUk: true, otherTerm: 'dtr' });
  });

  it('ne trouve rien pour un terme hors du système US/UK', () => {
    expect(regionCrossReferenceOf('ch')).toBeUndefined();
  });
});

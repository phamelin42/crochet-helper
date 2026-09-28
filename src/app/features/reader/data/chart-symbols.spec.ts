import { describe, expect, it } from 'vitest';
import {
  CHART_SYMBOLS,
  symbolAbbreviation,
  symbolName,
  symbolUrl,
} from './chart-symbols';

/** Les identifiants de la fiche 35 : ni plus, ni moins. */
const EXPECTED_IDS = [
  'ch',
  'sl-st',
  'sc',
  'hdc',
  'dc',
  'tr',
  'dtr',
  'magic-ring',
  'ch-space',
  'sc-inc',
  'dc-inc',
  'sc2tog',
  'dc2tog',
  'dc3tog',
  'picot',
  'fpdc',
  'bpdc',
  'blo',
  'flo',
  'cluster',
  'puff',
  'popcorn',
  'shell',
];

describe('chart-symbols', () => {
  it('porte exactement les 23 symboles de la norme retenue', () => {
    expect(CHART_SYMBOLS.map((s) => s.id)).toEqual(EXPECTED_IDS);
  });

  for (const symbol of CHART_SYMBOLS) {
    it(`${symbol.id} a ses trois abréviations, ses deux noms et une adresse de dessin`, () => {
      for (const value of [symbol.us, symbol.uk, symbol.fr, symbol.nameFr, symbol.nameEn]) {
        expect(value.trim()).not.toBe('');
      }
      expect(symbolUrl(symbol.id)).toBe(`/symbols/${symbol.id}.svg`);
      // Le fichier existe : `tools/check-symbols.mjs`, lancé par le build.
    });
  }

  it("choisit l'abréviation et le nom de la langue de la page", () => {
    const dc = CHART_SYMBOLS.find((s) => s.id === 'dc')!;
    expect(symbolAbbreviation(dc, 'fr')).toBe('br');
    expect(symbolAbbreviation(dc, 'en')).toBe('dc');
    expect(symbolName(dc, 'fr')).toBe('bride');
    expect(symbolName(dc, 'en')).toContain('double crochet');
  });

  it('ne réutilise pas une abréviation pour deux mailles dans une même convention', () => {
    // `sc` (US) et `dc` (UK) désignent la même maille : c'est la seule
    // réutilisation admise, et elle passe d'une convention à l'autre.
    for (const key of ['us', 'uk', 'fr'] as const) {
      const values = CHART_SYMBOLS.map((s) => s[key]);
      const duplicated = values.filter((v, i) => values.indexOf(v) !== i);
      expect(duplicated, key).toEqual([]);
    }
  });
});

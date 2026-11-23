import { describe, expect, it } from 'vitest';
import { Favorite, PatternOrigin, validFavorite, validOrigin } from './favorite.model';

const FAVORI: Favorite = {
  id: '101',
  name: 'Petit sapin',
  designer: 'Camille Exemple',
  thumbnail: 'https://images4-g.ravelrycache.com/uploads/a/small.jpg',
  permalink: 'https://www.ravelry.com/patterns/library/petit-sapin',
  addedAt: 1_700_000_000_000,
};

const ORIGINE: PatternOrigin = {
  source: 'ravelry',
  id: '101',
  name: 'Petit sapin',
  designer: 'Camille Exemple',
  permalink: 'https://www.ravelry.com/patterns/library/petit-sapin',
  photoUrl: null,
};

describe('validFavorite', () => {
  it('accepte un favori complet, avec ou sans vignette ni créatrice', () => {
    expect(validFavorite(FAVORI)).toBe(true);
    expect(validFavorite({ ...FAVORI, thumbnail: null })).toBe(true);
    expect(validFavorite({ ...FAVORI, designer: '' })).toBe(true);
  });

  const invalides: [string, unknown][] = [
    ['null', null],
    ['texte', 'x'],
    ['id non numérique', { ...FAVORI, id: 'abc' }],
    ['id nul', { ...FAVORI, id: '0' }],
    ['id nombre', { ...FAVORI, id: 101 }],
    ['nom vide', { ...FAVORI, name: '' }],
    ['nom trop long', { ...FAVORI, name: 'n'.repeat(201) }],
    ['créatrice trop longue', { ...FAVORI, designer: 'd'.repeat(101) }],
    ['vignette http', { ...FAVORI, thumbnail: 'http://x.example/a.jpg' }],
    ['vignette javascript', { ...FAVORI, thumbnail: 'javascript:alert(1)' }],
    ['vignette trop longue', { ...FAVORI, thumbnail: `https://x.example/${'a'.repeat(700)}` }],
    ['lien hors de Ravelry', { ...FAVORI, permalink: 'https://evil.example/patterns/library/x' }],
    ['lien javascript', { ...FAVORI, permalink: 'javascript:alert(1)' }],
    ['lien sans https', { ...FAVORI, permalink: 'http://www.ravelry.com/patterns/library/x' }],
    ['date absente', { ...FAVORI, addedAt: undefined }],
    ['date infinie', { ...FAVORI, addedAt: Infinity }],
  ];
  it.each(invalides)('refuse : %s', (_nom, valeur) => {
    expect(validFavorite(valeur)).toBe(false);
  });
});

describe('validOrigin', () => {
  it('accepte une origine Ravelry, avec ou sans photo', () => {
    expect(validOrigin(ORIGINE)).toBe(true);
    expect(validOrigin({ ...ORIGINE, photoUrl: FAVORI.thumbnail })).toBe(true);
  });

  const invalides: [string, unknown][] = [
    ['autre source', { ...ORIGINE, source: 'etsy' }],
    ['sans source', { ...ORIGINE, source: undefined }],
    ['id non numérique', { ...ORIGINE, id: '1; drop' }],
    ['lien hors de Ravelry', { ...ORIGINE, permalink: 'https://evil.example/x' }],
    ['photo http', { ...ORIGINE, photoUrl: 'http://x.example/a.jpg' }],
    ['nom trop long', { ...ORIGINE, name: 'n'.repeat(201) }],
    ['tableau', []],
  ];
  it.each(invalides)('refuse : %s', (_nom, valeur) => {
    expect(validOrigin(valeur)).toBe(false);
  });
});

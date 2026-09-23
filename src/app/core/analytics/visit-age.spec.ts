import { describe, expect, it } from 'vitest';
import { visitBucket } from './visit-age';

describe('visitBucket', () => {
  const CAS: [number, ReturnType<typeof visitBucket>][] = [
    [0, null],
    [1, '1d'],
    [2, '2_7d'],
    [7, '2_7d'],
    [8, '8_30d'],
    [30, '8_30d'],
    [31, '31d'],
    [400, '31d'],
  ];

  for (const [ecart, attendu] of CAS) {
    it(`un écart de ${ecart} jour(s) donne ${attendu}`, () => {
      const premiere = '2026-01-01';
      const jour = new Date(Date.UTC(2026, 0, 1 + ecart)).toISOString().slice(0, 10);
      expect(visitBucket(premiere, jour)).toBe(attendu);
    });
  }

  it('une première visite future donne null', () => {
    expect(visitBucket('2026-09-23', '2026-09-22')).toBeNull();
  });

  it('une date invalide donne null', () => {
    expect(visitBucket('pas-une-date', '2026-09-23')).toBeNull();
    expect(visitBucket('2026-09-23', 'pas-une-date')).toBeNull();
    expect(visitBucket('2026-02-30', '2026-09-23')).toBeNull();
  });
});

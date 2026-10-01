import { daysSinceCivil, visitBucket } from './visit-age';

describe('visitBucket', () => {
  const cas: [string, ReturnType<typeof visitBucket>][] = [
    ['2026-10-01', null],
    ['2026-09-30', '1j'],
    ['2026-09-29', '2_7j'],
    ['2026-09-24', '2_7j'],
    ['2026-09-23', '8_30j'],
    ['2026-09-01', '8_30j'],
    ['2026-08-31', '31j'],
    ['2026-10-02', null],
    ['2026-02-30', null],
  ];
  for (const [premiere, attendu] of cas) {
    it(`première visite le ${premiere} → ${attendu}`, () => {
      expect(visitBucket(premiere, '2026-10-01')).toBe(attendu);
    });
  }

  it('compte les jours civils, changement d’heure compris', () => {
    expect(daysSinceCivil('2026-10-24', '2026-10-26')).toBe(2);
  });
});

import { describe, expect, it } from 'vitest';
import { GUIDE_DATES, guideDatesLine } from './guide-dates';

describe('guideDatesLine', () => {
  it('écrit la date en clair dans la langue de la page', () => {
    expect(guideDatesLine('guideReadingPattern', 'fr')).toBe('Publié le 22 septembre 2026');
    expect(guideDatesLine('guideReadingPattern', 'en')).toBe('Published 22 September 2026');
  });

  it('ajoute la mise à jour quand elle diffère de la publication', () => {
    expect(guideDatesLine('guideReadingChart', 'fr')).toBe(
      'Publié le 22 septembre 2026 · mis à jour le 28 septembre 2026',
    );
  });

  it('ne date jamais une mise à jour avant la publication', () => {
    for (const { published, modified } of Object.values(GUIDE_DATES)) {
      expect(modified >= published).toBe(true);
    }
  });
});

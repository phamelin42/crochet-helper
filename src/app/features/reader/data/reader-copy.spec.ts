import { describe, expect, it } from 'vitest';
import { FR as UI_FR } from '../../../core/i18n/translations';
import { READER_COPY } from './reader-copy';

/**
 * « Pattern » ne se dit jamais en français : la lectrice lit un « patron »
 * (audit UX-5). « Pattern Reader », le nom du site, est la seule exception.
 */
function frenchStrings(): readonly string[] {
  return [...Object.values(READER_COPY.fr), ...Object.values(UI_FR)].filter(
    (value): value is string => typeof value === 'string',
  );
}

describe('Français sans anglicisme « pattern »', () => {
  for (const value of frenchStrings()) {
    it(`« ${value.slice(0, 40)}… » ne contient pas « pattern »`, () => {
      const withoutBrand = value.replaceAll('Pattern Reader', '');
      expect(withoutBrand).not.toMatch(/\bpattern\b/i);
    });
  }
});

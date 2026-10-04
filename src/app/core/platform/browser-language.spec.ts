import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserLocale } from './browser-language';

describe('browserLocale', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    [['fr-FR', 'fr', 'en-US'], 'fr'],
    [['fr-CA'], 'fr'],
    [['en-GB', 'fr'], 'en'],
    [['de-DE', 'fr-FR', 'en'], 'fr'],
    [['de-DE', 'es'], null],
    [[], null],
  ] as const)('%j → %s', (languages, expected) => {
    vi.stubGlobal('navigator', { languages, language: languages[0] ?? '' });
    expect(browserLocale()).toBe(expected);
  });
});

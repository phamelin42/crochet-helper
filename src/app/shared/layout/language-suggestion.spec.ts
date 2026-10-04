import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nService } from '../../core/i18n/i18n.service';
import { Locale } from '../../core/i18n/locale';
import { StylesheetService } from '../../core/platform/stylesheet.service';
import { SeoService } from '../../core/seo/seo.service';
import { LanguageSuggestion, SUGGESTION_DISMISSED_KEY } from './language-suggestion';

describe('LanguageSuggestion', () => {
  beforeEach(() => {
    localStorage.clear();
    configure();
  });

  /** jsdom ne charge pas les feuilles : celle du bandeau est tenue pour appliquée. */
  function configure() {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: StylesheetService, useValue: { load: () => Promise.resolve() } },
      ],
    });
  }
  afterEach(() => localStorage.clear());

  async function setup(page: Locale, browser: Locale | null) {
    TestBed.inject(I18nService).setLocale(page);
    TestBed.inject(SeoService).apply({
      title: 'Glossary',
      description: '…',
      path: { en: '/glossary', fr: '/glossaire' },
      locale: page,
    });
    const fixture = TestBed.createComponent(LanguageSuggestion);
    fixture.componentRef.setInput('target', browser);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    return { fixture, host, link: () => host.querySelector('a') };
  }

  it('navigateur en français sur une page anglaise : propose la même page en français', async () => {
    const { host, link } = await setup('en', 'fr');
    expect(host.querySelector('.lang-suggest')?.getAttribute('lang')).toBe('fr');
    expect(host.textContent).toContain('Ce site existe en français.');
    expect(link()?.getAttribute('href')).toBe('/fr/glossaire');
  });

  it('navigateur en anglais sur une page française : propose la version anglaise', async () => {
    const { host, link } = await setup('fr', 'en');
    expect(host.textContent).toContain('This site is also in English.');
    expect(link()?.getAttribute('href')).toBe('/glossary');
  });

  it.each([
    ['en', 'en'],
    ['fr', 'fr'],
    ['en', null],
  ] as const)('page %s, navigateur %s : rien à proposer', async (page, browser) => {
    const { host } = await setup(page, browser);
    expect(host.querySelector('.lang-suggest')).toBeNull();
  });

  it('« Rester en anglais » ferme le bandeau et ne le remontre plus', async () => {
    const { fixture, host } = await setup('en', 'fr');
    host.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(host.querySelector('.lang-suggest')).toBeNull();
    expect(localStorage.getItem(SUGGESTION_DISMISSED_KEY)).toBe('true');

    TestBed.resetTestingModule();
    configure();
    expect((await setup('en', 'fr')).host.querySelector('.lang-suggest')).toBeNull();
  });
});

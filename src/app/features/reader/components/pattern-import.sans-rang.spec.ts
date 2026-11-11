import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { Locale } from '../../../core/i18n/locale';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { AI_FORMAT_URL_TOKEN } from '../data/ai-format';
import { PatternImport } from './pattern-import';

const NBSP = ' ';
const PROSE = 'Chain 20. Single crochet in each stitch across. Fasten off and weave in the ends.';

/** Ce que la lectrice doit pouvoir faire après l'échec : une issue, dite en toutes lettres. */
const ISSUE: Record<Locale, { ai: string; link: string; href: string }> = {
  fr: {
    ai: `Cochez «${NBSP}Remettre en forme avec une IA (Claude)${NBSP}» ci-dessus`,
    link: `Voir «${NBSP}Préparer un patron${NBSP}»`,
    href: '/fr/bien-formater-son-patron',
  },
  en: {
    ai: 'Tick “Tidy up with AI (Claude)” above',
    link: 'See “Prepare a pattern”',
    href: '/format-your-pattern',
  },
};

describe('PatternImport : patron sans rang numéroté', () => {
  beforeEach(() => {
    installFakeIndexedDb();
    localStorage.clear();
  });
  afterEach(() => {
    uninstallFakeIndexedDb();
    localStorage.clear();
  });

  async function fail(locale: Locale, aiUrl: string) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AnalyticsService, useValue: { track: vi.fn() } },
        { provide: AI_FORMAT_URL_TOKEN, useValue: aiUrl },
      ],
    });
    TestBed.inject(I18nService).setLocale(locale);
    const fixture = TestBed.createComponent(PatternImport);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    (host.querySelector('textarea') as HTMLTextAreaElement).value = PROSE;
    (host.querySelector('.import-actions button') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    return host;
  }

  for (const locale of ['fr', 'en'] as const) {
    it(`en ${locale}, l'erreur est une alerte qui propose la mise en forme et la page dédiée`, async () => {
      const host = await fail(locale, 'https://worker.test/mise-en-forme');

      const alert = host.querySelector('[role="alert"]');
      expect(alert, 'alerte absente').toBeTruthy();
      expect(alert?.textContent).toContain(ISSUE[locale].ai);
      const link = alert?.querySelector('a');
      expect(link?.textContent?.trim()).toBe(ISSUE[locale].link);
      expect(link?.getAttribute('href')).toBe(ISSUE[locale].href);
    });

    it(`en ${locale}, sans mise en forme par IA, l'erreur ne renvoie pas à une case absente`, async () => {
      const host = await fail(locale, '');

      const alert = host.querySelector('[role="alert"]');
      expect(alert?.textContent).not.toContain(ISSUE[locale].ai);
      expect(alert?.querySelector('a')?.getAttribute('href')).toBe(ISSUE[locale].href);
    });
  }
});

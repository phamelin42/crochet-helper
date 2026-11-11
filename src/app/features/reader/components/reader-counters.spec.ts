import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { Locale } from '../../../core/i18n/locale';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { ReaderStore } from '../state/reader-store';
import { ReaderCounters } from './reader-counters';

/** Ce qu'un lecteur d'écran annonce pour chaque bouton des compteurs, par langue. */
const NAMES: Record<
  Locale,
  { remove: string; add: string; resetReps: string; resetTimer: string }
> = {
  fr: {
    remove: 'Retirer une répétition',
    add: 'Ajouter une répétition',
    resetReps: 'Remettre à zéro les répétitions',
    resetTimer: 'Remettre à zéro le chronomètre',
  },
  en: {
    remove: 'Remove one repeat',
    add: 'Add one repeat',
    resetReps: 'Reset repeats',
    resetTimer: 'Reset the timer',
  },
};

function accessibleName(button: HTMLButtonElement): string {
  return (button.getAttribute('aria-label') ?? button.textContent ?? '').trim();
}

describe('ReaderCounters : noms des boutons', () => {
  beforeEach(() => {
    installFakeIndexedDb();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AnalyticsService, useValue: { track: vi.fn() } },
      ],
    });
  });

  afterEach(() => {
    uninstallFakeIndexedDb();
    localStorage.clear();
  });

  for (const locale of ['fr', 'en'] as const) {
    it(`en ${locale}, chaque bouton se nomme par son action, sans doublon`, async () => {
      TestBed.inject(I18nService).setLocale(locale);
      const store = TestBed.inject(ReaderStore);
      TestBed.tick();
      await store.initialize();
      store.load('Rang 1 : 6 ms\nRang 2 : 6 aug');
      const fixture = TestBed.createComponent(ReaderCounters);
      fixture.detectChanges();

      const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];
      const names = buttons.map(accessibleName);
      const expected = NAMES[locale];

      expect(names).toContain(expected.remove);
      expect(names).toContain(expected.add);
      expect(names).toContain(expected.resetReps);
      expect(names).toContain(expected.resetTimer);
      expect(new Set(names).size, `noms en double : ${names.join(' | ')}`).toBe(names.length);
      expect(names).not.toContain('−');
      expect(names).not.toContain('+');
    });

    it(`en ${locale}, le nom d'un bouton à texte reprend son texte visible`, async () => {
      TestBed.inject(I18nService).setLocale(locale);
      const store = TestBed.inject(ReaderStore);
      TestBed.tick();
      await store.initialize();
      store.load('Rang 1 : 6 ms\nRang 2 : 6 aug');
      const fixture = TestBed.createComponent(ReaderCounters);
      fixture.detectChanges();

      const visible = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].filter(
        (b) => (b.textContent ?? '').trim() !== '',
      );
      expect(visible.length).toBe(2);
      for (const button of visible) {
        expect(accessibleName(button).toLowerCase()).toContain(
          (button.textContent ?? '').trim().toLowerCase(),
        );
      }
    });
  }
});

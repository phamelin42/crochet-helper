import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import type { Locale } from '../../../core/i18n/locale';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { ObjectUrlService } from '../../../core/platform/object-url.service';
import { FINISHED_PHOTO_PREPARER, ReaderStore } from '../state/reader-store';
import ProjectsPage from './projects-page';

const NBSP = ' ';

/** Ce qu'un lecteur d'écran annonce, par langue : l'action puis le projet visé. */
const EXPECTED: Record<Locale, readonly string[]> = {
  fr: [
    `Reprendre le projet «${NBSP}Petit sapin${NBSP}»`,
    `Renommer le projet «${NBSP}Petit sapin${NBSP}»`,
    `Supprimer le projet «${NBSP}Petit sapin${NBSP}»`,
    `Reprendre le projet «${NBSP}Bonnet rose${NBSP}»`,
    `Renommer le projet «${NBSP}Bonnet rose${NBSP}»`,
    `Supprimer le projet «${NBSP}Bonnet rose${NBSP}»`,
  ],
  en: [
    'Resume project “Petit sapin”',
    'Rename project “Petit sapin”',
    'Delete project “Petit sapin”',
    'Resume project “Bonnet rose”',
    'Rename project “Bonnet rose”',
    'Delete project “Bonnet rose”',
  ],
};

describe('ProjectsPage : noms des boutons de chaque carte', () => {
  beforeEach(() => {
    installFakeIndexedDb();
    localStorage.clear();
  });

  afterEach(() => {
    uninstallFakeIndexedDb();
    localStorage.clear();
  });

  for (const locale of ['fr', 'en'] as const) {
    it(`en ${locale}, chaque bouton nomme son action et son projet, sans doublon`, async () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: AnalyticsService, useValue: { track: vi.fn() } },
          provideRouter([]),
          { provide: ActivatedRoute, useValue: { snapshot: { data: { locale } } } },
        ],
      });
      const store = TestBed.inject(ReaderStore);
      TestBed.tick();
      await store.initialize();
      store.load('Rang 1 : 6 ms');
      await vi.waitFor(() => expect(store.projects().length).toBe(1));
      store.load('Rang 1 : 8 ms');
      await vi.waitFor(() => expect(store.projects().length).toBe(2));
      const [first, second] = store.sortedProjects();
      await store.renameProject(first.id, 'Petit sapin');
      await store.renameProject(second.id, 'Bonnet rose');
      const fixture = TestBed.createComponent(ProjectsPage);
      fixture.detectChanges();

      const names = [...(fixture.nativeElement as HTMLElement).querySelectorAll('li.card button')]
        .map((button) => (button.getAttribute('aria-label') ?? button.textContent ?? '').trim())
        .sort();

      expect(names).toEqual([...EXPECTED[locale]].sort());
    });
  }
});

describe('ProjectsPage : projets terminés', () => {
  beforeEach(() => {
    installFakeIndexedDb();
    localStorage.clear();
  });

  afterEach(() => {
    uninstallFakeIndexedDb();
    localStorage.clear();
  });

  const WORDS = { fr: 'Terminé', en: 'Finished' } as const;

  for (const locale of ['fr', 'en'] as const) {
    it(`en ${locale}, seul un projet terminé porte la pastille (texte et coche), avec sa photo`, async () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: AnalyticsService, useValue: { track: vi.fn() } },
          {
            provide: ObjectUrlService,
            useValue: { create: () => 'blob:vignette', revoke: vi.fn() },
          },
          {
            provide: FINISHED_PHOTO_PREPARER,
            useValue: async () => ({
              ok: true,
              photo: { blob: new Blob(['x'], { type: 'image/jpeg' }), width: 8, height: 6 },
            }),
          },
          provideRouter([]),
          { provide: ActivatedRoute, useValue: { snapshot: { data: { locale } } } },
        ],
      });
      const store = TestBed.inject(ReaderStore);
      TestBed.tick();
      await store.initialize();
      store.load('Rang 1 : 6 ms');
      await vi.waitFor(() => expect(store.projects().length).toBe(1));
      store.advance();
      await store.setFinishedPhoto(new File(['x'], 'a.jpg', { type: 'image/jpeg' }));
      await vi.waitFor(() => expect(store.projects()[0]?.finishedPhoto).toBe(true));
      store.load('Rang 1 : 8 ms');
      await vi.waitFor(() => expect(store.projects().length).toBe(2));
      const fixture = TestBed.createComponent(ProjectsPage);
      fixture.detectChanges();
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect((fixture.nativeElement as HTMLElement).querySelectorAll('li.card img')).toHaveLength(
          1,
        );
      });

      const cards = [...(fixture.nativeElement as HTMLElement).querySelectorAll('li.card')];
      const finished = cards.filter((card) => card.querySelector('.tag'));
      expect(finished).toHaveLength(1);
      expect(finished[0].querySelector('.tag')?.textContent?.trim()).toBe(WORDS[locale]);
      expect(finished[0].querySelector('.tag svg')).toBeTruthy();
      expect(finished[0].querySelector('img')?.getAttribute('src')).toBe('blob:vignette');
      expect(finished[0].querySelector('img')?.getAttribute('alt')).toBeTruthy();
    });
  }
});

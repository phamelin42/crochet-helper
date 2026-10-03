import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { DefaultView, DisplayPrefsService } from '../../../core/platform/display-prefs.service';
import { ProjectStoreService } from '../../../core/storage/project-store.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { Project } from '../data/project.model';
import { PDF_EXTRACTOR, ReaderStore } from './reader-store';

const DRAWABLE = ['Patron', 'Round 1: 6 sc (6)', 'Round 2: 12 sc (12)'].join('\n');
const TEXT_ONLY = ['Patron', 'Round 1: weave in the end', 'Round 2: fasten off'].join('\n');
const OTHER = ['Autre', 'Round 1: 8 sc (8)'].join('\n');

type Origin = 'saisie' | 'pdf' | 'diagramme' | 'exemple';
const ORIGINS: readonly Origin[] = ['saisie', 'pdf', 'diagramme', 'exemple'];
const PREFS: readonly DefaultView[] = ['ask', 'text', 'chart'];

describe('ReaderStore — choix d’affichage à l’import', () => {
  let track: ReturnType<typeof vi.fn>;
  let pdfText = '';

  beforeEach(() => {
    installFakeIndexedDb();
    track = vi.fn();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AnalyticsService, useValue: { track } },
        {
          provide: PDF_EXTRACTOR,
          useValue: async () => ({
            pages: [{ lines: pdfText.split('\n'), images: [] }],
            truncated: false,
          }),
        },
      ],
    });
  });

  afterEach(() => {
    uninstallFakeIndexedDb();
    localStorage.clear();
  });

  async function open(origin: Origin, text: string) {
    const store = TestBed.inject(ReaderStore);
    // Le store s'initialise seul après le premier rendu : l'appeler en plus le
    // ferait deux fois, la seconde réhydratant le projet et effaçant la question.
    TestBed.tick();
    await vi.waitFor(() => expect(store.restored()).toBe(true));
    if (origin === 'saisie') store.load(text);
    else if (origin === 'exemple') store.loadDemo();
    else if (origin === 'diagramme') await store.openFromChart(text, []);
    else {
      pdfText = text;
      await store.importPdf(new File(['%PDF-1.7'], 'a.pdf', { type: 'application/pdf' }));
    }
    return store;
  }

  /** Relit le projet tel qu'IndexedDB le contient, une fois l'effet d'écriture passé. */
  async function expectSavedView(id: string, expected: 'text' | 'chart') {
    const db = TestBed.inject(ProjectStoreService);
    TestBed.tick();
    await vi.waitFor(async () => {
      const project = (await db.list<Project>()).find((p) => p.id === id);
      expect(project?.view ?? 'text').toBe(expected);
    });
  }

  for (const origin of ORIGINS) {
    for (const pref of PREFS) {
      it(`${origin}, préférence « ${pref} » : question et affichage d’un patron dessinable`, async () => {
        TestBed.inject(DisplayPrefsService).setDefaultView(pref);
        const store = await open(origin, origin === 'exemple' ? '' : DRAWABLE);
        const id = store.currentId()!;
        await vi.waitFor(() => expect(store.pieceChart()?.drawable).toBeGreaterThan(0));

        if (pref === 'ask') {
          await vi.waitFor(() => expect(store.viewChoice()).toBe(id));
          expect(store.view()).toBe('text');
        } else {
          await vi.waitFor(() => expect(store.view()).toBe(pref));
          expect(store.viewChoice()).toBeNull();
        }
        const expected = pref === 'chart' ? 'chart' : 'text';
        await expectSavedView(id, expected);
      });
    }
  }

  for (const pref of PREFS) {
    it(`préférence « ${pref} » : un patron sans étape dessinable n’est jamais questionné`, async () => {
      TestBed.inject(DisplayPrefsService).setDefaultView(pref);
      const store = await open('saisie', TEXT_ONLY);
      await vi.waitFor(() => expect(store.pieceChart()).not.toBeNull());
      // La phrase qui dit pourquoi n'apparaît qu'avec la préférence « diagramme ».
      await vi.waitFor(() => expect(store.viewFallback()).toBe(pref === 'chart'));
      expect(store.viewChoice()).toBeNull();
      expect(store.view()).toBe('text');
    });
  }

  it('« Retenir » coché écrit la préférence ; non coché la laisse inchangée', async () => {
    const prefs = TestBed.inject(DisplayPrefsService);
    const store = await open('saisie', DRAWABLE);
    await vi.waitFor(() => expect(store.viewChoice()).not.toBeNull());
    store.chooseView('chart', false);
    expect(prefs.defaultView()).toBe('ask');
    expect(localStorage.getItem('fil.defaultView')).toBeNull();
    expect(store.view()).toBe('chart');

    store.load(OTHER);
    await vi.waitFor(() => expect(store.viewChoice()).not.toBeNull());
    expect(store.view()).toBe('text');
    store.chooseView('chart', true);
    expect(prefs.defaultView()).toBe('chart');
    expect(JSON.parse(localStorage.getItem('fil.defaultView')!)).toBe('chart');
    expect(track).toHaveBeenCalledWith('view_chosen', { view: 'chart', remembered: 'yes' });
  });

  it('fermer sans choisir laisse le texte et ne retient rien', async () => {
    const store = await open('saisie', DRAWABLE);
    await vi.waitFor(() => expect(store.viewChoice()).not.toBeNull());
    store.dismissViewChoice();
    expect(store.view()).toBe('text');
    expect(TestBed.inject(DisplayPrefsService).defaultView()).toBe('ask');
    expect(track).not.toHaveBeenCalledWith('view_chosen', expect.anything());
  });

  it('la question ne touche jamais le projet actif précédent', async () => {
    const store = await open('saisie', DRAWABLE);
    await vi.waitFor(() => expect(store.viewChoice()).not.toBeNull());
    store.chooseView('chart', false);
    const first = store.currentId()!;
    await expectSavedView(first, 'chart');

    store.load(OTHER);
    const second = store.currentId()!;
    await vi.waitFor(() => expect(store.viewChoice()).toBe(second));
    store.chooseView('text', false);
    await expectSavedView(second, 'text');
    await expectSavedView(first, 'chart');
  });
});

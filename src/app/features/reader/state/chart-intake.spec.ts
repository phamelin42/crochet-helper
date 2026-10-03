import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { ProjectStoreService } from '../../../core/storage/project-store.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import type { Project, ProjectImage } from '../data/project.model';
import type { Recognition } from '../data/chart-recognition';
import type { RenderedPage } from '../data/pdf-extract';
import {
  CHART_RECOGNIZER,
  ChartIntake,
  DATA_URL_READER,
  IMAGE_RESIZER,
  MAX_CHART_FILE_BYTES,
  MAX_CHART_PDF_BYTES,
  PDF_PAGE_RENDERER,
} from './chart-intake';
import { ReaderStore } from './reader-store';

const RESIZED = {
  blob: new Blob([new Uint8Array([9])], { type: 'image/jpeg' }),
  width: 2400,
  height: 1600,
};
const page = (number: number): RenderedPage => ({
  number,
  blob: new Blob([new Uint8Array([number])], { type: 'image/jpeg' }),
  width: 1200,
  height: 1700,
});
const file = (type: string, size = 10) => {
  const f = new File(['x'], 'f', { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

const READ: Recognition = {
  rounds: [
    { kind: 'round', groups: [{ tokens: [{ symbol: 'sc', count: 6 }], repeat: 1 }] },
    { kind: 'round', groups: [{ tokens: [{ symbol: 'sc-inc', count: 6 }], repeat: 1 }] },
  ],
  symbols: 12,
  uncertain: 1,
};
const TEXT = 'Diagramme 1\nTour 1 : 6 ms (6)\nTour 2 : 6 aug (12)';

describe('ChartIntake', () => {
  let resize: ReturnType<typeof vi.fn>;
  let recognizer: ReturnType<typeof vi.fn>;
  let track: ReturnType<typeof vi.fn>;
  let render: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    installFakeIndexedDb();
    localStorage.clear();
    resize = vi.fn(async () => RESIZED);
    track = vi.fn();
    render = vi.fn(async () => ({ pages: [1, 2, 3].map(page), total: 3 }));
    recognizer = vi.fn(async () => READ);
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AnalyticsService, useValue: { track } },
        { provide: IMAGE_RESIZER, useValue: resize },
        { provide: DATA_URL_READER, useValue: async () => 'data:image/png;base64,AAAA' },
        { provide: PDF_PAGE_RENDERER, useValue: render },
        { provide: CHART_RECOGNIZER, useValue: recognizer },
      ],
    });
  });

  afterEach(() => {
    uninstallFakeIndexedDb();
    localStorage.clear();
  });

  async function setup() {
    const store = TestBed.inject(ReaderStore);
    await store.initialize();
    store.load('Rang 1 : 6 ms\nRang 2 : 12 ms');
    return { store, intake: TestBed.inject(ChartIntake) };
  }

  it('une image collée ou déposée devient la couverture, avec ou sans projet ouvert', async () => {
    const intake = TestBed.inject(ChartIntake);
    const store = TestBed.inject(ReaderStore);
    await store.initialize();

    await intake.receive(file('image/png'));
    expect(store.image()).toBe('data:image/png;base64,AAAA');

    store.load('Rang 1 : 6 ms\nRang 2 : 12 ms');
    store.setImage('data:image/png;base64,ANCIENNE');
    await intake.receive(file('image/png'));
    expect(store.image()).toBe('data:image/png;base64,AAAA');
    expect(resize).not.toHaveBeenCalled();
  });

  describe('ouvrir un diagramme comme patron', () => {
    async function fresh() {
      const store = TestBed.inject(ReaderStore);
      await store.initialize();
      return { store, intake: TestBed.inject(ChartIntake) };
    }

    it('fonctionne sans patron chargé : le diagramme est lu et proposé à la relecture', async () => {
      const { store, intake } = await fresh();
      const image = file('image/png');

      await intake.open(image);

      expect(recognizer).toHaveBeenCalledWith(image);
      expect(intake.opening()?.recognition).toEqual(READ);
      expect(intake.opening()?.charts).toEqual([RESIZED]);
      expect(track).toHaveBeenCalledWith('chart_recognized', { rounds: 2, symbols: 10 });
      // Rien n'est écrit avant que la lectrice ait relu.
      expect(store.currentId()).toBeNull();
      expect(await TestBed.inject(ProjectStoreService).list()).toEqual([]);
    });

    it('le texte relu ouvre un nouveau projet découpé en étapes, sans fichier joint', async () => {
      const { store, intake } = await fresh();
      await intake.open(file('image/png'));

      await intake.confirmOpening(TEXT);

      expect(intake.opening()).toBeNull();
      expect(store.total()).toBe(2);
      expect(store.step()?.body).toContain('6 ms');
      const db = TestBed.inject(ProjectStoreService);
      await vi.waitFor(async () => {
        const [saved] = await db.list<Project>();
        expect(saved.source).toBe(TEXT);
        expect(saved.chartCount).toBeUndefined();
      });
      const [saved] = await db.list<Project>();
      expect(await db.getFiles<ProjectImage>([`${saved.id}:chart:1`])).toEqual([undefined]);
    });

    it('n’écrase jamais le projet actif : il reste intact dans la liste', async () => {
      const { store, intake } = await setup();
      const before = store.currentId();
      TestBed.tick();
      const db = TestBed.inject(ProjectStoreService);
      await vi.waitFor(async () => expect(await db.list()).toHaveLength(1));
      await intake.open(file('image/png'));

      await intake.confirmOpening(TEXT);

      expect(store.currentId()).not.toBe(before);
      TestBed.tick();
      await vi.waitFor(async () => {
        const projects = await db.list<Project>();
        expect(projects).toHaveLength(2);
        const old = projects.find((p) => p.id === before);
        expect(old?.source).toBe('Rang 1 : 6 ms\nRang 2 : 12 ms');
      });
    });

    it('annuler la relecture n’enregistre rien', async () => {
      const { store, intake } = await fresh();
      await intake.open(file('image/png'));

      intake.cancelOpening();
      await intake.confirmOpening(TEXT);

      expect(store.currentId()).toBeNull();
      expect(await TestBed.inject(ProjectStoreService).list()).toEqual([]);
    });

    it('n’écrase pas non plus le projet actif quand le texte relu est le même', async () => {
      const { store, intake } = await fresh();
      store.load(TEXT);
      store.move(1);
      const before = store.currentId();
      TestBed.tick();
      const db = TestBed.inject(ProjectStoreService);
      await vi.waitFor(async () => expect((await db.list<Project>())[0]?.stepIndex).toBe(1));

      await intake.open(file('image/png'));
      await intake.confirmOpening(TEXT);
      TestBed.tick();

      expect(store.currentId()).not.toBe(before);
      await vi.waitFor(async () => {
        const projects = await db.list<Project>();
        expect(projects).toHaveLength(2);
        expect(projects.find((p) => p.id === before)?.stepIndex).toBe(1);
      });
    });

    it('dit qu’un PDF illisible l’est', async () => {
      const { intake } = await fresh();
      render.mockRejectedValueOnce(new Error('pdf.js'));

      await intake.open(file('application/pdf'));

      expect(intake.error()).toBe('pdf');
      expect(intake.pages()).toBeNull();
    });

    it('une lecture qui échoue ouvre un brouillon vide plutôt qu’une erreur', async () => {
      const { intake } = await fresh();
      recognizer.mockRejectedValueOnce(new Error('canvas'));

      await intake.open(file('image/png'));

      expect(intake.error()).toBeNull();
      expect(intake.opening()?.recognition.rounds).toEqual([]);
    });

    it('refuse un fichier d’un autre type, trop lourd ou illisible, sans rien lire', async () => {
      const { intake } = await fresh();
      const cases: [File, string][] = [
        [file('image/gif'), 'format'],
        [file('image/png', MAX_CHART_FILE_BYTES + 1), 'lourd'],
        [file('application/pdf', MAX_CHART_PDF_BYTES + 1), 'lourd'],
      ];
      for (const [f, error] of cases) {
        await intake.open(f);
        expect(intake.error()).toBe(error);
      }
      resize.mockResolvedValueOnce(null);
      await intake.open(file('image/png'));
      expect(intake.error()).toBe('illisible');

      expect(recognizer).not.toHaveBeenCalled();
      expect(intake.opening()).toBeNull();
    });

    it('un PDF : seules les pages cochées sont lues, dans l’ordre du PDF', async () => {
      const { store, intake } = await setup();
      const before = store.currentId();

      await intake.open(file('application/pdf'));
      await intake.addPages([2, 3]);

      expect(recognizer).toHaveBeenCalledWith(page(2).blob);
      expect(intake.opening()?.charts.map((c) => c.width)).toEqual([1200, 1200]);
      // Rien n'est ouvert avant la relecture.
      expect(store.currentId()).toBe(before);
    });
  });
});

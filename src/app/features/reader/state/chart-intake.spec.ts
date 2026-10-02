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

  it('range une image choisie comme diagramme, réduite, avec la source « image »', async () => {
    const { store, intake } = await setup();

    await intake.submit(file('image/png'));

    expect(resize).toHaveBeenCalledTimes(1);
    expect(store.chartCount()).toBe(1);
    expect(intake.error()).toBeNull();
    expect(track).toHaveBeenCalledWith('chart_added', { source: 'image' });
  });

  it('refuse un fichier d’un autre type, ou de plus de 10 Mo, sans rien enregistrer', async () => {
    const { store, intake } = await setup();

    await intake.submit(file('image/gif'));
    expect(intake.error()).toBe('format');

    await intake.submit(file('image/png', MAX_CHART_FILE_BYTES + 1));
    expect(intake.error()).toBe('lourd');

    await intake.submit(file('application/pdf', MAX_CHART_PDF_BYTES + 1));
    expect(intake.error()).toBe('lourd');

    expect(resize).not.toHaveBeenCalled();
    expect(store.chartCount()).toBe(0);
  });

  it('dit qu’une image illisible l’est, et n’enregistre rien', async () => {
    const { store, intake } = await setup();
    resize.mockResolvedValueOnce(null);

    await intake.submit(file('image/png'));

    expect(intake.error()).toBe('illisible');
    expect(store.chartCount()).toBe(0);
  });

  it('demande « couverture ou diagramme ? » pour une image collée, sans rien remplacer avant la réponse', async () => {
    const { store, intake } = await setup();
    store.setImage('data:image/png;base64,ANCIENNE');

    await intake.receive(file('image/png'));

    expect(intake.question()).not.toBeNull();
    expect(store.image()).toBe('data:image/png;base64,ANCIENNE');
    expect(store.chartCount()).toBe(0);
  });

  it('la réponse « diagramme » l’ajoute au projet, la couverture reste', async () => {
    const { store, intake } = await setup();
    store.setImage('data:image/png;base64,ANCIENNE');
    await intake.receive(file('image/png'));

    await intake.answerChart();

    expect(intake.question()).toBeNull();
    expect(store.chartCount()).toBe(1);
    expect(store.image()).toBe('data:image/png;base64,ANCIENNE');
  });

  it('la réponse « couverture » remplace la couverture, aucun diagramme', async () => {
    const { store, intake } = await setup();
    await intake.receive(file('image/png'));

    await intake.answerCover();

    expect(store.image()).toBe('data:image/png;base64,AAAA');
    expect(store.chartCount()).toBe(0);
  });

  it('annuler la question ne change rien', async () => {
    const { store, intake } = await setup();
    await intake.receive(file('image/png'));

    intake.cancelQuestion();

    expect(intake.question()).toBeNull();
    expect(store.image()).toBe('');
    expect(store.chartCount()).toBe(0);
  });

  it('sans projet, une image collée reste la couverture, comme avant', async () => {
    const store = TestBed.inject(ReaderStore);
    await store.initialize();
    const intake = TestBed.inject(ChartIntake);

    await intake.receive(file('image/png'));

    expect(intake.question()).toBeNull();
    expect(store.image()).toBe('data:image/png;base64,AAAA');
  });

  it('propose les pages d’un PDF, et n’enregistre que celles qu’on a cochées, dans l’ordre', async () => {
    const { store, intake } = await setup();

    await intake.submit(file('application/pdf'));
    expect(intake.pages()?.map((p) => p.number)).toEqual([1, 2, 3]);
    expect(store.chartCount()).toBe(0);

    await intake.addPages([3, 1]);

    expect(intake.pages()).toBeNull();
    expect(store.chartCount()).toBe(2);
    expect(track).toHaveBeenCalledWith('chart_added', { source: 'pdf' });
  });

  it('dit qu’un PDF illisible l’est', async () => {
    const { intake } = await setup();
    render.mockRejectedValueOnce(new Error('pdf.js'));

    await intake.submit(file('application/pdf'));

    expect(intake.error()).toBe('pdf');
    expect(intake.pages()).toBeNull();
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

    it('le texte relu ouvre un nouveau projet découpé en étapes, avec son diagramme enregistré', async () => {
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
        expect(saved.chartCount).toBe(1);
        expect(saved.charts).toEqual({ 0: 1 });
      });
      const [saved] = await db.list<Project>();
      const [chart] = await db.getFiles<ProjectImage>([`${saved.id}:chart:1`]);
      expect(chart?.blob).toBe(RESIZED.blob);
      expect(track).toHaveBeenCalledWith('chart_added', { source: 'diagramme' });
    });

    it('n’écrase jamais le projet actif : il reste intact dans la liste', async () => {
      const { store, intake } = await setup();
      const before = store.currentId();
      await intake.submit(file('image/png'));
      await intake.open(file('image/png'));

      await intake.confirmOpening(TEXT);

      expect(store.currentId()).not.toBe(before);
      const db = TestBed.inject(ProjectStoreService);
      await vi.waitFor(async () => {
        const projects = await db.list<Project>();
        expect(projects).toHaveLength(2);
        const old = projects.find((p) => p.id === before);
        expect(old?.source).toBe('Rang 1 : 6 ms\nRang 2 : 12 ms');
        expect(old?.chartCount).toBe(1);
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

    it('un PDF : les pages cochées sont lues (la première) et gardées pour le nouveau projet', async () => {
      const { store, intake } = await setup();

      await intake.open(file('application/pdf'));
      await intake.addPages([2, 3]);

      expect(recognizer).toHaveBeenCalledWith(page(2).blob);
      expect(intake.opening()?.charts.map((c) => c.width)).toEqual([1200, 1200]);
      // Le projet actif ne reçoit rien.
      expect(store.chartCount()).toBe(0);
    });
  });
});

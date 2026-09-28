import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import type { RenderedPage } from '../data/pdf-extract';
import {
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

describe('ChartIntake', () => {
  let resize: ReturnType<typeof vi.fn>;
  let track: ReturnType<typeof vi.fn>;
  let render: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    installFakeIndexedDb();
    localStorage.clear();
    resize = vi.fn(async () => RESIZED);
    track = vi.fn();
    render = vi.fn(async () => ({ pages: [1, 2, 3].map(page), total: 3 }));
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AnalyticsService, useValue: { track } },
        { provide: IMAGE_RESIZER, useValue: resize },
        { provide: DATA_URL_READER, useValue: async () => 'data:image/png;base64,AAAA' },
        { provide: PDF_PAGE_RENDERER, useValue: render },
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
});

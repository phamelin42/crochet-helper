import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { ProjectStoreService } from '../../../core/storage/project-store.service';
import {
  FakeControl,
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { parseBackup } from '../data/project-backup';
import { MAX_CHARTS, Project, ProjectImage } from '../data/project.model';
import { ReaderStore } from './reader-store';

/** Deux pièces : le diagramme se range à l'une ou à l'autre. */
const TWO_PIECES = ['Patron', 'Piece A', 'Round 1: 6 sc (6)', 'Piece B', 'Round 1: 6 sc (6)'].join(
  '\n',
);

const chart = (bytes: number[]) => ({
  blob: new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' }),
  width: 1200,
  height: 800,
});
const bytesOf = async (blob: Blob | undefined) =>
  Array.from(new Uint8Array(await blob!.arrayBuffer()));

describe('ReaderStore — diagrammes', () => {
  let track: ReturnType<typeof vi.fn>;
  let idb: FakeControl;

  const configure = () =>
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AnalyticsService, useValue: { track } },
      ],
    });

  /** Un projet à deux pièces, déjà écrit en base. */
  async function openProject() {
    const store = TestBed.inject(ReaderStore);
    const db = TestBed.inject(ProjectStoreService);
    await store.initialize();
    store.load(TWO_PIECES);
    TestBed.tick();
    await vi.waitFor(async () => expect(await db.list()).toHaveLength(1));
    return { store, db, id: store.currentId()! };
  }

  beforeEach(() => {
    idb = installFakeIndexedDb();
    track = vi.fn();
    localStorage.clear();
    configure();
  });

  afterEach(() => {
    uninstallFakeIndexedDb();
    localStorage.clear();
  });

  it('enregistre un diagramme avec kind « chart » et l’épingle à la pièce en cours', async () => {
    const { store, db, id } = await openProject();
    store.selectPiece(1);

    await expect(store.addCharts([chart([1, 2, 3])], 'image')).resolves.toBe(true);

    expect(store.chartCount()).toBe(1);
    expect(store.charts()).toEqual({ 1: 1 });
    const [saved] = await db.list<Project>();
    expect(saved.chartCount).toBe(1);
    expect(saved.charts).toEqual({ 1: 1 });
    const [file] = await db.getFiles<ProjectImage>([`${id}:chart:1`]);
    expect(file).toMatchObject({ projectId: id, n: 1, kind: 'chart', width: 1200, height: 800 });
    expect(await bytesOf(file?.blob)).toEqual([1, 2, 3]);
    expect(track).toHaveBeenCalledWith('chart_added', { source: 'image' });
  });

  it('un second diagramme ne prend pas la pièce déjà servie', async () => {
    const { store } = await openProject();
    await store.addCharts([chart([1])], 'image');

    await store.addCharts([chart([2]), chart([3])], 'pdf');

    expect(store.chartCount()).toBe(3);
    expect(store.charts()).toEqual({ 0: 1 });
    expect(track).toHaveBeenCalledWith('chart_added', { source: 'pdf' });
  });

  it('garde l’épingle après rechargement : elle est relue depuis IndexedDB', async () => {
    const { store, id } = await openProject();
    await store.addCharts([chart([1]), chart([2])], 'image');
    store.pinChart(1, 2);
    const db = TestBed.inject(ProjectStoreService);
    // L'effet de persistance écrit après la commande : on attend l'écriture.
    TestBed.tick();
    await vi.waitFor(async () => {
      const [saved] = await db.list<Project>();
      expect(saved.charts).toEqual({ 0: 1, 1: 2 });
    });

    TestBed.resetTestingModule();
    configure();
    const fresh = TestBed.inject(ReaderStore);
    await fresh.initialize();

    expect(fresh.currentId()).toBe(id);
    expect(fresh.charts()).toEqual({ 0: 1, 1: 2 });
    await vi.waitFor(() => expect(fresh.chartFiles().filter(Boolean)).toHaveLength(2));
  });

  it('épingler un diagramme à une autre pièce le retire de la première', async () => {
    const { store } = await openProject();
    await store.addCharts([chart([1])], 'image');

    store.pinChart(1, 1);

    expect(store.charts()).toEqual({ 1: 1 });
  });

  it('ignore une épingle vers un diagramme ou une pièce qui n’existent pas', async () => {
    const { store } = await openProject();
    await store.addCharts([chart([1])], 'image');

    store.pinChart(1, 9);
    store.pinChart(7, 1);

    expect(store.charts()).toEqual({ 0: 1 });
  });

  it('n’ajoute rien, ne perd rien et le dit quand l’écriture avorte', async () => {
    const { store, db, id } = await openProject();
    await store.addCharts([chart([1])], 'image');
    idb.failWrites = true;

    await expect(store.addCharts([chart([2])], 'image')).resolves.toBe(false);

    expect(store.chartError()).toBe('non-enregistre');
    expect(store.chartCount()).toBe(1);
    expect(await db.getFiles([`${id}:chart:2`])).toEqual([undefined]);
    const [file] = await db.getFiles<ProjectImage>([`${id}:chart:1`]);
    expect(await bytesOf(file?.blob)).toEqual([1]);
    const [saved] = await db.list<Project>();
    expect(saved.chartCount).toBe(1);
  });

  it('refuse le vingt et unième diagramme', async () => {
    const { store } = await openProject();
    await store.addCharts(
      Array.from({ length: MAX_CHARTS }, (_, i) => chart([i])),
      'pdf',
    );

    await expect(store.addCharts([chart([99])], 'image')).resolves.toBe(false);

    expect(store.chartCount()).toBe(MAX_CHARTS);
    expect(store.chartError()).toBe('plafond');
  });

  it('n’enregistre rien sans projet ouvert', async () => {
    const store = TestBed.inject(ReaderStore);
    await store.initialize();

    await expect(store.addCharts([chart([1])], 'image')).resolves.toBe(false);

    expect(store.chartCount()).toBe(0);
  });

  it('supprime les diagrammes avec le projet', async () => {
    const { store, db, id } = await openProject();
    await store.addCharts([chart([1]), chart([2])], 'pdf');

    await store.removeProject(id);

    expect(await db.getFiles([`${id}:chart:1`, `${id}:chart:2`])).toEqual([undefined, undefined]);
  });

  it('compte chart_viewed une fois par diagramme et par session', async () => {
    const { store } = await openProject();
    await store.addCharts([chart([1]), chart([2])], 'pdf');

    store.markChartViewed(1);
    store.markChartViewed(1);
    store.markChartViewed(2);

    expect(track.mock.calls.filter(([name]) => name === 'chart_viewed')).toHaveLength(2);
  });

  it('la sauvegarde v2 conserve les diagrammes et leurs épingles', async () => {
    const { store, id } = await openProject();
    await store.addCharts([chart([1, 2]), chart([3])], 'pdf');
    store.pinChart(1, 2);
    TestBed.tick();
    const db = TestBed.inject(ProjectStoreService);
    await vi.waitFor(async () => expect((await db.list<Project>())[0].charts).toEqual({ 0: 1, 1: 2 }));
    const text = await (await store.exportBackup()).text();

    uninstallFakeIndexedDb();
    idb = installFakeIndexedDb();
    TestBed.resetTestingModule();
    configure();
    const fresh = TestBed.inject(ReaderStore);
    await fresh.initialize();

    await expect(fresh.importBackup(new File([text], 'sauvegarde.json'))).resolves.toBe(true);

    expect(fresh.projects()[0]).toMatchObject({ chartCount: 2, charts: { 0: 1, 1: 2 } });
    const files = await TestBed.inject(ProjectStoreService).getFiles<ProjectImage>([
      `${id}:chart:1`,
      `${id}:chart:2`,
    ]);
    expect(files.map((file) => file?.kind)).toEqual(['chart', 'chart']);
    expect(await bytesOf(files[0]?.blob)).toEqual([1, 2]);
    expect(await bytesOf(files[1]?.blob)).toEqual([3]);
  });
});

describe('parseBackup — diagrammes', () => {
  const base = {
    id: 'p',
    name: 'P',
    source: 'x',
    image: '',
    pieceIndex: 0,
    stepIndex: 0,
    done: {},
    reps: {},
    elapsed: 0,
    expandAbbreviations: false,
    createdAt: 0,
    lastOpenedAt: 0,
    chartCount: 1,
    charts: { 0: 1, 3: 5, x: 1 },
  };
  const image = (overrides: Record<string, unknown> = {}) => ({
    id: 'p:chart:1',
    projectId: 'p',
    n: 1,
    width: 10,
    height: 10,
    kind: 'chart',
    type: 'image/jpeg',
    data: 'AAAA',
    ...overrides,
  });

  it('accepte un diagramme et écarte les épingles qui ne visent rien', () => {
    const parsed = parseBackup({ version: 2, projects: [base], images: [image()] });

    expect(parsed?.projects[0].charts).toEqual({ 0: 1 });
  });

  it('refuse en bloc un diagramme dont la clé n’est pas celle d’un diagramme', () => {
    expect(parseBackup({ version: 2, projects: [base], images: [image({ id: 'p:1' })] })).toBeNull();
    expect(
      parseBackup({ version: 2, projects: [base], images: [image({ kind: 'autre' })] }),
    ).toBeNull();
  });

  it('refuse un diagramme trop lourd', () => {
    const huge = 'A'.repeat(9 * 1024 * 1024);

    expect(parseBackup({ version: 2, projects: [base], images: [image({ data: huge })] })).toBeNull();
  });
});

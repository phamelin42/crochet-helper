import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { ProjectStoreService } from '../../../core/storage/project-store.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { Project } from '../data/project.model';
import { ReaderStore } from './reader-store';

const PATTERN = [
  'Patron',
  'Round 1: 6 sc (6)',
  'Round 2: 12 sc (12)',
  'Round 3: 18 sc (18)',
  'Round 4: weave in the end',
].join('\n');

describe('ReaderStore — maille courante et affichage', () => {
  let track: ReturnType<typeof vi.fn>;

  const configure = () =>
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AnalyticsService, useValue: { track } },
      ],
    });

  /** Relit le projet tel qu'IndexedDB le contient : l'effet d'écriture a eu le temps de tourner. */
  async function saved(check: (project: Project) => void) {
    const db = TestBed.inject(ProjectStoreService);
    TestBed.tick();
    await vi.waitFor(async () => {
      const [project] = await db.list<Project>();
      expect(project).toBeDefined();
      check(project);
    });
  }

  async function openProject() {
    const store = TestBed.inject(ReaderStore);
    await store.initialize();
    store.load(PATTERN);
    await vi.waitFor(() => expect(store.pieceChart()).not.toBeNull());
    return store;
  }

  beforeEach(() => {
    installFakeIndexedDb();
    track = vi.fn();
    localStorage.clear();
    configure();
  });

  afterEach(() => {
    uninstallFakeIndexedDb();
    localStorage.clear();
  });

  it('retient l’étape et la maille touchées, relues depuis IndexedDB', async () => {
    const store = await openProject();

    store.markStitch(1, 4);

    expect(store.stepIndex()).toBe(1);
    expect(store.stitchIndex()).toBe(4);
    await saved((project) => {
      expect(project.stepIndex).toBe(1);
      expect(project.stitch).toBe(4);
    });
  });

  it('reprend la maille au rechargement', async () => {
    const store = await openProject();
    store.markStitch(1, 4);
    store.setView('chart');
    await saved((project) =>
      expect(project).toMatchObject({ stepIndex: 1, stitch: 4, view: 'chart' }),
    );

    TestBed.resetTestingModule();
    configure();
    const fresh = TestBed.inject(ReaderStore);
    await fresh.initialize();

    expect(fresh.stepIndex()).toBe(1);
    expect(fresh.stitchIndex()).toBe(4);
    expect(fresh.view()).toBe('chart');
  });

  it('remet la maille à 0 quand l’étape change, par chaque chemin', async () => {
    const store = await openProject();
    const touched = () => store.markStitch(1, 4);

    touched();
    store.move(1);
    expect(store.stitchIndex()).toBe(0);

    touched();
    store.goTo(1, 'list');
    expect(store.stitchIndex()).toBe(0);

    touched();
    store.advance();
    expect(store.stitchIndex()).toBe(0);
  });

  it('un projet enregistré avant la fiche s’ouvre en texte, à la première maille', async () => {
    await openProject();
    const db = TestBed.inject(ProjectStoreService);
    await saved(() => undefined);
    const [project] = await db.list<Project>();
    const { stitch: _stitch, view: _view, ...legacy } = project;
    void _stitch;
    void _view;
    await db.put(legacy);

    TestBed.resetTestingModule();
    configure();
    const fresh = TestBed.inject(ReaderStore);
    await fresh.initialize();

    expect(fresh.view()).toBe('text');
    expect(fresh.stitchIndex()).toBe(0);
  });

  it('compte les mailles de l’étape courante, 0 pour une étape qui ne se dessine pas', async () => {
    const store = await openProject();

    expect(store.stitchTotal()).toBe(6);
    store.goTo(3, 'list');
    expect(store.stitchTotal()).toBe(18);
    store.goTo(4, 'list');
    expect(store.stitchTotal()).toBe(0);
  });

  it('ne compte stitch_marked qu’une fois par tour, et view_changed à chaque changement', async () => {
    const store = await openProject();

    store.markStitch(1, 2);
    store.markStitch(1, 3);
    store.markStitch(2, 0);
    store.setView('chart');
    store.setView('chart');
    store.setView('text');

    const names = track.mock.calls.map(([name]) => name);
    expect(names.filter((name) => name === 'stitch_marked')).toHaveLength(2);
    expect(track).toHaveBeenCalledWith('view_changed', { view: 'chart' });
    expect(track).toHaveBeenCalledWith('view_changed', { view: 'text' });
    expect(names.filter((name) => name === 'view_changed')).toHaveLength(2);
  });

  it('refuse une maille hors de la pièce', async () => {
    const store = await openProject();

    store.markStitch(99, 1);
    store.markStitch(1, -1);

    expect(store.stepIndex()).toBe(0);
    expect(store.stitchIndex()).toBe(0);
  });
});

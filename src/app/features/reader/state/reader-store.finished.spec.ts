import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { ProjectStoreService } from '../../../core/storage/project-store.service';
import { Project } from '../data/project.model';
import { ReaderStore } from './reader-store';

const TWO_STEPS = ['Patron', 'Rang 1 : 6 ms', 'Rang 2 : 12 ms'].join('\n');

/** Coche chaque étape, de la première à la dernière. */
function finish(store: ReaderStore): void {
  for (let i = 0; i < store.total(); i++) store.advance();
}

describe('ReaderStore — patron terminé', () => {
  let track: ReturnType<typeof vi.fn>;
  let store: ReaderStore;

  beforeEach(async () => {
    installFakeIndexedDb();
    track = vi.fn();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AnalyticsService, useValue: { track } },
      ],
    });
    store = TestBed.inject(ReaderStore);
    await store.initialize();
  });

  afterEach(() => {
    vi.useRealTimers();
    uninstallFakeIndexedDb();
    localStorage.clear();
  });

  it('pose finishedAt la première fois que la dernière étape est cochée, et le garde en base', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T10:00:00Z'));
    store.load(TWO_STEPS);
    expect(store.finishedAt()).toBeNull();

    finish(store);

    expect(store.finished()).toBe(true);
    expect(store.finishedAt()).toBe(Date.parse('2026-11-12T10:00:00Z'));
    const projectStore = TestBed.inject(ProjectStoreService);
    await vi.waitFor(async () => {
      const [saved] = await projectStore.list<Project>();
      expect(saved?.finishedAt).toBe(Date.parse('2026-11-12T10:00:00Z'));
    });
  });

  it('mesure la fin une seule fois, sans donnée personnelle', () => {
    store.load(TWO_STEPS);
    finish(store);
    store.setDone(true);
    store.setDone(true);

    const calls = track.mock.calls.filter(([name]) => name === 'pattern_finished');
    expect(calls).toEqual([['pattern_finished', { steps: 2 }]]);
  });

  it('décocher la dernière étape efface finishedAt, la recocher le repose', () => {
    store.load(TWO_STEPS);
    finish(store);

    store.setDone(false);
    expect(store.finishedAt()).toBeNull();

    store.setDone(true);
    expect(store.finishedAt()).not.toBeNull();
  });

  it('reculer d’une étape après la fin ne défait pas le patron terminé', () => {
    store.load(TWO_STEPS);
    finish(store);

    store.move(-1);

    expect(store.finished()).toBe(false);
    expect(store.finishedAt()).not.toBeNull();
  });

  it('« Recommencer » remet la progression à zéro et efface finishedAt', () => {
    store.load(TWO_STEPS);
    store.addRepeat(3);
    finish(store);
    store.toggleTimer();

    store.restartPattern();

    expect(store.done()).toEqual({});
    expect(store.reps()).toEqual({});
    expect(store.pieceIndex()).toBe(0);
    expect(store.stepIndex()).toBe(0);
    expect(store.elapsed()).toBe(0);
    expect(store.running()).toBe(false);
    expect(store.finishedAt()).toBeNull();
    expect(store.finished()).toBe(false);
  });

  it('refaire le patron après « Recommencer » mesure une nouvelle fin', () => {
    store.load(TWO_STEPS);
    finish(store);
    store.restartPattern();
    finish(store);

    expect(track.mock.calls.filter(([name]) => name === 'pattern_finished')).toHaveLength(2);
  });

  it('« Revoir la dernière étape » masque l’écran de fin sans rien décocher, et il revient à la prochaine fin', () => {
    store.load(TWO_STEPS);
    finish(store);
    expect(store.endScreenVisible()).toBe(true);

    store.reviewLastStep();

    expect(store.endScreenVisible()).toBe(false);
    expect(store.isDone()).toBe(true);
    expect(store.finished()).toBe(true);

    store.setDone(false);
    store.setDone(true);
    expect(store.endScreenVisible()).toBe(true);
  });

  it('reprendre un projet déjà terminé affiche l’écran de fin sans remesurer la fin', () => {
    store.projects.set([
      {
        id: 'a',
        name: 'Fini',
        source: TWO_STEPS,
        image: '',
        pieceIndex: 0,
        stepIndex: 1,
        done: { '0:0': true, '0:1': true },
        reps: {},
        elapsed: 60_000,
        expandAbbreviations: false,
        createdAt: 1,
        lastOpenedAt: 1,
        finishedAt: 5,
      },
    ]);

    store.resumeProject('a');

    expect(store.finishedAt()).toBe(5);
    expect(store.endScreenVisible()).toBe(true);
    expect(track.mock.calls.some(([name]) => name === 'pattern_finished')).toBe(false);
  });

  it('un ancien projet sans finishedAt, déjà tout coché, se reprend tel quel', () => {
    store.projects.set([
      {
        id: 'old',
        name: 'Ancien',
        source: TWO_STEPS,
        image: '',
        pieceIndex: 0,
        stepIndex: 1,
        done: { '0:0': true, '0:1': true },
        reps: {},
        elapsed: 0,
        expandAbbreviations: false,
        createdAt: 1,
        lastOpenedAt: 1,
      },
    ]);

    store.resumeProject('old');

    expect(store.finished()).toBe(true);
    expect(track.mock.calls.some(([name]) => name === 'pattern_finished')).toBe(false);
  });
});

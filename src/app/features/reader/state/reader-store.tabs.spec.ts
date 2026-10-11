import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { TabListener, TabSyncService } from '../../../core/platform/tab-sync.service';
import { ProjectStoreService } from '../../../core/storage/project-store.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { Project } from '../data/project.model';
import { ReaderStore } from './reader-store';

/** Un autre onglet de l'application : ce qu'il annonce arrive ici, ce qu'on annonce lui est noté. */
class FakeTabSync {
  readonly announced: [string, boolean][] = [];
  private readonly listeners = new Set<TabListener>();

  announce(id: string, removed = false): void {
    this.announced.push([id, removed]);
  }

  listen(listener: TabListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** L'autre onglet vient d'écrire (ou de supprimer) `id`. */
  emit(id: string, removed = false): void {
    this.listeners.forEach((listener) => listener(id, removed));
  }
}

const PATTERN = ['Rang 1 : 6 ms (6)', 'Rang 2 : 12 ms (12)', 'Rang 3 : 18 ms (18)'].join('\n');

describe('ReaderStore — plusieurs onglets', () => {
  let tabs: FakeTabSync;
  let db: ProjectStoreService;

  beforeEach(() => {
    installFakeIndexedDb();
    localStorage.clear();
    tabs = new FakeTabSync();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AnalyticsService, useValue: { track: vi.fn() } },
        { provide: TabSyncService, useValue: tabs },
      ],
    });
    db = TestBed.inject(ProjectStoreService);
  });

  afterEach(() => {
    uninstallFakeIndexedDb();
    localStorage.clear();
  });

  /** Un projet ouvert et déjà enregistré. */
  async function opened(): Promise<{ store: ReaderStore; id: string }> {
    const store = TestBed.inject(ReaderStore);
    await store.initialize();
    store.load(PATTERN);
    const id = store.currentId()!;
    TestBed.tick();
    await vi.waitFor(async () => expect(await db.get<Project>(id)).toBeDefined());
    return { store, id };
  }

  it('annonce aux autres onglets chaque projet qu’elle enregistre', async () => {
    const { id } = await opened();

    expect(tabs.announced).toContainEqual([id, false]);
  });

  it('reprend ce qu’un autre onglet a enregistré, et arrête son propre chronomètre', async () => {
    const { store, id } = await opened();
    store.startTimer();
    expect(store.running()).toBe(true);
    const saved = (await db.get<Project>(id))!;

    // L'autre onglet est avancé à la deuxième étape et a remis le chronomètre à zéro.
    await db.put({ ...saved, stepIndex: 1, elapsed: 0, reps: { '0:1': 2 } });
    tabs.emit(id);

    await vi.waitFor(() => expect(store.stepIndex()).toBe(1));
    expect(store.elapsed()).toBe(0);
    expect(store.currentReps()).toBe(2);
    expect(store.running()).toBe(false);
  });

  it('ne réécrit pas par-dessus ce qu’elle vient de reprendre', async () => {
    const { store, id } = await opened();
    const saved = (await db.get<Project>(id))!;
    const other: Project = { ...saved, stepIndex: 2, elapsed: 5_000 };
    await db.put(other);
    const announcedBefore = tabs.announced.length;

    tabs.emit(id);
    await vi.waitFor(() => expect(store.stepIndex()).toBe(2));
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(tabs.announced.length).toBe(announcedBefore);
    expect(await db.get<Project>(id)).toEqual(other);
  });

  it('met à jour la liste quand l’autre onglet change un projet qui n’est pas ouvert ici', async () => {
    const { store, id } = await opened();
    const saved = (await db.get<Project>(id))!;
    store.clear();
    expect(store.currentId()).toBeNull();

    await db.put({ ...saved, elapsed: 90_000 });
    tabs.emit(id);

    await vi.waitFor(() => expect(store.projects().find((p) => p.id === id)?.elapsed).toBe(90_000));
    expect(store.currentId()).toBeNull();
  });

  it('un projet supprimé dans l’autre onglet sort de la liste et vide le lecteur', async () => {
    const { store, id } = await opened();

    tabs.emit(id, true);

    await vi.waitFor(() => expect(store.projects().some((p) => p.id === id)).toBe(false));
    expect(store.currentId()).toBeNull();
    expect(store.source()).toBe('');
  });

  it('supprimer un projet ici le signale aux autres onglets', async () => {
    const { store, id } = await opened();

    await store.removeProject(id);

    expect(tabs.announced).toContainEqual([id, true]);
  });
});

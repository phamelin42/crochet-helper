import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import {
  FakeControl,
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { BACKUP_SCHEMA_VERSION, Project } from '../data/project.model';
import { ProjectStoreService } from '../../../core/storage/project-store.service';
import { ReaderStore } from './reader-store';

function projectFixture(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p',
    name: 'Projet',
    source: 'Rang 1 : 6 ms',
    image: '',
    pieceIndex: 0,
    stepIndex: 0,
    done: {},
    reps: {},
    elapsed: 0,
    expandAbbreviations: false,
    createdAt: 0,
    lastOpenedAt: 0,
    ...overrides,
  };
}

describe('ReaderStore — projets', () => {
  let track: ReturnType<typeof vi.fn>;
  let idb: FakeControl;

  beforeEach(() => {
    idb = installFakeIndexedDb();
    track = vi.fn();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AnalyticsService, useValue: { track } },
      ],
    });
  });

  afterEach(() => {
    uninstallFakeIndexedDb();
    localStorage.clear();
  });

  it('migre un patron localStorage en cours sans rien perdre, compteurs et chronomètre compris', async () => {
    localStorage.setItem(
      'fil.reader.v1',
      JSON.stringify({
        source: 'Rang 1 : 6 ms dans un cercle magique',
        image: '',
        pieceIndex: 0,
        stepIndex: 1,
        done: { '0:0': true },
        reps: { '0:1': 3 },
        elapsed: 42_000,
        expandAbbreviations: true,
      }),
    );

    const store = TestBed.inject(ReaderStore);
    await store.initialize();

    expect(store.source()).toBe('Rang 1 : 6 ms dans un cercle magique');
    expect(store.done()).toEqual({ '0:0': true });
    expect(store.reps()).toEqual({ '0:1': 3 });
    expect(store.elapsed()).toBe(42_000);
    expect(store.expandAbbreviations()).toBe(true);
    expect(store.currentId()).not.toBeNull();
    expect(localStorage.getItem('fil.reader.v1')).toBeNull();
    expect(localStorage.getItem('fil.storage.migrated')).toBe('true');
  });

  it("n'invente rien quand il n'y a aucun ancien état à migrer", async () => {
    const store = TestBed.inject(ReaderStore);
    await store.initialize();

    expect(store.currentId()).toBeNull();
    expect(store.projects()).toEqual([]);
    expect(localStorage.getItem('fil.storage.migrated')).toBe('true');
  });

  it('reprend un projet enregistré et compte project_resumed', () => {
    const store = TestBed.inject(ReaderStore);
    store.projects.set([projectFixture({ id: 'a', source: 'Rang 1 : 6 ms', elapsed: 5_000 })]);

    store.resumeProject('a');

    expect(store.currentId()).toBe('a');
    expect(store.source()).toBe('Rang 1 : 6 ms');
    expect(store.elapsed()).toBe(5_000);
    expect(track).toHaveBeenCalledWith('project_resumed');
  });

  it('renomme un projet', async () => {
    const store = TestBed.inject(ReaderStore);
    store.projects.set([projectFixture({ id: 'a', name: 'Ancien nom' })]);

    await store.renameProject('a', 'Nouveau nom');

    expect(store.projects()[0].name).toBe('Nouveau nom');
  });

  it("supprime un projet et vide le lecteur s'il était actif", async () => {
    const store = TestBed.inject(ReaderStore);
    store.projects.set([projectFixture({ id: 'a' })]);
    store.resumeProject('a');

    await store.removeProject('a');

    expect(store.projects()).toEqual([]);
    expect(store.currentId()).toBeNull();
    expect(store.source()).toBe('');
  });

  it("supprime un projet qui n'est pas actif sans toucher au lecteur", async () => {
    const store = TestBed.inject(ReaderStore);
    store.projects.set([projectFixture({ id: 'a' }), projectFixture({ id: 'b' })]);
    store.resumeProject('a');

    await store.removeProject('b');

    expect(store.projects().map((p) => p.id)).toEqual(['a']);
    expect(store.currentId()).toBe('a');
  });

  it('exporte puis réimporte tous les projets à l’identique sur un profil vide', async () => {
    const store = TestBed.inject(ReaderStore);
    const projects = [
      projectFixture({ id: 'a', name: 'Chat', done: { '0:0': true }, reps: { '0:0': 2 } }),
      projectFixture({ id: 'b', name: 'Écharpe', elapsed: 90_000, lastOpenedAt: 5 }),
    ];
    store.projects.set(projects);
    const text = await store.exportBackup().text();

    // Profil vide : autre base, autre magasin.
    uninstallFakeIndexedDb();
    idb = installFakeIndexedDb();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AnalyticsService, useValue: { track } },
      ],
    });
    const fresh = TestBed.inject(ReaderStore);
    await fresh.initialize();

    const ok = await fresh.importBackup(new File([text], 'sauvegarde.json'));

    expect(ok).toBe(true);
    expect(fresh.sortedProjects()).toEqual(
      [...projects].sort((x, y) => y.lastOpenedAt - x.lastOpenedAt),
    );
    // Et c'est bien écrit : une nouvelle session les relit.
    const reloaded = TestBed.inject(ProjectStoreService);
    expect((await reloaded.list<Project>()).length).toBe(2);
  });

  it('fusionne un import sans perdre les projets déjà présents', async () => {
    const store = TestBed.inject(ReaderStore);
    store.projects.set([projectFixture({ id: 'existing', lastOpenedAt: 1_000 })]);

    const incoming = projectFixture({ id: 'new', lastOpenedAt: 2_000 });
    const file = new File(
      [JSON.stringify({ version: BACKUP_SCHEMA_VERSION, projects: [incoming] })],
      'sauvegarde.json',
      { type: 'application/json' },
    );

    const ok = await store.importBackup(file);

    expect(ok).toBe(true);
    expect(
      store
        .projects()
        .map((p) => p.id)
        .sort(),
    ).toEqual(['existing', 'new']);
  });

  it('refuse un fichier de version de schéma inconnue, sans import partiel', async () => {
    const store = TestBed.inject(ReaderStore);
    store.projects.set([projectFixture({ id: 'a' })]);
    const file = new File(
      [JSON.stringify({ version: 999, projects: [projectFixture({ id: 'b' })] })],
      'sauvegarde.json',
      { type: 'application/json' },
    );

    const ok = await store.importBackup(file);

    expect(ok).toBe(false);
    expect(store.projects().map((p) => p.id)).toEqual(['a']);
  });

  it("refuse un fichier qui n'est pas du JSON valide", async () => {
    const store = TestBed.inject(ReaderStore);
    const file = new File(['pas du json'], 'sauvegarde.json', { type: 'application/json' });

    await expect(store.importBackup(file)).resolves.toBe(false);
  });

  it('garde l’ancien patron si IndexedDB refuse l’écriture, et l’affiche quand même', async () => {
    localStorage.setItem(
      'fil.reader.v1',
      JSON.stringify({ source: 'Rang 1 : 6 ms', stepIndex: 0, elapsed: 7_000 }),
    );
    idb.failWrites = true;

    const store = TestBed.inject(ReaderStore);
    await store.initialize();

    expect(store.source()).toBe('Rang 1 : 6 ms');
    expect(store.elapsed()).toBe(7_000);
    expect(localStorage.getItem('fil.reader.v1')).not.toBeNull();
    expect(localStorage.getItem('fil.storage.migrated')).toBeNull();
  });

  it('ouvre un nouveau projet quand on charge un autre patron, sans toucher au premier', async () => {
    const store = TestBed.inject(ReaderStore);
    await store.initialize();
    store.load('Rang 1 : 6 ms\nRang 2 : 12 ms');
    const first = store.currentId();
    store.advance();
    await vi.waitFor(() => expect(store.projects().length).toBe(1));

    store.load('Rang 1 : 8 ms');

    expect(store.currentId()).not.toBe(first);
    await vi.waitFor(() => expect(store.projects().length).toBe(2));
    const kept = store.projects().find((p) => p.id === first)!;
    expect(kept.source).toBe('Rang 1 : 6 ms\nRang 2 : 12 ms');
    expect(kept.done).toEqual({ '0:0': true });
  });

  it('recharger le même patron garde le projet', async () => {
    const store = TestBed.inject(ReaderStore);
    await store.initialize();
    store.load('Rang 1 : 6 ms');
    const id = store.currentId();

    store.load('Rang 1 : 6 ms');

    expect(store.currentId()).toBe(id);
  });

  it('affiche la version importée du projet ouvert quand elle est plus récente', async () => {
    const store = TestBed.inject(ReaderStore);
    store.projects.set([projectFixture({ id: 'a', lastOpenedAt: 1_000 })]);
    store.resumeProject('a');
    const touched = store.projects()[0].lastOpenedAt;

    const newer = projectFixture({
      id: 'a',
      stepIndex: 0,
      elapsed: 60_000,
      lastOpenedAt: touched + 1,
    });
    const file = new File(
      [JSON.stringify({ version: BACKUP_SCHEMA_VERSION, projects: [newer] })],
      'b.json',
    );

    await expect(store.importBackup(file)).resolves.toBe(true);
    expect(store.elapsed()).toBe(60_000);
  });

  it('n’importe rien si l’écriture échoue', async () => {
    const store = TestBed.inject(ReaderStore);
    store.projects.set([projectFixture({ id: 'a' })]);
    idb.failWrites = true;
    const file = new File(
      [JSON.stringify({ version: BACKUP_SCHEMA_VERSION, projects: [projectFixture({ id: 'b' })] })],
      'b.json',
    );

    await expect(store.importBackup(file)).resolves.toBe(false);
    expect(store.projects().map((p) => p.id)).toEqual(['a']);
  });

  it('ne ressuscite pas un projet supprimé pendant que le chronomètre tourne', async () => {
    const store = TestBed.inject(ReaderStore);
    await store.initialize();
    store.load('Rang 1 : 6 ms\nRang 2 : 12 ms');
    const id = store.currentId()!;
    store.startTimer();
    await vi.waitFor(() => expect(store.projects().length).toBe(1));

    await store.removeProject(id);
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(store.running()).toBe(false);
    expect(store.projects()).toEqual([]);
    expect(await TestBed.inject(ProjectStoreService).list()).toEqual([]);
  });
});

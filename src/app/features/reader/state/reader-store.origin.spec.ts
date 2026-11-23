import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { ProjectStoreService } from '../../../core/storage/project-store.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { PatternOrigin } from '../../discover/data/favorite.model';
import { Project } from '../data/project.model';
import { ReaderStore } from './reader-store';

const ORIGINE: PatternOrigin = {
  source: 'ravelry',
  id: '101',
  name: 'Petit sapin',
  designer: 'Camille Exemple',
  permalink: 'https://www.ravelry.com/patterns/library/petit-sapin',
  photoUrl: null,
};

describe('un patron déposé depuis une fiche Ravelry', () => {
  const track = vi.fn();

  async function lecteur() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AnalyticsService, useValue: { track } },
      ],
    });
    const store = TestBed.inject(ReaderStore);
    await store.initialize();
    return { store, base: TestBed.inject(ProjectStoreService) };
  }

  beforeEach(() => {
    installFakeIndexedDb();
    localStorage.clear();
    sessionStorage.clear();
    track.mockClear();
  });
  afterEach(() => {
    uninstallFakeIndexedDb();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('le projet créé garde l’origine Ravelry, et la fiche n’est consommée qu’une fois', async () => {
    const { store, base } = await lecteur();
    store.pendingOrigin.set(ORIGINE);
    store.load('Rang 1 : 6 ms\nRang 2 : 12 ms');

    await vi.waitFor(async () => expect(await base.list()).toHaveLength(1));
    const [projet] = await base.list<Project>();
    expect(projet.origin).toEqual(ORIGINE);
    expect(store.pendingOrigin()).toBeNull();
    expect(track).toHaveBeenCalledWith(
      'pattern_parsed',
      expect.objectContaining({ origine: 'ravelry' }),
    );
  });

  it('un autre patron déposé ensuite n’hérite pas de l’origine', async () => {
    const { store, base } = await lecteur();
    store.pendingOrigin.set(ORIGINE);
    store.load('Rang 1 : 6 ms');
    await vi.waitFor(async () => expect(await base.list()).toHaveLength(1));

    store.load('Rang 1 : 8 ms dans un anneau');
    await vi.waitFor(async () => expect(await base.list()).toHaveLength(2));
    const projets = await base.list<Project>();
    expect(projets.filter((p) => p.origin)).toHaveLength(1);
    expect(store.projects().find((p) => p.id === store.currentId())?.origin).toBeUndefined();
  });

  it('c’est un nouveau projet : le patron déjà ouvert reste intact, sans origine', async () => {
    const { store, base } = await lecteur();
    store.load('Rang 1 : 6 ms');
    await vi.waitFor(async () => expect(await base.list()).toHaveLength(1));
    const ancien = store.currentId();

    store.pendingOrigin.set(ORIGINE);
    store.load('Rang 1 : 9 ms\nRang 2 : 18 ms');
    await vi.waitFor(async () => expect(await base.list()).toHaveLength(2));
    const projets = await base.list<Project>();
    expect(projets.find((p) => p.id === ancien)?.origin).toBeUndefined();
    expect(projets.find((p) => p.id !== ancien)?.origin).toEqual(ORIGINE);
  });

  it('l’exemple et un lien partagé ne prennent pas la fiche en attente', async () => {
    const { store } = await lecteur();
    store.pendingOrigin.set(ORIGINE);
    store.loadDemo();
    expect(store.pendingOrigin()).toEqual(ORIGINE);
  });

  it('un projet rouvert retrouve son origine', async () => {
    const { store, base } = await lecteur();
    store.pendingOrigin.set(ORIGINE);
    store.load('Rang 1 : 6 ms');
    await vi.waitFor(async () => expect(await base.list()).toHaveLength(1));
    const id = store.currentId()!;

    store.load('Rang 1 : 7 ms dans un autre patron');
    await vi.waitFor(async () => expect(await base.list()).toHaveLength(2));
    store.resumeProject(id);
    expect(store.origin()).toEqual(ORIGINE);
  });

  it('effacer la fiche en attente vide aussi la mémoire de session', async () => {
    const { store } = await lecteur();
    sessionStorage.setItem('fil.ravelryStart', '{"x":1}');
    store.pendingOrigin.set(ORIGINE);
    store.dismissPendingOrigin();
    expect(store.pendingOrigin()).toBeNull();
    expect(sessionStorage.getItem('fil.ravelryStart')).toBeNull();
  });
});

import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProjectStoreService } from '../../../core/storage/project-store.service';
import {
  FakeControl,
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { Favorite } from '../data/favorite.model';
import { FavoritesStore } from './favorites-store';

const PERMALINK = 'https://www.ravelry.com/patterns/library/sapin';
const sapin = {
  id: '101',
  name: 'Petit sapin',
  designer: 'Camille',
  thumbnail: null,
  permalink: PERMALINK,
};

describe('FavoritesStore', () => {
  let controle: FakeControl;

  async function monter() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
    const store = TestBed.inject(FavoritesStore);
    await store.load();
    return { store, base: TestBed.inject(ProjectStoreService) };
  }

  beforeEach(() => {
    controle = installFakeIndexedDb();
  });
  afterEach(() => uninstallFakeIndexedDb());

  it('un favori ajouté est relu par le magasin, avec sa date, et survit à un rechargement', async () => {
    const { store, base } = await monter();
    expect(store.has('101')).toBe(false);
    expect(await store.add(sapin)).toBe(true);
    expect(store.has('101')).toBe(true);

    const [ecrit] = await base.listFavorites<Favorite>();
    expect(ecrit).toMatchObject(sapin);
    expect(ecrit.addedAt).toBeGreaterThan(0);

    const rouvert = await monter();
    expect(rouvert.store.has('101')).toBe(true);
    expect(rouvert.store.items()).toHaveLength(1);
  });

  it('ajouter deux fois le même patron ne le double pas', async () => {
    const { store, base } = await monter();
    await store.add(sapin);
    await store.add(sapin);
    expect(store.items()).toHaveLength(1);
    expect(await base.listFavorites()).toHaveLength(1);
  });

  it('retirer un favori le retire de la liste et du stockage', async () => {
    const { store, base } = await monter();
    await store.add(sapin);
    await store.add({ ...sapin, id: '102', name: 'Autre' });
    expect(await store.remove('101')).toBe(true);
    expect(store.has('101')).toBe(false);
    expect((await base.listFavorites<Favorite>()).map((f) => f.id)).toEqual(['102']);
  });

  it('tout effacer vide la liste et le stockage', async () => {
    const { store, base } = await monter();
    await store.add(sapin);
    await store.add({ ...sapin, id: '102', name: 'Autre' });
    expect(await store.clear()).toBe(true);
    expect(store.items()).toEqual([]);
    expect(await base.listFavorites()).toEqual([]);
  });

  it('une écriture non confirmée ne change rien à l’écran et le dit', async () => {
    const { store, base } = await monter();
    await store.add(sapin);

    controle.failWrites = true;
    expect(await store.add({ ...sapin, id: '102', name: 'Autre' })).toBe(false);
    expect(await store.remove('101')).toBe(false);
    expect(await store.clear()).toBe(false);
    expect(store.failed()).toBe(true);
    expect(store.items().map((f) => f.id)).toEqual(['101']);

    controle.failWrites = false;
    expect((await base.listFavorites<Favorite>()).map((f) => f.id)).toEqual(['101']);
    await store.add({ ...sapin, id: '102', name: 'Autre' });
    expect(store.failed()).toBe(false);
  });

  it('les plus récents d’abord', async () => {
    const { store, base } = await monter();
    await base.putFavorites([
      { ...sapin, id: '1', addedAt: 100 },
      { ...sapin, id: '2', addedAt: 300 },
      { ...sapin, id: '3', addedAt: 200 },
    ]);
    await store.load(true);
    expect(store.sorted().map((f) => f.id)).toEqual(['2', '3', '1']);
  });

  it('ignore un enregistrement abîmé au lieu de planter', async () => {
    const { store, base } = await monter();
    await base.putFavorites([
      { ...sapin, id: '1', addedAt: 1 },
      { id: '2', name: 5, permalink: 'javascript:alert(1)' },
    ]);
    await store.load(true);
    expect(store.items().map((f) => f.id)).toEqual(['1']);
  });

  it('sans IndexedDB : liste vide, l’ajout échoue sans lever', async () => {
    uninstallFakeIndexedDb();
    const { store } = await monter();
    expect(store.items()).toEqual([]);
    expect(await store.add(sapin)).toBe(false);
    expect(store.has('101')).toBe(false);
  });
});

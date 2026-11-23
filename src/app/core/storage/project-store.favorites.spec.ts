import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { ProjectStoreService } from './project-store.service';
import { installFakeIndexedDb, uninstallFakeIndexedDb } from './testing/fake-indexed-db';

interface Fav {
  readonly id: string;
  readonly nom: string;
}

function service(): ProjectStoreService {
  TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
  return TestBed.inject(ProjectStoreService);
}

describe('favoris dans IndexedDB (base « fil » version 3)', () => {
  afterEach(() => uninstallFakeIndexedDb());

  it('ajoute, relit, retire un favori, puis les efface tous', async () => {
    installFakeIndexedDb();
    const store = service();
    expect(await store.listFavorites<Fav>()).toEqual([]);

    expect(await store.putFavorites<Fav>([{ id: '1', nom: 'A' }])).toBe(true);
    expect(await store.putFavorites<Fav>([{ id: '2', nom: 'B' }])).toBe(true);
    expect((await store.listFavorites<Fav>()).map((f) => f.id).sort()).toEqual(['1', '2']);

    expect(await store.removeFavorites(['1'])).toBe(true);
    expect((await store.listFavorites<Fav>()).map((f) => f.id)).toEqual(['2']);

    expect(await store.clearFavorites()).toBe(true);
    expect(await store.listFavorites<Fav>()).toEqual([]);
  });

  it('migre une base en version 2 remplie sans perdre ni projet ni photo', async () => {
    const projets = [
      { id: 'p1', name: 'Bonnet' },
      { id: 'p2', name: 'Écharpe' },
    ];
    const images = [{ id: 'p1:1' }, { id: 'p1:finished' }];
    installFakeIndexedDb({ version: 2, stores: { projects: projets, images } });
    const store = service();

    // Le magasin neuf existe et est vide : aucune exception, aucune perte.
    expect(await store.listFavorites<Fav>()).toEqual([]);
    expect(await store.list<{ id: string; name: string }>()).toEqual(projets);
    expect(await store.getFiles<{ id: string }>(['p1:1', 'p1:finished', 'p2:1'])).toEqual([
      images[0],
      images[1],
      undefined,
    ]);

    // Et il est utilisable tout de suite, à côté des projets.
    expect(await store.putFavorites<Fav>([{ id: '7', nom: 'Sapin' }])).toBe(true);
    expect(await store.list()).toHaveLength(2);
  });

  it('ne refait pas la migration sur une base déjà en version 3 : les favoris restent', async () => {
    installFakeIndexedDb({
      version: 3,
      stores: { projects: [], images: [], favorites: [{ id: '9' }] },
    });
    expect((await service().listFavorites<{ id: string }>()).map((f) => f.id)).toEqual(['9']);
  });

  it('un quota dépassé ne perd pas les favoris existants et se dit par false', async () => {
    const controle = installFakeIndexedDb();
    const store = service();
    await store.putFavorites<Fav>([{ id: '1', nom: 'A' }]);

    controle.failWrites = true;
    expect(await store.putFavorites<Fav>([{ id: '2', nom: 'B' }])).toBe(false);
    expect(await store.removeFavorites(['1'])).toBe(false);
    expect(await store.clearFavorites()).toBe(false);

    controle.failWrites = false;
    expect((await store.listFavorites<Fav>()).map((f) => f.id)).toEqual(['1']);
  });

  it('dégrade sans lever quand IndexedDB est indisponible', async () => {
    const store = service();
    expect(await store.listFavorites()).toEqual([]);
    expect(await store.putFavorites([{ id: '1' }])).toBe(false);
    expect(await store.removeFavorites(['1'])).toBe(false);
    expect(await store.clearFavorites()).toBe(false);
  });

  it('reste inerte côté serveur', async () => {
    installFakeIndexedDb();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const store = TestBed.inject(ProjectStoreService);
    expect(await store.listFavorites()).toEqual([]);
    expect(await store.putFavorites([{ id: '1' }])).toBe(false);
  });
});

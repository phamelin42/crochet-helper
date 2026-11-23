import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { readFavorites } from './favorites-db';
import { ProjectStoreService } from './project-store.service';
import { clearSession, readSession, writeSession } from './ravelry-session-db';
import { installFakeIndexedDb, uninstallFakeIndexedDb } from './testing/fake-indexed-db';

function base() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
  return TestBed.inject(ProjectStoreService);
}

describe('jetons Ravelry dans IndexedDB (base « fil » version 4)', () => {
  afterEach(() => uninstallFakeIndexedDb());

  it('écrit, relit, puis efface la connexion', async () => {
    installFakeIndexedDb();
    const db = await base().db();
    expect(await readSession(db)).toBeNull();
    expect(await writeSession(db, { accessToken: 'a', refreshToken: 'r', expiresAt: 5 })).toBe(
      true,
    );
    expect(await readSession(db)).toEqual({
      id: 'session',
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: 5,
    });
    expect(await clearSession(db)).toBe(true);
    expect(await readSession(db)).toBeNull();
  });

  it('ne confirme rien quand le quota est dépassé, et ne relit pas un enregistrement tronqué', async () => {
    const control = installFakeIndexedDb();
    const db = await base().db();
    control.failWrites = true;
    expect(await writeSession(db, { accessToken: 'a', refreshToken: null, expiresAt: 1 })).toBe(
      false,
    );
    control.failWrites = false;
    expect(await readSession(db)).toBeNull();
  });

  it('sans base (stockage indisponible), ne lève rien', async () => {
    expect(await readSession(null)).toBeNull();
    expect(await writeSession(null, { accessToken: 'a', refreshToken: null, expiresAt: 1 })).toBe(
      false,
    );
    expect(await clearSession(null)).toBe(false);
  });

  it('la migration v3 → v4 crée le magasin sans toucher aux projets ni aux favoris', async () => {
    installFakeIndexedDb({
      version: 3,
      stores: { projects: [{ id: 'p1' }], images: [], favorites: [{ id: '1' }] },
    });
    const store = base();
    const db = await store.db();
    expect((await store.list<{ id: string }>()).map((p) => p.id)).toEqual(['p1']);
    expect((await readFavorites<{ id: string }>(db)).map((f) => f.id)).toEqual(['1']);
    expect(await writeSession(db, { accessToken: 'a', refreshToken: null, expiresAt: 1 })).toBe(
      true,
    );
  });
});

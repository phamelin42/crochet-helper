import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { ProjectStoreService } from './project-store.service';
import { installFakeIndexedDb, uninstallFakeIndexedDb } from './testing/fake-indexed-db';

interface Fixture {
  readonly id: string;
  readonly label: string;
}

describe('ProjectStoreService', () => {
  afterEach(() => uninstallFakeIndexedDb());

  it('dégrade sans lever quand IndexedDB est indisponible', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
    const service = TestBed.inject(ProjectStoreService);

    await expect(service.list()).resolves.toEqual([]);
    await expect(service.put<Fixture>({ id: 'a', label: 'A' })).resolves.toBe(false);
    await expect(service.remove('a')).resolves.toBeUndefined();
  });

  it('reste inerte côté serveur même si IndexedDB est simulée', async () => {
    installFakeIndexedDb();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const service = TestBed.inject(ProjectStoreService);

    await expect(service.list()).resolves.toEqual([]);
  });

  it('écrit, liste et supprime un enregistrement', async () => {
    installFakeIndexedDb();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
    const service = TestBed.inject(ProjectStoreService);

    await expect(service.put<Fixture>({ id: 'a', label: 'A' })).resolves.toBe(true);
    await expect(service.list<Fixture>()).resolves.toEqual([{ id: 'a', label: 'A' }]);

    await service.remove('a');
    await expect(service.list()).resolves.toEqual([]);
  });
});

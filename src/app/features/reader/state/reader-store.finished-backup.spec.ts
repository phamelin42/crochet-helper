import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { ProjectStoreService } from '../../../core/storage/project-store.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import {
  BACKUP_SCHEMA_VERSION,
  MAX_BACKUP_FINISHED_BYTES,
  parseBackup,
} from '../data/project-backup';
import { Project, ProjectImage, finishedId } from '../data/project.model';
import { FINISHED_PHOTO_PREPARER, ReaderStore } from './reader-store';

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p',
    name: 'Chat',
    source: 'Rang 1 : 6 ms',
    image: '',
    pieceIndex: 0,
    stepIndex: 0,
    done: {},
    reps: {},
    elapsed: 0,
    expandAbbreviations: false,
    createdAt: 1,
    lastOpenedAt: 1,
    imageCount: 0,
    finishedAt: 10,
    finishedPhoto: true,
    ...overrides,
  };
}

function backupImage(overrides: Record<string, unknown> = {}) {
  return {
    id: finishedId('p'),
    projectId: 'p',
    n: 1,
    width: 4,
    height: 3,
    kind: 'finished',
    type: 'image/jpeg',
    data: btoa('photo'),
    ...overrides,
  };
}

describe('sauvegarde — photo de l’ouvrage', () => {
  beforeEach(() => {
    installFakeIndexedDb();
    localStorage.clear();
  });
  afterEach(() => {
    uninstallFakeIndexedDb();
    localStorage.clear();
  });

  it('une photo d’ouvrage part dans la sauvegarde et revient à l’import, finishedAt compris', async () => {
    const providers = [
      { provide: PLATFORM_ID, useValue: 'browser' },
      { provide: AnalyticsService, useValue: { track: vi.fn() } },
      {
        provide: FINISHED_PHOTO_PREPARER,
        useValue: async () => ({
          ok: true,
          photo: { blob: new Blob(['ouvrage'], { type: 'image/jpeg' }), width: 8, height: 6 },
        }),
      },
    ];
    TestBed.configureTestingModule({ providers });
    const store = TestBed.inject(ReaderStore);
    await store.initialize();
    store.load('Patron\nRang 1 : 6 ms');
    for (let i = 0; i < store.total(); i++) store.advance();
    await store.setFinishedPhoto(new File(['x'], 'a.jpg', { type: 'image/jpeg' }));
    const original = store.currentId()!;
    await vi.waitFor(() => expect(store.projects()[0]?.finishedPhoto).toBe(true));
    const text = await (await store.exportBackup()).text();

    uninstallFakeIndexedDb();
    installFakeIndexedDb();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers });
    const fresh = TestBed.inject(ReaderStore);
    await fresh.initialize();

    expect(await fresh.importBackup(new File([text], 'sauvegarde.json'))).toBe(true);

    const reloaded = TestBed.inject(ProjectStoreService);
    const [saved] = await reloaded.list<Project>();
    expect(saved.finishedAt).toBeGreaterThan(0);
    const [file] = await reloaded.getFiles<ProjectImage>([finishedId(original)]);
    expect(file?.kind).toBe('finished');
    expect(await file!.blob.text()).toBe('ouvrage');
  });

  describe('validation', () => {
    const backup = (images: unknown[], projects = [project()]) => ({
      version: BACKUP_SCHEMA_VERSION,
      projects,
      images,
    });

    it('accepte une photo d’ouvrage bien formée', () => {
      expect(parseBackup(backup([backupImage()]))?.images).toHaveLength(1);
    });

    it('accepte un projet sans finishedAt ni photo (ancienne sauvegarde)', () => {
      const old = project();
      delete (old as { finishedAt?: number }).finishedAt;
      delete (old as { finishedPhoto?: boolean }).finishedPhoto;
      expect(parseBackup(backup([], [old]))?.projects).toHaveLength(1);
    });

    it.each([
      ['une clé qui n’est pas celle du projet', { id: 'p:7' }],
      ['un numéro autre que 1', { n: 2 }],
      ['un type qui n’est pas une image', { type: 'text/html' }],
      [
        'une photo trop lourde',
        { data: 'A'.repeat(Math.ceil((MAX_BACKUP_FINISHED_BYTES * 4) / 3) + 8) },
      ],
    ])('refuse la sauvegarde entière avec %s', (_nom, override) => {
      expect(parseBackup(backup([backupImage(override)]))).toBeNull();
    });

    it('écarte une photo dont le projet ne déclare pas de photo', () => {
      const parsed = parseBackup(backup([backupImage()], [project({ finishedPhoto: undefined })]));
      expect(parsed?.images).toEqual([]);
    });

    it('refuse un finishedAt qui n’est pas un nombre', () => {
      expect(
        parseBackup(backup([], [project({ finishedAt: 'hier' as unknown as number })])),
      ).toBeNull();
    });
  });
});

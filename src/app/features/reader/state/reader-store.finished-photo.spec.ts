import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { ObjectUrlService } from '../../../core/platform/object-url.service';
import { ProjectStoreService } from '../../../core/storage/project-store.service';
import {
  FakeControl,
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { PrepareResult } from '../data/finished-photo';
import { Project, ProjectImage, finishedId } from '../data/project.model';
import { FINISHED_PHOTO_PREPARER, ReaderStore } from './reader-store';

const PATTERN = ['Patron', 'Rang 1 : 6 ms', 'Rang 2 : 12 ms'].join('\n');

function photo(label: string): PrepareResult {
  return {
    ok: true,
    photo: { blob: new Blob([label], { type: 'image/jpeg' }), width: 8, height: 6 },
  };
}

describe('ReaderStore — photo de l’ouvrage', () => {
  let idb: FakeControl;
  let track: ReturnType<typeof vi.fn>;
  let prepare: ReturnType<typeof vi.fn>;
  let store: ReaderStore;
  let projectStore: ProjectStoreService;

  async function stored(): Promise<ProjectImage | undefined> {
    const [file] = await projectStore.getFiles<ProjectImage>([finishedId(store.currentId()!)]);
    return file;
  }

  beforeEach(async () => {
    idb = installFakeIndexedDb();
    track = vi.fn();
    prepare = vi.fn().mockResolvedValue(photo('une'));
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AnalyticsService, useValue: { track } },
        { provide: FINISHED_PHOTO_PREPARER, useValue: prepare },
        { provide: ObjectUrlService, useValue: { create: () => 'blob:photo', revoke: vi.fn() } },
      ],
    });
    store = TestBed.inject(ReaderStore);
    projectStore = TestBed.inject(ProjectStoreService);
    await store.initialize();
    store.load(PATTERN);
    await vi.waitFor(async () => expect(await projectStore.list<Project>()).toHaveLength(1));
  });

  afterEach(() => {
    uninstallFakeIndexedDb();
    localStorage.clear();
  });

  const file = () => new File(['x'], 'ouvrage.jpg', { type: 'image/jpeg' });

  it('enregistre la photo avec le projet, et on la relit en base', async () => {
    expect(await store.setFinishedPhoto(file())).toBe('saved');

    await vi.waitFor(async () => {
      const [project] = await projectStore.list<Project>();
      expect(project.finishedPhoto).toBe(true);
    });
    const saved = await stored();
    expect(saved).toMatchObject({ kind: 'finished', n: 1, width: 8, height: 6 });
    expect(await saved!.blob.text()).toBe('une');
    expect(track).toHaveBeenCalledWith('finished_photo_added');
    await vi.waitFor(() => expect(store.finishedPhotoUrl()?.url).toBe('blob:photo'));
  });

  it('une seule photo par projet : la remplacer écrase l’ancienne', async () => {
    await store.setFinishedPhoto(file());
    prepare.mockResolvedValue(photo('deux'));

    expect(await store.setFinishedPhoto(file())).toBe('saved');

    expect(await (await stored())!.blob.text()).toBe('deux');
  });

  it('une écriture avortée laisse l’ancienne photo intacte et le dit', async () => {
    await store.setFinishedPhoto(file());
    await vi.waitFor(async () =>
      expect((await projectStore.list<Project>())[0].finishedPhoto).toBe(true),
    );
    prepare.mockResolvedValue(photo('deux'));
    idb.failWrites = true;

    expect(await store.setFinishedPhoto(file())).toBe('failed');
    idb.failWrites = false;

    expect(await (await stored())!.blob.text()).toBe('une');
    expect(store.finishedPhoto()).toBe(true);
  });

  it('un échec d’écriture sans photo antérieure ne laisse aucune trace', async () => {
    idb.failWrites = true;

    expect(await store.setFinishedPhoto(file())).toBe('failed');
    idb.failWrites = false;

    expect(store.finishedPhoto()).toBe(false);
    expect(await stored()).toBeUndefined();
    expect(track).not.toHaveBeenCalledWith('finished_photo_added');
  });

  it.each(['too-large', 'not-image'] as const)('refuse proprement : %s', async (reason) => {
    prepare.mockResolvedValue({ ok: false, reason });

    expect(await store.setFinishedPhoto(file())).toBe(reason);

    expect(store.finishedPhoto()).toBe(false);
    expect(await stored()).toBeUndefined();
  });

  it('ne fait rien sans projet ouvert', async () => {
    store.clear();

    expect(await store.setFinishedPhoto(file())).toBe('failed');
  });

  it('« Retirer la photo » la supprime en base et du projet', async () => {
    await store.setFinishedPhoto(file());

    expect(await store.removeFinishedPhoto()).toBe(true);

    expect(store.finishedPhoto()).toBe(false);
    expect(await stored()).toBeUndefined();
    await vi.waitFor(async () =>
      expect((await projectStore.list<Project>())[0].finishedPhoto).toBeFalsy(),
    );
  });

  it('supprimer le projet supprime sa photo', async () => {
    await store.setFinishedPhoto(file());
    const id = store.currentId()!;
    await vi.waitFor(async () =>
      expect((await projectStore.list<Project>())[0].finishedPhoto).toBe(true),
    );

    await store.removeProject(id);

    expect(await projectStore.getFiles([finishedId(id)])).toEqual([undefined]);
    expect(await projectStore.list()).toEqual([]);
  });
});

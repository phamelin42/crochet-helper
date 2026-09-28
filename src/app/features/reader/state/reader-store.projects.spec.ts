import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import {
  FakeControl,
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { BACKUP_SCHEMA_VERSION, Project, ProjectImage } from '../data/project.model';
import { ProjectStoreService } from '../../../core/storage/project-store.service';
import { ObjectUrlService } from '../../../core/platform/object-url.service';
import type { ExtractedPdf } from '../data/pdf-extract';
import { PDF_EXTRACTOR, ReaderStore } from './reader-store';

/** Deux pièces, pour vérifier que la pièce reçue n'est pas la première par défaut. */
const TWO_PIECES = ['Patron', 'Piece A', 'Round 1: 6 sc (6)', 'Piece B', 'Round 1: 6 sc (6)'].join(
  '\n',
);

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
    imageCount: 0,
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

  it('reçoit un projet partagé : copie enregistrée sous un identifiant neuf, projet actif intact', async () => {
    const store = TestBed.inject(ReaderStore);
    const projectStore = TestBed.inject(ProjectStoreService);
    await store.initialize();
    const active = projectFixture({
      id: 'a',
      source: 'Rang 1 : 6 ms',
      image: 'data:image/png;base64,AAAA',
      elapsed: 5_000,
    });
    store.projects.set([active]);
    store.resumeProject('a');
    // La reprise réécrit « a » (date d'ouverture) : on attend que ce soit en
    // base pour comparer ensuite à un état stable, pas à une écriture en vol.
    await vi.waitFor(async () => expect(await projectStore.list<Project>()).toHaveLength(1));
    const beforeReceive = store.projects().find((p) => p.id === 'a');

    store.receiveSharedProject({
      source: TWO_PIECES,
      name: 'Projet envoyé',
      pieceIndex: 1,
      stepIndex: 0,
      done: { '0:0': true },
      reps: { '0:0': 2 },
    });

    const id = store.currentId();
    expect(id).not.toBeNull();
    expect(id).not.toBe('a');
    expect(store.source()).toBe(TWO_PIECES);
    expect(store.pieceIndex()).toBe(1);
    expect(track).toHaveBeenCalledWith('project_received');

    // Lire la liste tout de suite ne prouverait rien : l'effet de persistance
    // n'a pas encore tourné. On attend l'écriture, puis on relit IndexedDB :
    // la copie y est (elle survivra à un rechargement) et « a » y est intact.
    await vi.waitFor(() => expect(store.projects()).toHaveLength(2));
    const saved = await projectStore.list<Project>();
    expect(saved.find((p) => p.id === 'a')).toEqual(beforeReceive);
    expect(saved.find((p) => p.id === id)).toMatchObject({
      name: 'Projet envoyé',
      source: TWO_PIECES,
      pieceIndex: 1,
      stepIndex: 0,
      done: { '0:0': true },
      reps: { '0:0': 2 },
      // Ni l'image ni le chronomètre de l'expéditrice ne suivent la copie.
      image: '',
      elapsed: 0,
    });
  });

  it('ouvrir le même lien de projet deux fois crée deux projets distincts', () => {
    const store = TestBed.inject(ReaderStore);
    const progress = {
      source: 'Rang 1 : 6 ms',
      name: 'Projet',
      pieceIndex: 0,
      stepIndex: 0,
      done: {},
      reps: {},
    };

    store.receiveSharedProject(progress);
    const first = store.currentId();
    store.receiveSharedProject(progress);
    const second = store.currentId();

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
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
    const text = await (await store.exportBackup()).text();

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

  describe('photos d’un PDF', () => {
    const photo = (bytes: number[], afterLine: number) => ({
      blob: new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' }),
      width: 640,
      height: 480,
      afterLine,
    });
    /** Un PDF d'une page, deux photos : la première citée par le rang 3. */
    const PDF: ExtractedPdf = {
      pages: [
        {
          lines: [
            'Bunny',
            'Round 1: 6 sc in magic ring (6)',
            'Round 2: inc around (12)',
            'Round 3: sc around, see image 1 (12)',
          ],
          images: [photo([1, 2, 3], 1), photo([4, 5, 6, 7], 3)],
        },
      ],
      truncated: false,
    };
    const pdfFile = () => new File(['%PDF-1.7'], 'lapin.pdf', { type: 'application/pdf' });
    const keys = (id: string) => [`${id}:1`, `${id}:2`];
    const bytesOf = async (blob: Blob | undefined) =>
      Array.from(new Uint8Array(await blob!.arrayBuffer()));

    beforeEach(() => {
      TestBed.overrideProvider(PDF_EXTRACTOR, { useValue: async () => PDF });
    });

    it('enregistre le projet et ses photos, et les rattache aux étapes', async () => {
      const store = TestBed.inject(ReaderStore);
      const db = TestBed.inject(ProjectStoreService);
      await store.initialize();

      await store.importPdf(pdfFile());
      const id = store.currentId()!;

      expect(store.imageCount()).toBe(2);
      expect(store.pdfImagesNote()).toBeNull();
      expect(store.steps().map((step) => step.images)).toEqual([undefined, undefined, [1, 2]]);
      const [saved] = await db.list<Project>();
      expect(saved.id).toBe(id);
      expect(saved.imageCount).toBe(2);
      const files = await db.getFiles<ProjectImage>(keys(id));
      expect(files.map((file) => file && { ...file, blob: null })).toEqual([
        { id: `${id}:1`, projectId: id, n: 1, blob: null, width: 640, height: 480, kind: 'pdf' },
        { id: `${id}:2`, projectId: id, n: 2, blob: null, width: 640, height: 480, kind: 'pdf' },
      ]);
      expect(await bytesOf(files[1]?.blob)).toEqual([4, 5, 6, 7]);
      expect(track).toHaveBeenCalledWith('pdf_imported', { pages: 1, images: 2 });
    });

    it('ouvre le projet sans photos si l’écriture avorte, le dit, et n’écrit rien à moitié', async () => {
      const store = TestBed.inject(ReaderStore);
      const db = TestBed.inject(ProjectStoreService);
      await store.initialize();
      idb.failWrites = true;

      await store.importPdf(pdfFile());
      const id = store.currentId()!;

      expect(store.pdfError()).toBeNull();
      expect(store.total()).toBe(3);
      expect(store.imageCount()).toBe(0);
      expect(store.pdfImagesNote()).toBe('non-enregistrees');
      expect(await db.list()).toEqual([]);
      expect(await db.getFiles(keys(id))).toEqual([undefined, undefined]);

      // Le quota libéré, le patron s'enregistre sans photos : il n'est pas perdu.
      idb.failWrites = false;
      store.move(1);
      await vi.waitFor(async () => {
        const list = await db.list<Project>();
        expect(list.map((p) => [p.id, p.imageCount, p.stepIndex])).toEqual([[id, 0, 1]]);
      });
    });

    it('supprime les photos avec le projet', async () => {
      const store = TestBed.inject(ReaderStore);
      const db = TestBed.inject(ProjectStoreService);
      await store.initialize();
      await store.importPdf(pdfFile());
      const id = store.currentId()!;
      expect((await db.getFiles(keys(id))).filter(Boolean).length).toBe(2);

      await store.removeProject(id);

      expect(await db.getFiles(keys(id))).toEqual([undefined, undefined]);
      expect(await db.list()).toEqual([]);
    });

    it('exporte une sauvegarde v2 et la réimporte à l’identique sur un profil vide', async () => {
      const store = TestBed.inject(ReaderStore);
      await store.initialize();
      await store.importPdf(pdfFile());
      const id = store.currentId()!;
      await vi.waitFor(() => expect(store.projects().length).toBe(1));
      const projects = store.projects();
      const text = await (await store.exportBackup()).text();
      expect(JSON.parse(text).version).toBe(2);

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

      await expect(fresh.importBackup(new File([text], 'sauvegarde.json'))).resolves.toBe(true);

      expect(fresh.projects()).toEqual(projects);
      const files = await TestBed.inject(ProjectStoreService).getFiles<ProjectImage>(keys(id));
      expect(files.map((file) => [file?.n, file?.width, file?.blob.type])).toEqual([
        [1, 640, 'image/jpeg'],
        [2, 640, 'image/jpeg'],
      ]);
      expect(await bytesOf(files[0]?.blob)).toEqual([1, 2, 3]);
      expect(await bytesOf(files[1]?.blob)).toEqual([4, 5, 6, 7]);
    });

    it('accepte toujours une sauvegarde v1, sans photos', async () => {
      const store = TestBed.inject(ReaderStore);
      await store.initialize();
      const v1: Record<string, unknown> = { ...projectFixture({ id: 'ancien' }) };
      delete v1['imageCount'];
      const file = new File([JSON.stringify({ version: 1, projects: [v1] })], 'v1.json');

      await expect(store.importBackup(file)).resolves.toBe(true);
      expect(store.projects().map((p) => [p.id, p.imageCount])).toEqual([['ancien', 0]]);
    });

    it('révoque les adresses des photos quand on change de projet', async () => {
      const created: string[] = [];
      const revoke = vi.fn();
      TestBed.overrideProvider(ObjectUrlService, {
        useValue: {
          create: () => {
            created.push(`blob:${created.length + 1}`);
            return created[created.length - 1];
          },
          revoke,
        },
      });
      const store = TestBed.inject(ReaderStore);
      await store.initialize();
      await store.importPdf(pdfFile());
      await vi.waitFor(() => expect(store.imageUrls()).toEqual(['blob:1', 'blob:2']));

      store.load('Rang 1 : 6 ms\nRang 2 : 12 ms');
      TestBed.tick();

      await vi.waitFor(() => expect(store.imageUrls()).toEqual([]));
      expect(revoke.mock.calls.map(([url]) => url)).toEqual(['blob:1', 'blob:2']);
    });
  });
});

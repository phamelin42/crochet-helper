import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { readFavorites, writeFavorites } from '../../../core/storage/favorites-db';
import { ProjectStoreService } from '../../../core/storage/project-store.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { Favorite, MAX_FAVORITES, PatternOrigin } from '../../discover/data/favorite.model';
import { BACKUP_SCHEMA_VERSION, parseBackup } from '../data/project-backup';
import { Project } from '../data/project.model';
import { ReaderStore } from './reader-store';

const PERMALINK = 'https://www.ravelry.com/patterns/library/petit-sapin';

function favori(id: number, addedAt = 1000): Favorite {
  return {
    id: String(id),
    name: `Patron ${id}`,
    designer: 'Camille Exemple',
    thumbnail: null,
    permalink: `${PERMALINK}-${id}`,
    addedAt,
  };
}

function projet(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p',
    name: 'Sapin',
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
    ...overrides,
  };
}

const ORIGINE: PatternOrigin = {
  source: 'ravelry',
  id: '101',
  name: 'Petit sapin',
  designer: 'Camille Exemple',
  permalink: PERMALINK,
  photoUrl: null,
};

const fichier = (corps: unknown) => new File([JSON.stringify(corps)], 'sauvegarde.json');

describe('sauvegarde : favoris et origine Ravelry', () => {
  describe('validation', () => {
    const sauvegarde = (extra: Record<string, unknown>, projects: unknown[] = [projet()]) => ({
      version: BACKUP_SCHEMA_VERSION,
      projects,
      images: [],
      ...extra,
    });

    it('une ancienne sauvegarde sans favoris s’importe toujours (versions 1 et 2)', () => {
      for (const version of [1, 2]) {
        const parsed = parseBackup({ version, projects: [projet()] });
        expect(parsed?.projects).toHaveLength(1);
        expect(parsed?.favorites ?? []).toEqual([]);
      }
    });

    it('accepte des favoris valides et les garde', () => {
      expect(parseBackup(sauvegarde({ favorites: [favori(1), favori(2)] }))?.favorites).toEqual([
        favori(1),
        favori(2),
      ]);
    });

    it('un favori en double n’est gardé qu’une fois, le plus récent', () => {
      const parsed = parseBackup(sauvegarde({ favorites: [favori(1, 5), favori(1, 9)] }));
      expect(parsed?.favorites).toEqual([favori(1, 9)]);
    });

    it.each([
      ['pas un tableau', 'x'],
      ['un favori mal formé', [{ ...favori(1), permalink: 'https://evil.example/x' }]],
      ['un élément nul', [null]],
    ])('refuse la sauvegarde entière avec %s', (_nom, favorites) => {
      expect(parseBackup(sauvegarde({ favorites }))).toBeNull();
    });

    it('refuse plus de favoris que la borne', () => {
      const trop = Array.from({ length: MAX_FAVORITES + 1 }, (_, i) => favori(i + 1));
      expect(parseBackup(sauvegarde({ favorites: trop }))).toBeNull();
      const juste = trop.slice(0, MAX_FAVORITES);
      expect(parseBackup(sauvegarde({ favorites: juste }))?.favorites).toHaveLength(MAX_FAVORITES);
    });

    it('un fichier d’avant les favoris ne peut pas en porter', () => {
      expect(parseBackup({ version: 2, projects: [projet()], favorites: [favori(1)] })).toBeNull();
    });

    it('garde l’origine Ravelry d’un projet, et refuse une origine mal formée', () => {
      expect(
        parseBackup(sauvegarde({}, [projet({ origin: ORIGINE })]))?.projects[0].origin,
      ).toEqual(ORIGINE);
      const mauvaise = projet({ origin: { ...ORIGINE, permalink: 'https://evil.example/x' } });
      expect(parseBackup(sauvegarde({}, [mauvaise]))).toBeNull();
    });

    it('accepte un projet sans origine (ancien projet)', () => {
      const parsed = parseBackup(sauvegarde({}));
      expect(parsed?.projects[0].origin).toBeUndefined();
    });
  });

  describe('aller-retour par le lecteur', () => {
    const providers = [
      { provide: PLATFORM_ID, useValue: 'browser' },
      { provide: AnalyticsService, useValue: { track: vi.fn() } },
    ];

    beforeEach(() => {
      installFakeIndexedDb();
      localStorage.clear();
    });
    afterEach(() => {
      uninstallFakeIndexedDb();
      localStorage.clear();
    });

    async function lecteur() {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers });
      const store = TestBed.inject(ReaderStore);
      await store.initialize();
      const projets = TestBed.inject(ProjectStoreService);
      const base = Object.assign(projets, {
        listFavorites: async <T>() => readFavorites<T>(await projets.db()),
        putFavorites: async <T extends { id: string }>(items: readonly T[]) =>
          writeFavorites(await projets.db(), items),
      });
      return { store, base };
    }

    it('les favoris de l’appareil partent dans la sauvegarde et reviennent sur un autre', async () => {
      const a = await lecteur();
      await a.base.putFavorites([favori(1), favori(2)]);
      const texte = await (await a.store.exportBackup()).text();
      expect(JSON.parse(texte).favorites).toHaveLength(2);

      uninstallFakeIndexedDb();
      installFakeIndexedDb();
      const b = await lecteur();
      expect(await b.store.importBackup(new File([texte], 's.json'))).toBe(true);
      expect((await b.base.listFavorites<Favorite>()).map((f) => f.id).sort()).toEqual(['1', '2']);
    });

    it('l’import fusionne : un favori déjà là garde sa date la plus récente, aucun n’est perdu', async () => {
      const { store, base } = await lecteur();
      await base.putFavorites([favori(1, 9000), favori(3, 1)]);
      const ok = await store.importBackup(
        fichier({
          version: BACKUP_SCHEMA_VERSION,
          projects: [],
          images: [],
          favorites: [favori(1, 5), favori(2, 7)],
        }),
      );
      expect(ok).toBe(true);
      const tous = await base.listFavorites<Favorite>();
      expect(tous.map((f) => f.id).sort()).toEqual(['1', '2', '3']);
      expect(tous.find((f) => f.id === '1')?.addedAt).toBe(9000);
    });

    it('une ancienne sauvegarde importée ne touche pas aux favoris de l’appareil', async () => {
      const { store, base } = await lecteur();
      await base.putFavorites([favori(1)]);
      expect(await store.importBackup(fichier({ version: 2, projects: [projet()] }))).toBe(true);
      expect((await base.listFavorites<Favorite>()).map((f) => f.id)).toEqual(['1']);
    });

    it('un projet d’origine Ravelry garde son origine à l’export puis à l’import', async () => {
      const a = await lecteur();
      a.store.load('Rang 1 : 6 ms');
      await vi.waitFor(async () => expect(await a.base.list()).toHaveLength(1));
      const [enregistre] = await a.base.list<Project>();
      await a.base.putAll([{ ...enregistre, origin: ORIGINE }]);
      await a.store.initialize();
      const texte = await (await a.store.exportBackup()).text();
      expect(JSON.parse(texte).projects[0].origin).toEqual(ORIGINE);
    });
  });
});

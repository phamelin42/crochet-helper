import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { ProjectStoreService } from '../../../core/storage/project-store.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { ColorGrid } from '../data/color-grid';
import type { Project } from '../data/project.model';
import { ReaderStore } from './reader-store';

const GRID: ColorGrid = {
  width: 10,
  height: 4,
  palette: ['#ffffff', '#000000', '#c81e1e'],
  cells: Uint8Array.from({ length: 40 }, (_, i) => i % 3),
  worked: 'round',
};

describe('ReaderStore — openFromGrid', () => {
  let track: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    installFakeIndexedDb();
    localStorage.clear();
    track = vi.fn();
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

  async function setup() {
    const store = TestBed.inject(ReaderStore);
    TestBed.tick();
    await store.initialize();
    return store;
  }

  it('ouvre un nouveau projet sans toucher au projet actif, une fois les deux écrits', async () => {
    const store = await setup();
    store.load('Rang 1 : 6 ms (6)');
    const oldId = store.currentId()!;
    await vi.waitFor(async () =>
      expect((await TestBed.inject(ProjectStoreService).list<Project>()).map((p) => p.id)).toEqual([
        oldId,
      ]),
    );

    expect(await store.openFromGrid(GRID, 'Mon chat')).toBe(true);
    const newId = store.currentId()!;
    expect(newId).not.toBe(oldId);

    await vi.waitFor(async () => {
      const projects = await TestBed.inject(ProjectStoreService).list<Project>();
      expect(projects.map((p) => p.id).sort()).toEqual([oldId, newId].sort());
    });
    const projects = await TestBed.inject(ProjectStoreService).list<Project>();
    const old = projects.find((p) => p.id === oldId)!;
    const created = projects.find((p) => p.id === newId)!;
    expect(old.source).toBe('Rang 1 : 6 ms (6)');
    expect(old.name).not.toBe('Mon chat');
    expect(created.name).toBe('Mon chat');
    expect(created.source.split('\n')).toHaveLength(4);
    expect(created.source.startsWith('Row 1: ')).toBe(true);
    expect(created.view).toBe('chart');
    expect(created.grid?.cells).toBeTruthy();
  });

  it('borne le nom à 60 caractères', async () => {
    const store = await setup();
    await store.openFromGrid(GRID, 'x'.repeat(100));
    await vi.waitFor(async () => {
      const [project] = await TestBed.inject(ProjectStoreService).list<Project>();
      expect(project.name).toBe('x'.repeat(60));
    });
  });

  it('mesure la grille sans jamais dire l’image ni ses couleurs', async () => {
    const store = await setup();
    await store.openFromGrid({ ...GRID, width: 40, cells: new Uint8Array(160) }, 'chat');
    expect(track).toHaveBeenCalledWith('grid_created', {
      width: 40,
      colors: 3,
      worked: 'round',
      origine: 'lecteur',
    });
  });
});

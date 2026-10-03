import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { ProjectStoreService } from '../../../core/storage/project-store.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { ColorGrid, gridToText } from '../data/color-grid';
import { Project } from '../data/project.model';
import { ReaderStore } from './reader-store';

const GRID: ColorGrid = {
  width: 12,
  height: 5,
  palette: ['#ffffff', '#336699'],
  cells: Uint8Array.from({ length: 60 }, (_, i) => (i % 3 ? 0 : 1)),
  worked: 'flat',
};
const PATTERN = 'Patron\nRound 1: 6 sc (6)\nRound 2: 12 sc (12)';

describe('ReaderStore.openFromGrid', () => {
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

  it('ouvre un nouveau projet grille, nommé d’après le fichier ; le projet actif reste intact', async () => {
    const store = TestBed.inject(ReaderStore);
    const db = TestBed.inject(ProjectStoreService);
    TestBed.tick();
    await store.initialize();
    store.load(PATTERN);
    store.move(1);
    const before = store.currentId();
    TestBed.tick();
    await vi.waitFor(async () => expect((await db.list<Project>())[0]?.stepIndex).toBe(1));

    const saved = await store.openFromGrid(
      GRID,
      gridToText(GRID, 'fr'),
      'renard-' + 'x'.repeat(80),
    );
    TestBed.tick();

    expect(saved).toBe(true);
    expect(store.currentId()).not.toBe(before);
    expect(store.view()).toBe('chart');
    await vi.waitFor(async () => {
      const projects = await db.list<Project>();
      expect(projects).toHaveLength(2);
      const old = projects.find((p) => p.id === before);
      expect(old).toMatchObject({ source: PATTERN, stepIndex: 1 });
      expect(old?.grid).toBeUndefined();
      const created = projects.find((p) => p.id !== before)!;
      expect(created.name).toHaveLength(60);
      expect(created.name.startsWith('renard-')).toBe(true);
      expect(created.view).toBe('chart');
      expect(created.source).toBe(gridToText(GRID, 'fr'));
    });
    expect(track).toHaveBeenCalledWith('grid_created', { width: 10, colors: 2, worked: 'flat' });
  });
});

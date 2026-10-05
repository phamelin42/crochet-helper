import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { ProjectStoreService } from '../../../core/storage/project-store.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { parseBackup } from '../data/project-backup';
import { Project, ProjectImage } from '../data/project.model';
import { ReaderStore } from './reader-store';

/**
 * Diagrammes joints à un projet avant le retrait de cette fonction : plus
 * jamais affichés, mais leurs fichiers partent avec le projet, et une
 * ancienne sauvegarde qui en contient s'importe toujours.
 */
const PROJECT: Project = {
  id: 'ancien',
  name: 'Ancien',
  source: 'Patron\nRound 1: 6 sc (6)\nRound 2: 12 sc (12)',
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
  chartCount: 2,
};
const chartFile = (n: number): ProjectImage => ({
  id: `ancien:chart:${n}`,
  projectId: 'ancien',
  n,
  blob: new Blob([new Uint8Array([n])], { type: 'image/jpeg' }),
  width: 10,
  height: 10,
  kind: 'chart',
});

describe('ReaderStore — anciens diagrammes joints', () => {
  beforeEach(() => {
    installFakeIndexedDb();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AnalyticsService, useValue: { track: vi.fn() } },
      ],
    });
  });

  afterEach(() => {
    uninstallFakeIndexedDb();
    localStorage.clear();
  });

  it('garde leur compte quand le projet avance, et efface leurs fichiers avec lui', async () => {
    const db = TestBed.inject(ProjectStoreService);
    await db.putAll([PROJECT], [chartFile(1), chartFile(2)]);
    const store = TestBed.inject(ReaderStore);
    await store.initialize();
    store.resumeProject('ancien');
    store.move(1);
    TestBed.tick();
    await vi.waitFor(async () => {
      const [saved] = await db.list<Project>();
      expect(saved).toMatchObject({ stepIndex: 1, chartCount: 2 });
    });

    await store.removeProject('ancien');

    expect(await db.getFiles(['ancien:chart:1', 'ancien:chart:2'])).toEqual([undefined, undefined]);
  });

  it('ne les met pas dans une nouvelle sauvegarde', async () => {
    const db = TestBed.inject(ProjectStoreService);
    await db.putAll([PROJECT], [chartFile(1), chartFile(2)]);
    const store = TestBed.inject(ReaderStore);
    await store.initialize();

    const backup = JSON.parse(await (await store.exportBackup()).text());

    expect(backup.projects).toHaveLength(1);
    expect(backup.images).toEqual([]);
  });
});

describe('parseBackup — ancienne sauvegarde avec diagrammes joints', () => {
  const image = (overrides: Record<string, unknown> = {}) => ({
    id: 'ancien:chart:1',
    projectId: 'ancien',
    n: 1,
    width: 10,
    height: 10,
    kind: 'chart',
    type: 'image/jpeg',
    data: 'AAAA',
    ...overrides,
  });
  const photo = image({ id: 'ancien:1', kind: 'pdf' });
  const withPins = { ...PROJECT, charts: { 0: 1 } };

  it('reste acceptée : les projets et leurs photos passent, diagrammes et épingles sont écartés', () => {
    const parsed = parseBackup({ version: 2, projects: [withPins], images: [image(), photo] });

    expect(parsed?.projects).toHaveLength(1);
    expect(parsed?.projects[0]).not.toHaveProperty('charts');
    expect(parsed?.images.map((i) => i.kind)).toEqual(['pdf']);
  });

  it('refuse toujours en bloc un diagramme mal formé ou trop lourd', () => {
    const huge = 'A'.repeat(9 * 1024 * 1024);
    for (const bad of [
      image({ id: 'ancien:1' }),
      image({ kind: 'autre' }),
      image({ data: huge }),
    ]) {
      expect(parseBackup({ version: 2, projects: [withPins], images: [bad] })).toBeNull();
    }
  });
});

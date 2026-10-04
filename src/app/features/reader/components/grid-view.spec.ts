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
import { ReaderStore } from '../state/reader-store';
import { GridView } from './grid-view';

// Rang 1 (en bas) : AAAABB — rang 2 : BBAAAA — rang 3 : AABBAA — rang 4 : ABABAB.
const ROWS = ['AAAABB', 'BBAAAA', 'AABBAA', 'ABABAB'];
const GRID: ColorGrid = {
  width: 6,
  height: 4,
  palette: ['#ffffff', '#336699'],
  cells: Uint8Array.from(ROWS.flatMap((row) => [...row].map((c) => c.charCodeAt(0) - 65))),
  worked: 'flat',
};

describe('GridView', () => {
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
    // Le premier `tick` lance l'initialisation différée : mieux vaut qu'elle passe
    // avant le patron, sinon elle réhydrate l'état enregistré par-dessus.
    TestBed.tick();
    await store.initialize();
    await store.openGrid(GRID, gridToText(GRID, 'en'));
    const fixture = TestBed.createComponent(GridView);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const svg = host.querySelector('svg.grid-svg')!;
    /** Touche la maille dessinée à la colonne `column` du rang `row` (à partir de 0, rang 1 en bas). */
    const tap = (row: number, column: number) => {
      // Gouttière 44, bandeau haut 28, maille 32 : le centre de la maille touchée.
      const clientX = 44 + column * 32 + 16;
      const clientY = 28 + (GRID.height - 1 - row) * 32 + 16;
      svg.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX, clientY }));
      fixture.detectChanges();
    };
    const help = () => host.querySelector('.grid-help')!.textContent!.trim();
    return { store, fixture, host, tap, help };
  }

  it('dessine une maille par case, dans la couleur de la palette', async () => {
    const { host } = await setup();
    const fills = Array.from(host.querySelectorAll('svg.grid-svg > rect'))
      .slice(0, 24)
      .map((rect) => rect.getAttribute('fill'));
    expect(fills).toHaveLength(24);
    expect(new Set(fills)).toEqual(new Set(['#ffffff', '#336699']));
  });

  it('au rang 2, travaillé de gauche à droite, toucher la première maille donne la position 0', async () => {
    const { store, tap, help } = await setup();
    tap(1, 0);
    expect(store.stepIndex()).toBe(1);
    expect(store.stitchIndex()).toBe(0);
    // Dessiné BBAAAA : un B encore, puis A.
    expect(help()).toBe('Row 2 · stitch 1 of 6 · another 1 in B, then A');
  });

  it('au rang 1, travaillé de droite à gauche, la maille du bord droit est la première', async () => {
    const { store, tap, help } = await setup();
    tap(0, 5);
    expect(store.stepIndex()).toBe(0);
    expect(store.stitchIndex()).toBe(0);
    // Le rang 1 se lit BBAAAA : le B suivant, puis A.
    expect(help()).toBe('Row 1 · stitch 1 of 6 · another 1 in B, then A');
  });

  it('annonce un changement immédiat, puis la fin du rang', async () => {
    const { tap, help } = await setup();
    tap(0, 4); // deuxième B du rang 1
    expect(help()).toBe('Row 1 · stitch 2 of 6 · then A');
    tap(0, 0);
    expect(help()).toBe('Row 1 · stitch 6 of 6 · row finished');
  });

  it('une seule mesure par rang et par session', async () => {
    const { tap } = await setup();
    tap(1, 0);
    tap(1, 3);
    tap(2, 1);
    const marks = track.mock.calls.filter(([name]) => name === 'grid_stitch_marked');
    expect(marks).toHaveLength(2);
  });

  it('la maille touchée est écrite avec la grille : relue par la base, rien ne manque', async () => {
    const { store, tap } = await setup();
    // Rang 3 : travaillé de droite à gauche, la deuxième colonne est la cinquième maille.
    tap(2, 1);
    TestBed.tick();
    const db = TestBed.inject(ProjectStoreService);
    await vi.waitFor(async () => {
      const [saved] = await db.list<Project>();
      expect(saved.stepIndex).toBe(2);
      expect(saved.stitch).toBe(4);
    });
    const [saved] = await db.list<Project>();
    expect(saved.grid?.width).toBe(6);
    expect(Array.from(saved.grid!.cells)).toEqual(Array.from(GRID.cells));
    expect(saved.source).toBe(gridToText(GRID, 'en'));
    expect(store.view()).toBe('chart');
  });

  it('la légende donne le nombre de mailles de chaque couleur', async () => {
    const { host } = await setup();
    const items = Array.from(host.querySelectorAll('.grid-legend li')).map((li) =>
      li.textContent!.replace(/\s+/g, ' ').trim(),
    );
    expect(items).toEqual(['A · 15 stitches', 'B · 9 stitches']);
  });

  /** Un cadre de 140 × 40 px, la grille (280 × 160 à l'échelle 1) débordant en hauteur. */
  function frameOf(host: HTMLElement) {
    const frame = host.querySelector<HTMLElement>('.chart-frame')!;
    for (const [key, value] of [
      ['clientWidth', 140],
      ['clientHeight', 40],
      ['scrollHeight', 160],
    ] as const) {
      Object.defineProperty(frame, key, { configurable: true, value });
    }
  }
  const button = (host: HTMLElement, label: string) =>
    Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === label,
    )!;
  const svgWidth = (host: HTMLElement) =>
    Number(host.querySelector('svg.grid-svg')!.getAttribute('width'));

  it('« Whole grid » fait tenir la grille entière dans le cadre, même sous 50 %', async () => {
    const { fixture, host } = await setup();
    frameOf(host);

    button(host, 'Whole grid').click();
    fixture.detectChanges();

    // 40 / 160 = 25 % : la hauteur est la contrainte, et tout le dessin est visible.
    expect(svgWidth(host)).toBe(280 * 0.25);
    expect(button(host, 'Zoom out').disabled).toBe(true);
  });

  it('« Zoom out » descend sous 50 % jusqu’à la grille entière, pas au-delà', async () => {
    const { fixture, host } = await setup();
    frameOf(host);
    for (let i = 0; i < 5; i++) {
      button(host, 'Zoom out').click();
      fixture.detectChanges();
    }
    expect(svgWidth(host)).toBe(280 * 0.25);
    expect(button(host, 'Zoom out').disabled).toBe(true);
  });
});

import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { ColorGrid, gridToText } from '../data/color-grid';
import { ReaderStore } from '../state/reader-store';
import { StepView } from './step-view';

const GRID: ColorGrid = {
  width: 4,
  height: 2,
  palette: ['#ffffff', '#336699'],
  cells: Uint8Array.from([0, 0, 1, 1, 1, 1, 0, 0]),
  worked: 'flat',
};

const labels = (host: HTMLElement) =>
  [...host.querySelectorAll('button')].map((button) => button.textContent!.trim());

describe('StepView', () => {
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

  async function setup() {
    const store = TestBed.inject(ReaderStore);
    TestBed.tick();
    await store.initialize();
    const fixture = TestBed.createComponent(StepView);
    const host = fixture.nativeElement as HTMLElement;
    return { store, fixture, host };
  }

  it('en vue texte, « Précédent » et « Suivant » mènent la lecture', async () => {
    const { store, fixture, host } = await setup();
    store.load('Rang 1 : 6 ms\nRang 2 : 6 aug');
    fixture.detectChanges();

    expect(host.querySelector('.navrow')).toBeTruthy();
  });

  it('en vue grille, seule la barre de la grille reste : pas de « Précédent » ni « Suivant » en double', async () => {
    const { store, fixture, host } = await setup();
    await store.openGrid(GRID, gridToText(GRID, 'en'));
    fixture.detectChanges();

    // La grille se charge par `import()` : attendre sa barre.
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(host.querySelector('.chart-toolbar')).toBeTruthy();
    });

    expect(host.querySelector('.navrow')).toBeNull();
    const toolbar = host.querySelector('.chart-toolbar')!;
    expect(toolbar.querySelectorAll('button')).toHaveLength(3);
    expect(
      labels(host).filter((label) => /^(Précédente?|Suivante?|Previous|Next)$/.test(label)),
    ).toEqual([]);
  });
});

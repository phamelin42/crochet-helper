import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { ReaderStore } from '../state/reader-store';
import { ChartPanel } from './chart-panel';

const TWO_PIECES = ['Patron', 'Piece A', 'Round 1: 6 sc (6)', 'Piece B', 'Round 1: 6 sc (6)'].join(
  '\n',
);

const chart = () => ({
  blob: new Blob([new Uint8Array([1])], { type: 'image/jpeg' }),
  width: 1200,
  height: 800,
});

describe('ChartPanel', () => {
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

  /** Deux diagrammes : le 1 pour la pièce A, le 2 pour la pièce B. */
  async function setup() {
    const store = TestBed.inject(ReaderStore);
    await store.initialize();
    store.load(TWO_PIECES);
    await store.addCharts([chart(), chart()], 'pdf');
    store.pinChart(1, 2);
    const fixture = TestBed.createComponent(ChartPanel);
    fixture.detectChanges();
    await vi.waitFor(() => expect(store.chartFiles().filter(Boolean)).toHaveLength(2));
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const shownLabel = () => host.querySelector('.chart-frame')?.getAttribute('aria-label') ?? null;
    return { fixture, store, host, shownLabel };
  }

  it('montre le diagramme épinglé à la pièce en cours, et change avec elle', async () => {
    const { fixture, store, shownLabel } = await setup();
    expect(shownLabel()).toBe('Chart 1');

    store.selectPiece(1);
    fixture.detectChanges();

    expect(shownLabel()).toBe('Chart 2');
  });

  it('s’ouvre d’office quand la pièce a son diagramme', async () => {
    const { host } = await setup();

    expect(host.querySelector('details')?.open).toBe(true);
  });

  it('dit qu’une pièce n’a pas de diagramme et propose ceux qui existent', async () => {
    const { fixture, store, host, shownLabel } = await setup();
    store.charts.set({ 0: 1 });
    store.selectPiece(1);
    fixture.detectChanges();

    expect(shownLabel()).toBeNull();
    expect(host.textContent).toContain('No chart for this piece');
    const picks = Array.from(host.querySelectorAll('.chart-pick button'));
    expect(picks.map((b) => b.textContent?.trim())).toEqual(['Chart 1', 'Chart 2']);

    (picks[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(shownLabel()).toBe('Chart 2');
  });

  it('épingler à une autre pièce déplace le diagramme, sans le faire disparaître de l’écran', async () => {
    const { fixture, store, host, shownLabel } = await setup();
    const radios = Array.from(host.querySelectorAll<HTMLInputElement>('.chart-for input'));
    expect(radios.map((r) => r.checked)).toEqual([true, false]);

    radios[1].click();
    radios[1].dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(store.charts()).toEqual({ 1: 1 });
    expect(shownLabel()).toBe('Chart 1');
  });
});

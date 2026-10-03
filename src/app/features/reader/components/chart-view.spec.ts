import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { TooltipService } from '../../../shared/ui/tooltip/tooltip.service';
import { ReaderStore } from '../state/reader-store';
import { ChartView } from './chart-view';

const PATTERN = ['Patron', 'Round 1: 6 sc (6)', 'Round 2: 12 sc (12)'].join('\n');

describe('ChartView', () => {
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
    await store.initialize();
    store.load(PATTERN);
    await vi.waitFor(() => expect(store.pieceChart()).not.toBeNull());
    const fixture = TestBed.createComponent(ChartView);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const cells = () => Array.from(host.querySelectorAll<SVGGElement>('.chart-cell'));
    const label = () => host.querySelector('svg')!.getAttribute('aria-label');
    return { store, fixture, host, cells, label };
  }

  it('dessine une maille par symbole, 6 puis 12', async () => {
    const { cells } = await setup();
    expect(cells()).toHaveLength(18);
  });

  it('toucher une maille y place la progression : tour 2, maille 5', async () => {
    const { store, fixture, cells, label } = await setup();

    cells()[6 + 4].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(store.stepIndex()).toBe(1);
    expect(store.stitchIndex()).toBe(4);
    expect(label()).toBe('Round 2 of 2, stitch 5 of 12');
  });

  it('la flèche droite passe à la maille suivante, la gauche revient, même d’un tour à l’autre', async () => {
    const { store, fixture, host } = await setup();
    const frame = host.querySelector<HTMLElement>('.chart-frame')!;
    const press = (key: string) => {
      frame.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };

    press('ArrowRight');
    expect(store.stitchIndex()).toBe(1);

    for (let i = 0; i < 5; i++) press('ArrowRight');
    expect([store.stepIndex(), store.stitchIndex()]).toEqual([1, 0]);

    press('ArrowLeft');
    expect([store.stepIndex(), store.stitchIndex()]).toEqual([0, 5]);
  });

  it('marque la maille courante et grise les tours qui ne sont pas en cours', async () => {
    const { store, fixture, host, cells } = await setup();
    store.markStitch(1, 3);
    fixture.detectChanges();

    expect(host.querySelectorAll('.chart-mark')).toHaveLength(1);
    expect(cells().filter((cell) => cell.classList.contains('is-off'))).toHaveLength(6);
    // Les trois premières mailles du tour sont faites.
    expect(
      cells().filter(
        (cell) => cell.classList.contains('is-done') && !cell.classList.contains('is-off'),
      ),
    ).toHaveLength(3);
  });

  it('annonce la maille dans une région aria-live', async () => {
    const { host } = await setup();
    expect(host.querySelector('[aria-live="polite"]')?.textContent).toContain('stitch 1 of 6');
  });

  it('dit quelle maille est survolée, au pointeur fin', async () => {
    const { cells } = await setup();
    const tooltips = TestBed.inject(TooltipService);

    cells()[1].dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));

    expect(tooltips.state()).toMatchObject({
      term: 'Round 1 · stitch 2',
      definition: 'sc, single crochet (UK double crochet)',
    });
  });

  it('n’ouvre pas d’infobulle quand la page a bougé sous un curseur immobile', async () => {
    const { cells } = await setup();
    const tooltips = TestBed.inject(TooltipService);
    tooltips.notePress(new PointerEvent('pointerdown', { clientX: 40, clientY: 50 }));

    cells()[1].dispatchEvent(
      new PointerEvent('pointerenter', { pointerType: 'mouse', clientX: 40, clientY: 50 }),
    );

    expect(tooltips.state()).toBeNull();
  });

  it('n’ouvre pas d’infobulle au toucher', async () => {
    const { cells } = await setup();
    const tooltips = TestBed.inject(TooltipService);

    cells()[1].dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }));

    expect(tooltips.state()).toBeNull();
  });
});

import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { DisplayPrefsService } from '../../../core/platform/display-prefs.service';
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

  describe('Échap', () => {
    function escape(target: EventTarget): void {
      target.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    }

    it('quitte la page pleine quand rien d’autre n’est ouvert', async () => {
      const { store, fixture } = await setup();
      store.load('Rang 1 : 6 ms\nRang 2 : 6 aug');
      fixture.detectChanges();
      const prefs = TestBed.inject(DisplayPrefsService);
      expect(prefs.focus()).toBe(true);

      escape(document.body);

      expect(prefs.focus()).toBe(false);
    });

    it('dans une boîte de dialogue ouverte, ferme seulement la boîte : la page pleine reste', async () => {
      const { store, fixture } = await setup();
      store.load('Rang 1 : 6 ms\nRang 2 : 6 aug');
      fixture.detectChanges();
      const prefs = TestBed.inject(DisplayPrefsService);
      const dialog = document.createElement('dialog');
      dialog.setAttribute('open', '');
      dialog.innerHTML = '<button type="button">Annuler</button>';
      document.body.appendChild(dialog);
      try {
        escape(dialog.querySelector('button')!);
        escape(document.body);

        expect(prefs.focus()).toBe(true);
      } finally {
        dialog.remove();
      }
    });
  });

  it('le bouton de la page pleine n’est pas un bouton à bascule : son libellé change, pas son état annoncé', async () => {
    const { store, fixture, host } = await setup();
    store.load('Rang 1 : 6 ms\nRang 2 : 6 aug');
    const prefs = TestBed.inject(DisplayPrefsService);
    for (const focus of [true, false]) {
      prefs.setFocus(focus);
      fixture.detectChanges();

      const toggle = host.querySelector('.focus-toggle');
      expect(toggle?.hasAttribute('aria-pressed'), `page pleine : ${focus}`).toBe(false);
      expect(toggle?.getAttribute('aria-label')).toBe(focus ? 'Exit full page' : 'Full page');
    }
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

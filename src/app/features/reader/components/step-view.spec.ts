import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DisplayPrefsService } from '../../../core/platform/display-prefs.service';
import { TooltipService } from '../../../shared/ui/tooltip/tooltip.service';
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
      // Un libellé visible en toutes lettres, jamais une icône seule (fiche 59).
      expect(toggle?.textContent?.trim()).toBe(focus ? 'Exit full page' : 'Full page');
    }
  });

  it('le libellé du rang s’affiche en grand, la position en petit ; sans libellé, la position seule', async () => {
    const { store, fixture, host } = await setup();
    store.load('Rang 1 : 6 ms\nRangs 2 à 4 : 12 ms\nArrêter le fil et rentrer les bouts.');
    store.goTo(2, 'list');
    fixture.detectChanges();

    expect(host.querySelector('.steplabel')?.textContent?.trim()).toBe('Rang 2–4');
    expect(host.querySelector('.stepcount')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Step 2 of 3',
    );

    store.goTo(3, 'list');
    fixture.detectChanges();

    expect(host.querySelector('.steplabel')).toBeNull();
    expect(host.querySelector('.stepcount')?.textContent).toContain('Step 3 of 3');
  });

  it('le texte de l’étape ne change pas de taille avec sa longueur, et défile dans son cadre', async () => {
    const { store, fixture, host } = await setup();
    for (const chars of [30, 60, 90, 120, 200]) {
      store.load(`Rang 1 : ${'ms, '.repeat(Math.ceil(chars / 4)).slice(0, chars)}`);
      fixture.detectChanges();

      const body = host.querySelector('.step-body')!;
      // Plus de palier `long`, `longer`, `longest` : la taille ne rétrécit jamais.
      expect([...body.classList], `${chars} signes`).toEqual(['step-body']);
      expect(body.getAttribute('tabindex')).toBe('0');
    }
  });

  it('la phrase de la page pleine ne s’affiche que la première fois, et disparaît au premier geste', async () => {
    const { store, fixture, host } = await setup();
    const prefs = TestBed.inject(DisplayPrefsService);
    store.load('Rang 1 : 6 ms\nRang 2 : 6 aug');
    prefs.focusHintSeen.set(false);
    prefs.setFocus(true);
    fixture.detectChanges();
    expect(host.querySelector('.focus-hint')).toBeTruthy();

    host.querySelector<HTMLButtonElement>('.navrow .next')!.click();
    fixture.detectChanges();

    expect(host.querySelector('.focus-hint')).toBeNull();
    expect(JSON.parse(localStorage.getItem('fil.focusHintSeen')!)).toBe(true);
  });

  it('en page complète, la phrase de la page pleine n’apparaît pas', async () => {
    const { store, fixture, host } = await setup();
    const prefs = TestBed.inject(DisplayPrefsService);
    store.load('Rang 1 : 6 ms\nRang 2 : 6 aug');
    prefs.focusHintSeen.set(false);
    prefs.setFocus(false);
    fixture.detectChanges();

    expect(host.querySelector('.focus-hint')).toBeNull();
  });

  it('Échap avec une infobulle ouverte ne quitte pas la page pleine', async () => {
    const { store, fixture } = await setup();
    store.load('Rang 1 : 6 ms\nRang 2 : 6 aug');
    fixture.detectChanges();
    const prefs = TestBed.inject(DisplayPrefsService);
    const tooltips = TestBed.inject(TooltipService);
    tooltips.showFor(document.body, 'ms', 'maille serrée');

    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );

    expect(prefs.focus()).toBe(true);
  });

  describe('aide de l’état vide', () => {
    const BUTTONS: Record<'fr' | 'en', string> = { fr: 'grands boutons', en: 'big buttons' };
    const ARROWS = '← →';

    for (const locale of ['fr', 'en'] as const) {
      it(`en ${locale}, dit « ${BUTTONS[locale]} » avant le clavier : une tablette n’en a pas`, async () => {
        TestBed.inject(I18nService).setLocale(locale);
        const { fixture, host } = await setup();
        fixture.detectChanges();

        const help = host.querySelector('.step-body')?.textContent ?? '';

        expect(help).toContain(BUTTONS[locale]);
        expect(help.indexOf(BUTTONS[locale])).toBeLessThan(help.indexOf(ARROWS));
        expect(help).not.toMatch(/barre d’espace|space bar/);
      });
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

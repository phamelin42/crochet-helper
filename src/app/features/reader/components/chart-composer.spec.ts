import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { ReaderStore } from '../state/reader-store';
import { ChartComposer } from './chart-composer';

const PATTERN = ['Patron', 'Tree', 'Round 1: 6 sc (6)'].join('\n');

describe('ChartComposer', () => {
  const track = vi.fn();

  beforeEach(() => {
    // jsdom ne connaît pas `showModal` : le comportement modal n'est pas l'objet du test.
    HTMLDialogElement.prototype.showModal ??= function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function () {
      this.removeAttribute('open');
    };
    installFakeIndexedDb();
    localStorage.clear();
    track.mockClear();
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
    await store.initialize();
    store.load(PATTERN);
    const fixture = TestBed.createComponent(ChartComposer);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const symbol = (abbr: string) =>
      Array.from(host.querySelectorAll<HTMLButtonElement>('.compose-symbol')).find(
        (b) => b.querySelector('span')?.textContent?.trim() === abbr,
      )!;
    const button = (text: string) =>
      Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
        b.textContent?.trim().startsWith(text),
      )!;
    const click = (element: HTMLElement) => {
      element.click();
      fixture.detectChanges();
    };
    const written = () =>
      Array.from(host.querySelectorAll('[data-testid="written-round"]')).map((e) =>
        e.textContent?.trim(),
      );
    return { fixture, store, host, symbol, button, click, written };
  }

  it('touche un symbole : un jeton ; le même encore : le compte monte', async () => {
    const { host, symbol, click } = await setup();

    click(symbol('sc'));
    expect(host.querySelector('.compose-chip')?.textContent).toContain('1 × sc');

    click(symbol('sc'));
    click(symbol('sc'));
    expect(host.querySelectorAll('.compose-chip')).toHaveLength(1);
    expect(host.querySelector('.compose-chip')?.textContent).toContain('3 × sc');
    expect(host.querySelector('[data-testid="current-count"]')?.textContent).toContain('3');
  });

  it('répéter la sélection ×N compte les mailles de la répétition', async () => {
    const { fixture, host, symbol, button, click } = await setup();

    click(symbol('sc'));
    click(symbol('sc inc'));
    const input = host.querySelector<HTMLInputElement>('.compose-repeat input')!;
    input.value = '6';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    click(button('Repeat'));

    expect(host.querySelector('[data-testid="current-count"]')?.textContent).toContain('18');
  });

  describe('relecture d’un diagramme lu', () => {
    const SEED = {
      rounds: [
        {
          kind: 'round' as const,
          groups: [{ tokens: [{ symbol: 'sc', count: 6 }], repeat: 1 }],
          into: 'magic-ring' as const,
        },
        {
          kind: 'round' as const,
          groups: [
            {
              tokens: [
                { symbol: 'sc', count: 1 },
                { symbol: 'dc', count: 1 },
              ],
              repeat: 1,
            },
          ],
        },
      ],
      symbols: 8,
      uncertain: 2,
    };

    async function open() {
      const result = await setup();
      const { fixture } = result;
      fixture.componentRef.setInput('seed', SEED);
      fixture.detectChanges();
      const emitted: string[] = [];
      fixture.componentInstance.composed.subscribe((text) => emitted.push(text));
      return { ...result, emitted };
    }

    it('montre les tours lus, et combien de symboles vérifier en premier', async () => {
      const { host, written } = await open();

      expect(written()).toEqual(['Rnd 1: 6 sc in a magic ring (6)', 'Rnd 2: sc, dc (2)']);
      expect(host.textContent).toContain('2 symbol(s) read with low confidence');
    });

    it('un tour repris se corrige à sa place, sans changer l’ordre', async () => {
      const { button, click, symbol, written, host } = await open();

      click(button('Edit the round')); // tour 1
      expect(host.textContent).toContain('Editing round 1');
      // Le tour 1 était « 6 sc » : on retire et on retape « 6 sc inc ».
      click(button('Remove'));
      for (let i = 0; i < 6; i++) click(symbol('sc inc'));
      click(button('Finish the round'));

      expect(written()).toEqual(['Rnd 1: 6 sc inc in a magic ring (12)', 'Rnd 2: sc, dc (2)']);
    });

    it('« Découper en étapes » émet le patron écrit, sans toucher au patron actif', async () => {
      const { button, click, emitted, store } = await open();

      click(button('Split into steps'));

      expect(emitted).toEqual(['Chart 1\nRnd 1: 6 sc in a magic ring (6)\nRnd 2: sc, dc (2)']);
      expect(store.source()).toBe(PATTERN);
      expect(track).toHaveBeenCalledWith('chart_transcribed', {
        rounds: 2,
        convention: 'US',
        origine: 'lecture',
      });
    });
  });
});

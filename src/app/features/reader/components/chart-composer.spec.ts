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

  it('« Ajouter au patron » écrit une nouvelle pièce à la fin, sans bouger la lecture', async () => {
    const { store, symbol, button, click, written } = await setup();
    store.selectPiece(0);
    const before = store.source();

    click(symbol('sc'));
    click(symbol('sc'));
    click(button('Finish'));
    expect(written()).toEqual(['Rnd 1: 2 sc (2)']);
    click(button('Add to the pattern'));

    expect(store.source().startsWith(before)).toBe(true);
    expect(store.source().endsWith('Chart 1\nRnd 1: 2 sc (2)')).toBe(true);
    expect(store.pieces().map((piece) => piece.name)).toEqual(['Tree', 'Chart 1']);
    expect(store.pieceIndex()).toBe(0);
    expect(track).toHaveBeenCalledWith('chart_transcribed', { rounds: 1, convention: 'US' });
  });

  it('garde le nom donné à la pièce', async () => {
    const { fixture, host, store, symbol, button, click } = await setup();
    const name = host.querySelector<HTMLInputElement>('input[type="text"]')!;
    name.value = 'Feuille';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    click(symbol('sc'));
    click(button('Add to the pattern'));

    expect(store.pieces().map((piece) => piece.name)).toEqual(['Tree', 'Feuille']);
  });

  it('relit le brouillon après un rechargement, et l’efface une fois ajouté', async () => {
    const first = await setup();
    first.click(first.symbol('dc'));
    first.click(first.button('Finish'));
    first.fixture.detectChanges();
    await vi.waitFor(() => expect(localStorage.getItem('fil.chartDraft')).toContain('"dc"'));
    first.fixture.destroy();

    const second = TestBed.createComponent(ChartComposer);
    second.componentRef.setInput('open', true);
    second.detectChanges();
    const rows = Array.from(
      (second.nativeElement as HTMLElement).querySelectorAll('[data-testid="written-round"]'),
    ).map((e) => e.textContent?.trim());
    expect(rows).toEqual(['Rnd 1: dc (1)']);

    const add = Array.from(
      (second.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    ).find((b) => b.textContent?.trim() === 'Add to the pattern')!;
    add.click();
    second.detectChanges();
    await vi.waitFor(() => expect(localStorage.getItem('fil.chartDraft')).toBeNull());
  });

  it('ignore un brouillon altéré au lieu de planter', async () => {
    localStorage.setItem(
      'fil.chartDraft',
      JSON.stringify({ rounds: 'x', groups: [{ tokens: 3 }] }),
    );
    const { host } = await setup();

    expect(host.querySelectorAll('[data-testid="written-round"]')).toHaveLength(0);
  });
});

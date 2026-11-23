import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ReaderStore } from '../../reader/state/reader-store';
import { PatternOrigin, RAVELRY_START_KEY } from '../data/favorite.model';
import { StartBanner } from './start-banner';

const ORIGINE: PatternOrigin = {
  source: 'ravelry',
  id: '101',
  name: 'Petit sapin',
  designer: 'Camille Exemple',
  permalink: 'https://www.ravelry.com/patterns/library/petit-sapin',
  photoUrl: null,
};

function monter(locale: 'fr' | 'en' = 'fr') {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: PLATFORM_ID, useValue: 'browser' },
      { provide: AnalyticsService, useValue: { track: vi.fn() } },
    ],
  });
  TestBed.inject(I18nService).setLocale(locale);
  const fixture = TestBed.createComponent(StartBanner);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, store: TestBed.inject(ReaderStore) };
}

describe('StartBanner', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('dit quel patron attend son texte, en français et en anglais', () => {
    sessionStorage.setItem(RAVELRY_START_KEY, JSON.stringify(ORIGINE));
    expect(monter('fr').el.textContent).toContain(
      'Déposez ici le PDF de Petit sapin, ou collez son texte.',
    );
    expect(monter('en').el.textContent).toContain(
      'Drop the PDF of Petit sapin here, or paste its text.',
    );
  });

  it('prépare l’origine pour le prochain patron déposé', () => {
    sessionStorage.setItem(RAVELRY_START_KEY, JSON.stringify(ORIGINE));
    expect(monter().store.pendingOrigin()).toEqual(ORIGINE);
  });

  it('le nom d’un tiers reste du texte : jamais de balise dans le DOM', () => {
    const piege = { ...ORIGINE, name: '<img src=x onerror=alert(1)>Sapin' };
    sessionStorage.setItem(RAVELRY_START_KEY, JSON.stringify(piege));
    const { el } = monter();
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('<img src=x onerror=alert(1)>Sapin');
  });

  it('fermer retire le bandeau et la mémoire de session', () => {
    sessionStorage.setItem(RAVELRY_START_KEY, JSON.stringify(ORIGINE));
    const { fixture, el, store } = monter();
    el.querySelector('button')!.click();
    fixture.detectChanges();
    expect(el.querySelector('.note')).toBeNull();
    expect(store.pendingOrigin()).toBeNull();
    expect(sessionStorage.getItem(RAVELRY_START_KEY)).toBeNull();
  });

  it.each([
    ['du texte', 'pas du json'],
    ['une origine mal formée', JSON.stringify({ ...ORIGINE, permalink: 'https://evil.example/x' })],
    ['une autre source', JSON.stringify({ ...ORIGINE, source: 'etsy' })],
    ['rien', null],
  ])('%s : pas de bandeau', (_nom, valeur) => {
    if (valeur !== null) sessionStorage.setItem(RAVELRY_START_KEY, valeur);
    const { el, store } = monter();
    expect(el.querySelector('.note')).toBeNull();
    expect(store.pendingOrigin()).toBeNull();
  });
});

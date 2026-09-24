import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ANALYTICS_HOSTNAMES, ANALYTICS_ORIGIN, ANALYTICS_SITE_ID } from './analytics.config';
import {
  ANALYTICS_HOSTNAMES_TOKEN,
  ANALYTICS_ORIGIN_TOKEN,
  AnalyticsService,
  roundToHundred,
} from './analytics.service';

type UmamiWindow = Window & { umami?: { track: (event: string, props?: unknown) => void } };

function stubUmami() {
  const track = vi.fn();
  (window as UmamiWindow).umami = { track };
  return track;
}

describe('AnalyticsService', () => {
  afterEach(() => {
    delete (window as UmamiWindow).umami;
  });

  it("n'émet rien côté serveur, même avec une origine configurée", () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: ANALYTICS_ORIGIN_TOKEN, useValue: 'https://stats.example.org' },
      ],
    });
    const track = stubUmami();

    const service = TestBed.inject(AnalyticsService);
    expect(() => service.track('step_advanced')).not.toThrow();

    expect(track).not.toHaveBeenCalled();
  });

  it("reste inerte dans le navigateur tant que l'origine est vide", () => {
    // L'origine est injectée ici plutôt que laissée à la fabrique par défaut :
    // ce cas décrit la mesure désactivée, pas la valeur de production du jour.
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: ANALYTICS_ORIGIN_TOKEN, useValue: '' },
      ],
    });
    const track = stubUmami();

    const service = TestBed.inject(AnalyticsService);
    service.track('glossary_hover');

    expect(track).not.toHaveBeenCalled();
  });

  it('transmet un événement quand une origine est configurée', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: ANALYTICS_ORIGIN_TOKEN, useValue: 'https://stats.example.org' },
      ],
    });
    const track = stubUmami();

    const service = TestBed.inject(AnalyticsService);
    service.track('pattern_parsed', { steps: 12, pieces: 2 });

    expect(track).toHaveBeenCalledWith('pattern_parsed', { steps: 12, pieces: 2 });
  });

  it('arrondit toute longueur à la centaine : jamais de texte de patron transmis', () => {
    expect(roundToHundred(0)).toBe(0);
    expect(roundToHundred(42)).toBe(0);
    expect(roundToHundred(1234)).toBe(1200);
    expect(Number.isInteger(roundToHundred(7))).toBe(true);
  });
});

describe('AnalyticsService — chargement du traceur', () => {
  const ORIGIN = 'https://stats.example.org';

  function setup(hostnames: readonly string[]): AnalyticsService {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: ANALYTICS_ORIGIN_TOKEN, useValue: ORIGIN },
        { provide: ANALYTICS_HOSTNAMES_TOKEN, useValue: hostnames },
      ],
    });
    return TestBed.inject(AnalyticsService);
  }

  /** Le script inséré par le service, s'il y en a un. */
  function tracker(): HTMLScriptElement | null {
    return document.head.querySelector<HTMLScriptElement>(`script[src="${ORIGIN}/script.js"]`);
  }

  afterEach(() => {
    tracker()?.remove();
    delete (window as UmamiWindow).umami;
    vi.restoreAllMocks();
  });

  it('ne charge pas le traceur hors des hôtes mesurés (CI, localhost, aperçus)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const service = setup(['patternreader.com']);
    service['loadScript']();

    expect(tracker()).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('traceur non chargé sur localhost'));
  });

  it('transmet, une fois le traceur chargé, les événements émis pendant son chargement', () => {
    const service = setup(['localhost']);
    service['loadScript']();
    service.track('session_resumed');
    service.track('pattern_parsed', { steps: 12, pieces: 2 });

    const track = stubUmami();
    tracker()!.dispatchEvent(new Event('load'));

    expect(track.mock.calls).toEqual([
      ['session_resumed', undefined],
      ['pattern_parsed', { steps: 12, pieces: 2 }],
    ]);
  });

  it('borne la file d’attente à vingt événements', () => {
    const service = setup(['localhost']);
    service['loadScript']();
    for (let i = 0; i < 30; i++) service.track('step_advanced');

    const track = stubUmami();
    tracker()!.dispatchEvent(new Event('load'));

    expect(track).toHaveBeenCalledTimes(20);
  });

  it('abandonne la file si le traceur ne se charge pas, et le signale en développement', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const service = setup(['localhost']);
    service['loadScript']();
    service.track('pattern_pasted', { length: 1200 });
    tracker()!.dispatchEvent(new Event('error'));

    const track = stubUmami();
    service.track('step_advanced');

    expect(track.mock.calls).toEqual([['step_advanced', undefined]]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('traceur injoignable'));
  });

  it('signale en développement un événement que le traceur refuse, sans ses propriétés', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const service = setup(['localhost']);
    (window as UmamiWindow).umami = {
      track: () => {
        throw new Error('refusé');
      },
    };

    expect(() => service.track('conversion_run', { replacements: 7 })).not.toThrow();
    const message = String(warn.mock.calls[0]?.[0]);
    expect(message).toContain('conversion_run');
    expect(message).not.toContain('7');
  });
});

describe('AnalyticsService — retour', () => {
  function setup(origin = 'https://stats.example.org'): AnalyticsService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: ANALYTICS_ORIGIN_TOKEN, useValue: origin },
      ],
    });
    return TestBed.inject(AnalyticsService);
  }

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as UmamiWindow).umami;
  });

  it("écrit fil.firstVisit et fil.lastVisitDay à la première visite, sans émettre d'événement", () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    const service = setup();
    const track = stubUmami();

    service['trackReturningVisit']();

    expect(localStorage.getItem('fil.firstVisit')).toBe('"2026-09-23"');
    expect(localStorage.getItem('fil.lastVisitDay')).toBe('"2026-09-23"');
    expect(localStorage.length).toBe(2);
    expect(track).not.toHaveBeenCalled();
  });

  it('émet returning_visit_1d le lendemain, une seule fois par jour', () => {
    vi.setSystemTime(new Date('2026-09-22T10:00:00'));
    setup()['trackReturningVisit']();

    vi.setSystemTime(new Date('2026-09-23T09:00:00'));
    const service = setup();
    const track = stubUmami();
    service['trackReturningVisit']();
    service['trackReturningVisit']();

    expect(track.mock.calls).toEqual([['returning_visit_1d', undefined]]);
  });

  it('une première visite de plus de 13 mois est remplacée par celle du jour', () => {
    vi.setSystemTime(new Date('2025-01-01T00:00:00'));
    setup()['trackReturningVisit']();

    vi.setSystemTime(new Date('2026-09-23T00:00:00'));
    setup()['trackReturningVisit']();

    expect(localStorage.getItem('fil.firstVisit')).toBe('"2026-09-23"');
  });

  it("n'écrit aucun cookie", () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    const cookieAvant = document.cookie;

    setup()['trackReturningVisit']();

    expect(document.cookie).toBe(cookieAvant);
  });
});

describe('Configuration de production', () => {
  it('va par paire : une origine sans identifiant de site ne mesure rien', () => {
    expect(Boolean(ANALYTICS_ORIGIN)).toBe(Boolean(ANALYTICS_SITE_ID));
  });

  it('ne mesure que le domaine de production', () => {
    expect(ANALYTICS_HOSTNAMES).toContain('patternreader.com');
    expect(ANALYTICS_HOSTNAMES).not.toContain('localhost');
  });

  it("est une origine https sans barre finale (le service concatène '/script.js')", () => {
    if (!ANALYTICS_ORIGIN) return;
    expect(ANALYTICS_ORIGIN).toMatch(/^https:\/\/[^/]+$/);
  });
});

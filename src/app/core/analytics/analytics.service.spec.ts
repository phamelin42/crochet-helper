import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ANALYTICS_ORIGIN, ANALYTICS_SITE_ID } from './analytics.config';
import { ANALYTICS_ORIGIN_TOKEN, AnalyticsService, roundToHundred } from './analytics.service';

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

describe('Configuration de production', () => {
  it('va par paire : une origine sans identifiant de site ne mesure rien', () => {
    expect(Boolean(ANALYTICS_ORIGIN)).toBe(Boolean(ANALYTICS_SITE_ID));
  });

  it("est une origine https sans barre finale (le service concatène '/script.js')", () => {
    if (!ANALYTICS_ORIGIN) return;
    expect(ANALYTICS_ORIGIN).toMatch(/^https:\/\/[^/]+$/);
  });
});

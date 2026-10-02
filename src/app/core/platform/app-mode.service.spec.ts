import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../analytics/analytics.service';
import { AppMode, AppModeService } from './app-mode.service';

interface Env {
  standalone: boolean;
  /** Requête de l'URL d'ouverture. */
  search: string;
  /** Valeur déjà mémorisée pour la session (`fil.appMode`). */
  remembered?: string;
  server?: boolean;
}

function setup(env: Env) {
  const root = document.createElement('html');
  const track = vi.fn();
  const history = { state: null as unknown, pushState: vi.fn(), back: vi.fn() };
  const target = new EventTarget();
  const fakeWindow = Object.assign(target, {
    location: { search: env.search },
    matchMedia: () => ({ matches: env.standalone }),
    history,
  });
  if (env.remembered) sessionStorage.setItem('fil.appMode', env.remembered);
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: PLATFORM_ID, useValue: env.server ? 'server' : 'browser' },
      { provide: DOCUMENT, useValue: { defaultView: fakeWindow, documentElement: root } },
      { provide: AnalyticsService, useValue: { track } },
    ],
  });
  return { service: TestBed.inject(AppModeService), root, history, target, track };
}

describe('AppModeService', () => {
  beforeEach(() => sessionStorage.clear());

  // Chaque combinaison : l'application est reconnue dès qu'une des trois
  // sources le dit, et seulement alors.
  const cases: { name: string; env: Env; expected: AppMode | null }[] = [];
  for (const standalone of [false, true]) {
    for (const search of ['', '?mode=app', '?mode=autre']) {
      for (const remembered of [undefined, 'twa']) {
        const twa = search === '?mode=app' || remembered === 'twa';
        cases.push({
          name: `media ${standalone}, requête « ${search} », mémorisé ${remembered}`,
          env: { standalone, search, remembered },
          expected: twa ? 'twa' : standalone ? 'standalone' : null,
        });
      }
    }
  }

  for (const { name, env, expected } of cases) {
    it(`${name} → ${expected ?? 'site'}`, () => {
      const { service, root } = setup(env);
      expect(service.mode()).toBe(expected);
      expect(service.active()).toBe(expected !== null);
      expect(root.hasAttribute('data-app')).toBe(expected !== null);
    });
  }

  it('mémorise `mode=app` pour la session : la navigation interne perd la requête', () => {
    setup({ standalone: false, search: '?mode=app' });
    expect(sessionStorage.getItem('fil.appMode')).toBe('twa');
    const { service } = setup({ standalone: false, search: '' });
    expect(service.mode()).toBe('twa');
  });

  it('ne lit ni n’écrit rien côté serveur', () => {
    const { service, root } = setup({ standalone: true, search: '?mode=app', server: true });
    expect(service.mode()).toBeNull();
    expect(root.hasAttribute('data-app')).toBe(false);
    expect(sessionStorage.getItem('fil.appMode')).toBeNull();
    expect(service.consumeLaunch()).toBe(false);
    expect(sessionStorage.getItem('fil.appLaunched')).toBeNull();
  });

  it('ne compte l’ouverture qu’une fois par session, et jamais hors mode appli', async () => {
    const { service: app, track } = setup({ standalone: true, search: '' });
    expect(app.consumeLaunch()).toBe(true);
    expect(app.consumeLaunch()).toBe(false);
    await vi.waitFor(() =>
      expect(track).toHaveBeenCalledWith('app_opened', { mode: 'standalone' }),
    );
    expect(track).toHaveBeenCalledTimes(1);

    sessionStorage.clear();
    const site = setup({ standalone: false, search: '' });
    expect(site.service.consumeLaunch()).toBe(false);
    expect(site.track).not.toHaveBeenCalled();
  });

  describe('bouton retour', () => {
    it('ajoute une entrée d’historique et appelle le gestionnaire quand elle est retirée', () => {
      const { service, history, target } = setup({ standalone: true, search: '' });
      const handler = vi.fn();
      service.trapBack(handler);
      expect(history.pushState).toHaveBeenCalledTimes(1);

      target.dispatchEvent(new Event('popstate'));
      expect(handler).toHaveBeenCalledTimes(1);
      // Un second retour appartient à l’appli : plus rien n’est intercepté.
      target.dispatchEvent(new Event('popstate'));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('retire l’entrée si l’écran est quitté autrement, sans rappeler le gestionnaire', () => {
      const { service, history, target } = setup({ standalone: true, search: '' });
      const handler = vi.fn();
      service.trapBack(handler);
      history.state = { filTrap: true };
      service.releaseBack();
      expect(history.back).toHaveBeenCalledTimes(1);
      target.dispatchEvent(new Event('popstate'));
      expect(handler).not.toHaveBeenCalled();
    });

    it('laisse l’historique tranquille quand la page a déjà changé', () => {
      const { service, history } = setup({ standalone: true, search: '' });
      service.trapBack(vi.fn());
      history.state = { navigationId: 7 };
      service.releaseBack();
      expect(history.back).not.toHaveBeenCalled();
    });

    it('ne touche pas à l’historique hors mode appli', () => {
      const { service, history } = setup({ standalone: false, search: '' });
      service.trapBack(vi.fn());
      expect(history.pushState).not.toHaveBeenCalled();
    });
  });
});

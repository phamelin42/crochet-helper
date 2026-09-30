import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../analytics/analytics.service';
import { InstallMode, InstallService } from './install.service';

interface Env {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
  standalone?: boolean;
  navigatorStandalone?: boolean;
  server?: boolean;
}

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1';
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0';
const CHROME =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function setup(env: Env) {
  const target = new EventTarget();
  const fakeWindow = Object.assign(target, {
    matchMedia: () => ({ matches: env.standalone === true }),
    navigator: {
      userAgent: env.userAgent ?? CHROME,
      platform: env.platform ?? 'Linux x86_64',
      maxTouchPoints: env.maxTouchPoints ?? 0,
      standalone: env.navigatorStandalone,
    },
  });
  const track = vi.fn();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: PLATFORM_ID, useValue: env.server ? 'server' : 'browser' },
      { provide: DOCUMENT, useValue: { defaultView: fakeWindow } },
      { provide: AnalyticsService, useValue: { track } },
    ],
  });
  const service = TestBed.inject(InstallService);
  const promptEvent = (outcome: 'accepted' | 'dismissed') => {
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn(() => Promise.resolve()),
      userChoice: Promise.resolve({ outcome }),
    });
    target.dispatchEvent(event);
    return event;
  };
  return { service, target, track, promptEvent };
}

describe('InstallService', () => {
  const cases: { name: string; env: Env; fire: boolean; expected: InstallMode }[] = [
    { name: 'Chrome avec invite native', env: {}, fire: true, expected: 'prompt' },
    { name: 'Chrome sans invite (critères non remplis)', env: {}, fire: false, expected: 'none' },
    { name: 'Safari sur iPhone', env: { userAgent: IPHONE_SAFARI }, fire: false, expected: 'ios' },
    {
      name: 'Safari sur iPad (iPadOS se déclare Mac, écran tactile)',
      env: { userAgent: MAC_SAFARI, platform: 'MacIntel', maxTouchPoints: 5 },
      fire: false,
      expected: 'ios',
    },
    {
      name: 'Safari sur un vrai Mac',
      env: { userAgent: MAC_SAFARI, platform: 'MacIntel' },
      fire: false,
      expected: 'none',
    },
    { name: 'Chrome sur iPhone', env: { userAgent: IPHONE_CHROME }, fire: false, expected: 'none' },
    { name: 'Firefox ordinateur', env: { userAgent: FIREFOX }, fire: false, expected: 'none' },
    {
      name: 'ouvert en mode autonome',
      env: { standalone: true },
      fire: true,
      expected: 'installed',
    },
    {
      name: 'Safari iPhone lancé depuis l’écran d’accueil',
      env: { userAgent: IPHONE_SAFARI, navigatorStandalone: true },
      fire: false,
      expected: 'installed',
    },
    {
      name: 'côté serveur',
      env: { server: true, userAgent: IPHONE_SAFARI },
      fire: true,
      expected: 'none',
    },
  ];

  for (const { name, env, fire, expected } of cases) {
    it(`mode « ${expected} » : ${name}`, () => {
      const { service, promptEvent } = setup(env);
      if (fire) promptEvent('accepted');
      expect(service.mode()).toBe(expected);
    });
  }

  it('garde l’invite de côté : le navigateur n’affiche pas sa mini-barre', () => {
    const { promptEvent } = setup({});
    expect(promptEvent('accepted').defaultPrevented).toBe(true);
  });

  it('install() rend la réponse de la lectrice, pour chacune des deux', async () => {
    for (const outcome of ['accepted', 'dismissed'] as const) {
      const { service, promptEvent, track } = setup({});
      const event = promptEvent(outcome);

      expect(await service.install()).toBe(outcome);
      expect(event.prompt).toHaveBeenCalledOnce();
      expect(track).toHaveBeenCalledWith('install_prompted', { mode: 'prompt' });
      // L'invite est à usage unique : la carte ne doit plus proposer « Installer ».
      expect(service.mode()).toBe('none');
    }
  });

  it('install() sans invite ne fait rien', async () => {
    const { service, track } = setup({});
    expect(await service.install()).toBe('dismissed');
    expect(track).not.toHaveBeenCalled();
  });

  it('appinstalled : passe à « installed » et mesure l’installation', () => {
    const { service, target, track, promptEvent } = setup({});
    promptEvent('accepted');
    target.dispatchEvent(new Event('appinstalled'));

    expect(service.mode()).toBe('installed');
    expect(track).toHaveBeenCalledWith('app_installed', { mode: 'prompt' });
  });

  it('côté serveur, n’écoute ni n’interroge aucune API du navigateur', () => {
    const matchMedia = vi.fn();
    const addEventListener = vi.fn();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: DOCUMENT, useValue: { defaultView: { matchMedia, addEventListener } } },
        { provide: AnalyticsService, useValue: { track: vi.fn() } },
      ],
    });
    expect(TestBed.inject(InstallService).mode()).toBe('none');
    expect(matchMedia).not.toHaveBeenCalled();
    expect(addEventListener).not.toHaveBeenCalled();
  });
});

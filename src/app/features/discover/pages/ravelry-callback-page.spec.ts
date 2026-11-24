import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserLocation } from '../../../core/platform/browser-location.service';
import { RAVELRY_URL_TOKEN } from '../../../core/ravelry/ravelry-access';
import { CompleteOutcome, RavelrySession } from '../../../core/ravelry/ravelry-session.service';
import RavelryCallbackPage from './ravelry-callback-page';

const RETOUR = '?code=code-secret&state=state-secret';

describe('page de retour de Ravelry', () => {
  const complete = vi.fn<(search: string) => Promise<CompleteOutcome>>();
  const begin = vi.fn(async () => true);
  const replaceUrl = vi.fn();
  const navigateByUrl = vi.fn(async () => true);
  let adresse = RETOUR;

  async function monter(url = 'https://fil-ia.example/ravelry') {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: RAVELRY_URL_TOKEN, useValue: url },
        { provide: RavelrySession, useValue: { complete, begin } },
        {
          provide: BrowserLocation,
          useValue: { search: () => adresse, replaceUrl, origin: () => '', redirect: vi.fn() },
        },
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockImplementation(navigateByUrl);
    const fixture = TestBed.createComponent(RavelryCallbackPage);
    fixture.detectChanges();
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();
      await fixture.whenStable();
    }
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => {
    complete.mockReset();
    begin.mockClear();
    replaceUrl.mockClear();
    navigateByUrl.mockClear();
    adresse = RETOUR;
  });

  it('avant la réponse : « Connexion à Ravelry en cours… » dans les deux langues, sans rien d’autre', async () => {
    complete.mockReturnValue(new Promise(() => undefined));
    const { el } = await monter();
    expect(el.querySelector('[role="status"]')?.textContent).toContain(
      'Connexion à Ravelry en cours…',
    );
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Connecting to Ravelry…');
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('efface code et state de l’adresse, avant toute vérification, et ne les met nulle part dans la page', async () => {
    complete.mockResolvedValue({ ok: false, reason: 'state', locale: null });
    const { el } = await monter();
    expect(replaceUrl).toHaveBeenCalledWith('/ravelry-callback');
    expect(replaceUrl.mock.invocationCallOrder[0]).toBeLessThan(
      complete.mock.invocationCallOrder[0],
    );
    expect(complete).toHaveBeenCalledWith(RETOUR);
    expect(el.innerHTML).not.toContain('code-secret');
    expect(el.innerHTML).not.toContain('state-secret');
  });

  it('une visite sans paramètre ne touche pas à l’adresse', async () => {
    adresse = '';
    complete.mockResolvedValue({ ok: false, reason: 'state', locale: null });
    await monter();
    expect(replaceUrl).not.toHaveBeenCalled();
  });

  it('succès : ramène à la page d’origine, sans ajouter d’entrée à l’historique', async () => {
    complete.mockResolvedValue({
      ok: true,
      returnTo: '/fr/trouver-un-patron?q=sapin',
      locale: 'fr',
    });
    await monter();
    expect(navigateByUrl).toHaveBeenCalledWith('/fr/trouver-un-patron?q=sapin', {
      replaceUrl: true,
    });
  });

  it.each([
    ['fr', '/fr/trouver-un-patron'],
    ['en', '/find-a-pattern'],
  ] as const)('succès sans page d’origine valable : la recherche, en %s', async (locale, cible) => {
    complete.mockResolvedValue({ ok: true, returnTo: null, locale });
    await monter();
    expect(navigateByUrl).toHaveBeenCalledWith(cible, { replaceUrl: true });
  });

  describe.each([
    ['fr', 'state', 'La connexion n’a pas pu être vérifiée, réessayez.'],
    ['fr', 'denied', 'Vous avez refusé l’accès : rien n’a été partagé.'],
    ['fr', 'failed', 'Ravelry n’a pas accepté la connexion, réessayez.'],
    [
      'fr',
      'unavailable',
      'Le service de connexion ne répond pas pour le moment, réessayez dans un instant.',
    ],
    ['en', 'state', 'The connection could not be verified, please try again.'],
    ['en', 'denied', 'You declined access: nothing was shared.'],
    ['en', 'failed', 'Ravelry did not accept the connection, please try again.'],
    [
      'en',
      'unavailable',
      'The connection service is not answering right now, please try again in a moment.',
    ],
  ] as const)('refus en %s (%s)', (locale, reason, texte) => {
    it('le dit dans la langue du départ, sans connexion ni redirection', async () => {
      complete.mockResolvedValue({ ok: false, reason, locale });
      const { el } = await monter();
      expect(el.querySelector('[role="alert"]')?.textContent).toContain(texte);
      expect(navigateByUrl).not.toHaveBeenCalled();
      expect(el.querySelector('a')?.getAttribute('href')).toBe(
        locale === 'fr' ? '/fr/trouver-un-patron' : '/find-a-pattern',
      );
    });
  });

  it('un retour sans départ connu : le message est dit dans les deux langues', async () => {
    complete.mockResolvedValue({ ok: false, reason: 'state', locale: null });
    const { el } = await monter();
    const alerte = el.querySelector('[role="alert"]')!;
    expect(alerte.querySelector('[lang="fr"]')?.textContent).toContain('n’a pas pu être vérifiée');
    expect(alerte.querySelector('[lang="en"]')?.textContent).toContain('could not be verified');
  });

  it('« Réessayer » relance la connexion', async () => {
    complete.mockResolvedValue({ ok: false, reason: 'failed', locale: 'en' });
    const { el } = await monter();
    const bouton = [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Try again'),
    );
    bouton!.click();
    expect(begin).toHaveBeenCalledWith('/find-a-pattern');
  });

  it('interrupteur éteint : la page existe mais n’appelle rien', async () => {
    const { el } = await monter('');
    expect(complete).not.toHaveBeenCalled();
    expect(begin).not.toHaveBeenCalled();
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect([...el.querySelectorAll('button')]).toHaveLength(0);
  });
});

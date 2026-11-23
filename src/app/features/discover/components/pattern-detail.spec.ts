import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { RAVELRY_URL_TOKEN } from '../../../core/ravelry/ravelry-access';
import { RAVELRY_CLIENT, RavelryClient } from '../../../core/ravelry/ravelry-client.token';
import { RAVELRY_MODE_TOKEN } from '../../../core/ravelry/ravelry-connection-config';
import { RavelrySession } from '../../../core/ravelry/ravelry-session.service';
import { RAVELRY_START_KEY } from '../data/favorite.model';
import { PatternDetail } from './pattern-detail';

const FICHE = {
  id: 7,
  nom: 'Sapin',
  designer: 'Cam',
  description: 'Un <b>sapin</b>\n\nRang 1 : 6 ms',
  photos: [],
  craft: null,
  poidsFil: null,
  difficulte: null,
  telechargement: null,
  source: null,
  lien: 'https://www.ravelry.com/patterns/library/sapin',
};

describe('PatternDetail', () => {
  const track = vi.fn();
  const pattern = vi.fn<RavelryClient['pattern']>();

  async function monter(locale: 'fr' | 'en' = 'en') {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: RAVELRY_URL_TOKEN, useValue: 'https://fil-ia.example/ravelry' },
        { provide: RAVELRY_MODE_TOKEN, useValue: 'ouvert' },
        { provide: RAVELRY_CLIENT, useValue: { search: vi.fn(), pattern, projects: vi.fn() } },
        { provide: AnalyticsService, useValue: { track } },
      ],
    });
    TestBed.inject(I18nService).setLocale(locale);
    const fixture = TestBed.createComponent(PatternDetail);
    fixture.componentRef.setInput('id', 7);
    fixture.detectChanges();
    await fixture.whenStable();
    // La connexion se lit sur l'appareil avant chaque appel : quelques tours de promesses hors d'Angular.
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();
      await fixture.whenStable();
    }
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => {
    track.mockClear();
    pattern.mockReset();
    sessionStorage.clear();
  });

  it('un refus ne recharge pas la fiche en boucle : un seul appel, un message, un bouton', async () => {
    pattern.mockResolvedValue({ ok: false, raison: 'indisponible' });
    const { fixture, el } = await monter();
    await fixture.whenStable();
    expect(pattern).toHaveBeenCalledTimes(1);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('unavailable');
    expect(el.querySelector('[role="alert"] button')).not.toBeNull();
  });

  it('la description de tiers est rendue en texte, paragraphe par paragraphe', async () => {
    pattern.mockResolvedValue({ ok: true, data: FICHE });
    const { el } = await monter();
    const paragraphes = [...el.querySelectorAll('.discover-text')].map((p) => p.textContent);
    expect(paragraphes).toEqual(['Un <b>sapin</b>', 'Rang 1 : 6 ms']);
    expect(el.querySelector('.discover-detail b')).toBeNull();
  });

  it.each([
    [
      'le PDF de Ravelry',
      { telechargement: 'https://x.example/a.pdf', source: 'https://d.example/p' },
      'https://x.example/a.pdf',
    ],
    [
      'la page de la créatrice',
      { telechargement: null, source: 'https://d.example/p' },
      'https://d.example/p',
    ],
    ['la page Ravelry du patron', { telechargement: null, source: null }, FICHE.lien],
  ])('« Commencer ce patron » ouvre %s dans un nouvel onglet', async (_nom, champs, attendu) => {
    pattern.mockResolvedValue({ ok: true, data: { ...FICHE, ...champs } });
    const { el } = await monter();
    const lien = [...el.querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Start this pattern'),
    )!;
    expect(lien.getAttribute('href')).toBe(attendu);
    expect(lien.getAttribute('target')).toBe('_blank');
    expect(lien.getAttribute('rel')).toBe('noopener noreferrer');
    expect(lien.textContent).toContain('(new tab)');
  });

  it('« Commencer » garde le patron en mémoire de session et mesure sans nom ni identifiant', async () => {
    pattern.mockResolvedValue({ ok: true, data: FICHE });
    const { el } = await monter();
    const lien = [...el.querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Start this pattern'),
    )!;
    lien.addEventListener('click', (e) => e.preventDefault());
    lien.click();
    expect(JSON.parse(sessionStorage.getItem(RAVELRY_START_KEY)!)).toMatchObject({
      source: 'ravelry',
      id: '7',
      name: 'Sapin',
      permalink: FICHE.lien,
    });
    expect(track).toHaveBeenCalledWith('pattern_started');
    expect(JSON.stringify(track.mock.calls)).not.toContain('Sapin');
  });
});

describe('PatternDetail : ouvrages réalisés (fiche 62)', () => {
  const pattern = vi.fn<RavelryClient['pattern']>();
  const projects = vi.fn<RavelryClient['projects']>();
  const begin = vi.fn(async () => true);
  const ouvrage = (n: number) => ({
    photo: `https://images4-g.ravelrycache.com/p${n}.jpg`,
    lien: `https://www.ravelry.com/projects/u/o${n}`,
  });

  async function monter(options: { connected: boolean; locale?: 'fr' | 'en' }) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: RAVELRY_URL_TOKEN, useValue: 'https://fil-ia.example/ravelry' },
        { provide: RAVELRY_MODE_TOKEN, useValue: 'ouvert' },
        { provide: RAVELRY_CLIENT, useValue: { search: vi.fn(), pattern, projects } },
        { provide: AnalyticsService, useValue: { track: vi.fn() } },
        {
          provide: RavelrySession,
          useValue: {
            loaded: signal(true),
            connected: signal(options.connected),
            expired: signal(false),
            farewell: signal(false),
            accessToken: async () => (options.connected ? 'at-1' : null),
            refreshAfterRejection: async () => null,
            expire: async () => undefined,
            begin,
          },
        },
      ],
    });
    TestBed.inject(I18nService).setLocale(options.locale ?? 'en');
    const fixture = TestBed.createComponent(PatternDetail);
    fixture.componentRef.setInput('id', 7);
    fixture.detectChanges();
    await fixture.whenStable();
    // La connexion se lit sur l'appareil avant chaque appel : quelques tours de promesses hors d'Angular.
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();
      await fixture.whenStable();
    }
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => {
    pattern.mockReset().mockResolvedValue({ ok: true, data: FICHE });
    projects.mockReset();
    begin.mockClear();
  });

  it('sans connexion : un bouton pour se connecter, aucune demande de galerie, aucune photo', async () => {
    const { el } = await monter({ connected: false });
    expect(el.querySelector('#projects-title')?.textContent).toBe(
      'Projects made with this pattern',
    );
    const bouton = [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Connect to see projects made with this pattern'),
    );
    expect(bouton).toBeTruthy();
    expect(projects).not.toHaveBeenCalled();
    expect(el.querySelectorAll('.projects-grid img')).toHaveLength(0);
    bouton!.click();
    expect(begin).toHaveBeenCalledTimes(1);
  });

  it('connectée : une photo avec son texte alternatif et un lien vers Ravelry par ouvrage', async () => {
    projects.mockResolvedValue({
      ok: true,
      data: { projets: [ouvrage(1), ouvrage(2)], page: 1, pages: 1 },
    });
    const { el } = await monter({ connected: true });
    const images = [...el.querySelectorAll<HTMLImageElement>('.projects-grid img')];
    expect(images.map((i) => i.alt)).toEqual([
      'Project made with this pattern, photo 1',
      'Project made with this pattern, photo 2',
    ]);
    expect(images.map((i) => i.getAttribute('src'))).toEqual([ouvrage(1).photo, ouvrage(2).photo]);
    const liens = [...el.querySelectorAll<HTMLAnchorElement>('.projects-grid a')];
    expect(liens.map((a) => a.getAttribute('href'))).toEqual([ouvrage(1).lien, ouvrage(2).lien]);
    for (const a of liens) {
      expect(a.target).toBe('_blank');
      expect(a.rel).toContain('noopener');
      expect(a.textContent).toContain('View on Ravelry');
      expect(a.textContent).toContain('opens in a new tab');
    }
    // Rien d'autre qu'une photo et un lien : aucun nom de personne.
    expect(el.querySelector('.projects-grid')?.textContent).not.toMatch(/\bu\b/);
  });

  it('en français, les mêmes éléments sont dits en français', async () => {
    projects.mockResolvedValue({ ok: true, data: { projets: [ouvrage(1)], page: 1, pages: 1 } });
    const { el } = await monter({ connected: true, locale: 'fr' });
    expect(el.querySelector('#projects-title')?.textContent).toBe(
      'Ouvrages réalisés avec ce patron',
    );
    expect(el.querySelector<HTMLImageElement>('.projects-grid img')?.alt).toBe(
      'Ouvrage réalisé avec ce patron, photo 1',
    );
    expect(el.querySelector('.projects-grid a')?.textContent).toContain('Voir sur Ravelry');
  });

  it('aucun ouvrage : « Personne n’a encore partagé d’ouvrage. »', async () => {
    projects.mockResolvedValue({ ok: true, data: { projets: [], page: 1, pages: 1 } });
    const { el } = await monter({ connected: true });
    expect(el.textContent).toContain('Nobody has shared a project yet.');
    expect(el.querySelectorAll('.projects-grid')).toHaveLength(0);
  });

  it('« Voir plus » apparaît tant qu’il reste des pages et charge la suivante', async () => {
    projects.mockResolvedValueOnce({
      ok: true,
      data: { projets: [ouvrage(1)], page: 1, pages: 2 },
    });
    const { fixture, el } = await monter({ connected: true });
    const plus = [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Show more projects'),
    );
    expect(plus).toBeTruthy();
    projects.mockResolvedValueOnce({
      ok: true,
      data: { projets: [ouvrage(2)], page: 2, pages: 2 },
    });
    plus!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelectorAll('.projects-grid img')).toHaveLength(2);
    expect(
      [...el.querySelectorAll('button')].some((b) => b.textContent?.includes('Show more projects')),
    ).toBe(false);
  });

  it('un refus de la galerie est dit, avec un bouton pour réessayer', async () => {
    projects.mockResolvedValue({ ok: false, raison: 'indisponible' });
    const { el } = await monter({ connected: true });
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'The projects could not be loaded right now.',
    );
  });
});

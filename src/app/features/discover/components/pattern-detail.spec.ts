import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { RAVELRY_URL_TOKEN } from '../../../core/ravelry/ravelry-access';
import { RAVELRY_CLIENT, RavelryClient } from '../../../core/ravelry/ravelry-client.token';
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
        { provide: RAVELRY_CLIENT, useValue: { search: vi.fn(), pattern } },
        { provide: AnalyticsService, useValue: { track } },
      ],
    });
    TestBed.inject(I18nService).setLocale(locale);
    const fixture = TestBed.createComponent(PatternDetail);
    fixture.componentRef.setInput('id', 7);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
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

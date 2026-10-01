import { TestBed } from '@angular/core/testing';
import { PRODUIT, ProduitConfig } from '../produit/produit';
import { ANALYTICS_CONFIG, AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  afterEach(() => {
    delete (window as Window & { umami?: unknown }).umami;
    localStorage.clear();
  });

  it('reste inerte sans identifiant de site : rien n’est transmis', () => {
    const track = vi.fn();
    (window as Window & { umami?: unknown }).umami = { track };
    TestBed.configureTestingModule({
      providers: [
        { provide: ANALYTICS_CONFIG, useValue: { origin: '', siteId: '', hostnames: [] } },
      ],
    });
    TestBed.inject(AnalyticsService).track('outil_commence');
    expect(track).not.toHaveBeenCalled();
  });

  it('transmet le nom et les propriétés quand le traceur est là', () => {
    const track = vi.fn();
    (window as Window & { umami?: unknown }).umami = { track };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ANALYTICS_CONFIG,
          useValue: { origin: 'https://collecteur.test', siteId: 'x', hostnames: [] },
        },
      ],
    });
    TestBed.inject(AnalyticsService).track('export_fait', { format: 'pdf' });
    expect(track).toHaveBeenCalledWith('export_fait', { format: 'pdf' });
  });

  it('ne charge le traceur que sur le domaine du produit, et pas sans identifiant de site', () => {
    const produit = {
      domaine: 'exemple.fr',
      mesure: { origine: 'https://collecteur.test', siteId: 'abc', googleVerification: '' },
    } as ProduitConfig;
    TestBed.configureTestingModule({ providers: [{ provide: PRODUIT, useValue: produit }] });
    const config = TestBed.inject(ANALYTICS_CONFIG);
    expect(config.hostnames).toEqual(['exemple.fr', 'www.exemple.fr']);
    expect(config.origin).toBe('https://collecteur.test');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PRODUIT, useValue: { ...produit, mesure: { ...produit.mesure, siteId: '' } } },
      ],
    });
    expect(TestBed.inject(ANALYTICS_CONFIG).origin).toBe('');
  });
});

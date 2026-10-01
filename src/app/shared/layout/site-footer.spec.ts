import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { I18nService } from '../../core/i18n/i18n.service';
import { ROUTE_PATHS, RouteName } from '../../core/i18n/route-paths';
import { SiteFooter } from './site-footer';

/**
 * `reader` et `projects` sont déjà joignables ailleurs (marque, « Mes projets »).
 * `glossary`, `format` et `converter` sont dans la navigation d'en-tête, visible
 * sur toute page : les y dupliquer coûterait du bundle initial sans ajouter de
 * maillage réel. Le pied de page se concentre sur ce qui manquait : les guides
 * et le kit créatrices. `settings` n'est reliée que depuis la barre d'onglets du
 * mode appli (`noIndex`) : le pied de page du site ne la montre pas.
 */
const EXEMPT: readonly RouteName[] = [
  'reader',
  'projects',
  'glossary',
  'format',
  'converter',
  'settings',
];

function setup(locale: 'fr' | 'en') {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const i18n = TestBed.inject(I18nService);
  i18n.setLocale(locale);
  const fixture = TestBed.createComponent(SiteFooter);
  fixture.detectChanges();
  return { host: fixture.nativeElement as HTMLElement, i18n };
}

describe('SiteFooter', () => {
  for (const locale of ['fr', 'en'] as const) {
    it(`relie chaque page publique en ${locale}, hors celles déjà en en-tête`, () => {
      const { host, i18n } = setup(locale);
      const hrefs = [...host.querySelectorAll('a')].map((a) => a.getAttribute('href'));

      for (const route of Object.keys(ROUTE_PATHS) as RouteName[]) {
        if (EXEMPT.includes(route)) continue;
        expect(hrefs, `route « ${route} » absente du pied de page en ${locale}`).toContain(
          i18n.link(route),
        );
      }
    });
  }

  it("dit ce que l'outil fait des données, en une phrase", () => {
    const { host } = setup('fr');
    expect(host.textContent).toContain('Vos patrons restent sur votre appareil');
  });
});

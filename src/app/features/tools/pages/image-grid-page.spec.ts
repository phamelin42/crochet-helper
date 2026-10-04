import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import ImageGridPage from './image-grid-page';

function render(locale: 'fr' | 'en') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { locale } } } },
    ],
  });
  const fixture = TestBed.createComponent(ImageGridPage);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ImageGridPage', () => {
  for (const locale of ['fr', 'en'] as const) {
    it(`affiche titre, outil, trois étapes et quatre questions en ${locale}`, () => {
      const host = render(locale);
      expect(host.querySelector('h1')?.textContent).toBeTruthy();
      expect(host.querySelector('button')?.textContent?.trim()).toBe(
        locale === 'fr' ? 'Choisir une image' : 'Choose an image',
      );
      expect(host.querySelectorAll('.step-cards li')).toHaveLength(3);
      expect(host.querySelectorAll('h3')).toHaveLength(4);
    });

    it(`ramène au lecteur ${locale} par un lien`, () => {
      const host = render(locale);
      const href = [...host.querySelectorAll('a')].map((a) => a.getAttribute('href'));
      const reader = ROUTE_PATHS.reader[locale];
      expect(href).toContain(locale === 'fr' ? '/fr' : reader);
    });
  }
});

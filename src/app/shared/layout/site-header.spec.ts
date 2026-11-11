import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { I18nService } from '../../core/i18n/i18n.service';
import { SiteHeader } from './site-header';

/** Un repère de navigation se nomme par son rôle, pas par une page : « Accueil »
 *  annoncerait « navigation Accueil » devant un menu de cinq pages. */
const NAMES = { fr: 'Principale', en: 'Main' } as const;

describe('SiteHeader', () => {
  for (const locale of ['fr', 'en'] as const) {
    it(`en ${locale}, le repère de navigation se nomme « ${NAMES[locale]} »`, () => {
      TestBed.configureTestingModule({ providers: [provideRouter([])] });
      TestBed.inject(I18nService).setLocale(locale);
      const fixture = TestBed.createComponent(SiteHeader);
      fixture.detectChanges();

      const nav = (fixture.nativeElement as HTMLElement).querySelector('nav');

      expect(nav?.getAttribute('aria-label')).toBe(NAMES[locale]);
    });
  }
});

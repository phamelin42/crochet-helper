import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import type { Locale } from '../../core/i18n/locale';
import SettingsPage from './settings-page';

/** Le libellé que la lectrice voit au-dessus de chaque groupe, par langue. */
const VISIBLE_LABELS: Record<Locale, readonly string[]> = {
  fr: ['Taille du texte', 'À l’ouverture d’un patron'],
  en: ['Text size', 'When a pattern opens'],
};

describe('SettingsPage : groupes de boutons', () => {
  for (const locale of ['fr', 'en'] as const) {
    it(`en ${locale}, chaque groupe a un libellé visible, lié au groupe`, () => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          { provide: ActivatedRoute, useValue: { snapshot: { data: { locale } } } },
        ],
      });
      const fixture = TestBed.createComponent(SettingsPage);
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;

      const groups = [...host.querySelectorAll('[role="radiogroup"]')];
      expect(groups.length).toBe(VISIBLE_LABELS[locale].length);
      groups.forEach((group, i) => {
        const id = group.getAttribute('aria-labelledby');
        const label = id ? host.querySelector(`#${id}`) : null;
        expect(label, `groupe ${i} sans libellé lié`).toBeTruthy();
        expect(label?.textContent?.trim()).toBe(VISIBLE_LABELS[locale][i]);
        expect(label?.classList.contains('visually-hidden')).toBe(false);
        expect(group.hasAttribute('aria-label'), 'pas de double nom').toBe(false);
      });
    });
  }
});

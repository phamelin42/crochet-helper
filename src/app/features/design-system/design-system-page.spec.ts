import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { ICONS } from '../../shared/ui/icon/icon';
import { DesignSystemPage } from './design-system-page';

function setup() {
  TestBed.configureTestingModule({
    providers: [{ provide: ActivatedRoute, useValue: { snapshot: { data: { locale: 'fr' } } } }],
  });
  const fixture = TestBed.createComponent(DesignSystemPage);
  fixture.detectChanges();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

describe('DesignSystemPage', () => {
  it("n'est jamais indexable : une page d'équipe qui fuit dans les résultats de recherche serait une régression", () => {
    setup();

    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toBe('noindex, nofollow');
  });

  it('montre chaque icône du jeu — une grille incomplète cacherait une icône disponible', () => {
    const { host } = setup();

    const shown = [...host.querySelectorAll('.ds-icon-grid code')].map((el) => el.textContent);
    expect(shown.sort()).toEqual(Object.keys(ICONS).sort());
  });
});

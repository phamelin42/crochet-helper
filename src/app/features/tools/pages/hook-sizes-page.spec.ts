import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { HOOK_SIZES } from '../../converter/data/hook-sizes';
import { HookSizesPage } from './hook-sizes-page';

function setup(locale: 'fr' | 'en') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { locale } } } },
    ],
  });
  const fixture = TestBed.createComponent(HookSizesPage);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;

  const search = (value: string) => {
    const input = host.querySelector<HTMLInputElement>('#hook-size-input');
    if (!input) throw new Error('Champ de recherche introuvable');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    return host.querySelector('[aria-live]')?.textContent?.replace(/\s+/g, ' ').trim();
  };
  return { host, search };
}

describe('HookSizesPage', () => {
  it('affiche une ligne du tableau par taille de la norme', () => {
    const { host } = setup('en');
    expect(host.querySelectorAll('table tbody tr')).toHaveLength(HOOK_SIZES.length);
    expect(host.querySelector('table caption')?.textContent).toContain('Craft Yarn Council');
  });

  it('donne l’équivalent en millimètres d’une taille américaine, et inversement', () => {
    const { search } = setup('en');
    expect(search('g6')).toBe('4 mm = US G-6');
    expect(search('4 mm')).toBe('4 mm = US G-6');
    expect(search('7')).toBe('4.5 mm = US 7');
  });

  it('écrit les diamètres avec une virgule en français', () => {
    const { host, search } = setup('fr');
    expect(search('E-4')).toBe('3,5 mm = US E-4');
    expect(host.querySelector('table tbody td')?.textContent?.replace(/\s+/g, ' ')).toBe('2,25 mm');
  });

  it('dit qu’une taille est hors norme au lieu de se taire', () => {
    const { search } = setup('fr');
    expect(search('3 mm')).toBe('Cette taille n’est pas dans la norme.');
    expect(search('')).toBe('L’équivalent s’affichera ici.');
  });
});

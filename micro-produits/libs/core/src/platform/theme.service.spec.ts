import { TestBed } from '@angular/core/testing';
import { PRODUIT, ProduitConfig } from '../produit/produit';
import { ThemeService } from './theme.service';

function avecSombre(sombre: boolean): void {
  TestBed.configureTestingModule({
    providers: [{ provide: PRODUIT, useValue: { theme: { sombre } } as ProduitConfig }],
  });
}

describe('ThemeService', () => {
  afterEach(() => {
    delete document.documentElement.dataset['theme'];
    localStorage.clear();
  });

  it('reste clair par défaut, même si le système préfère le sombre', () => {
    avecSombre(true);
    const theme = TestBed.inject(ThemeService);
    expect(theme.theme()).toBe('clair');
    expect(document.documentElement.dataset['theme']).toBeUndefined();
  });

  it('bascule explicitement et retient le choix', () => {
    avecSombre(true);
    const theme = TestBed.inject(ThemeService);
    theme.basculer();
    expect(document.documentElement.dataset['theme']).toBe('sombre');
    expect(localStorage.getItem('mp.theme')).toBe('"sombre"');
    theme.basculer();
    expect(document.documentElement.dataset['theme']).toBeUndefined();
  });

  it('n’est pas proposé quand le produit ne l’active pas', () => {
    avecSombre(false);
    expect(TestBed.inject(ThemeService).disponible).toBe(false);
  });
});

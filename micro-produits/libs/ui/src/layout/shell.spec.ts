import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PRODUIT, ProduitConfig, Typographie } from '@mp/core';
import { Shell } from './shell';

const TYPOS: Typographie[] = ['humaniste', 'geometrique', 'serif', 'arrondie'];

function produit(typographie: Typographie): ProduitConfig {
  return {
    slug: 'essai',
    nom: 'Essai',
    domaine: 'essai.fr',
    requete: 'essai',
    description: 'Description',
    promesse: 'Promesse',
    exports: [],
    logo: 'logo.svg',
    theme: { accent: '#e07a8f', accentFonce: '#9c2f48', typographie, sombre: false },
    offre: { statut: 'bientot' },
    editeur: { nom: '', statut: '', adresse: '', contact: '', hebergeur: '' },
    mesure: { origine: '', siteId: '', googleVerification: '' },
  };
}

describe('Shell', () => {
  for (const typo of TYPOS) {
    it(`pose le thème du produit sur la coquille (typographie ${typo})`, async () => {
      TestBed.configureTestingModule({
        providers: [provideRouter([]), { provide: PRODUIT, useValue: produit(typo) }],
      });
      const fixture = TestBed.createComponent(Shell);
      await fixture.whenStable();
      const style = (fixture.nativeElement as HTMLElement).style;
      expect(style.getPropertyValue('--color-accent')).toBe('#e07a8f');
      expect(style.getPropertyValue('--color-primary')).toBe('#9c2f48');
      expect(style.getPropertyValue('--font-body')).toBe(`var(--font-${typo})`);
    });
  }

  it('n’affiche le bouton du thème sombre que si le produit le propose', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PRODUIT, useValue: produit('serif') }],
    });
    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Fond sombre');
  });
});

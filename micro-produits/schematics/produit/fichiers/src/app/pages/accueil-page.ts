import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Contenu, PRODUIT, SeoService } from '@mp/core';
import { Blocs, Hero, OffreBlock } from '@mp/ui/sections';
import contenu from '../../../contenu.json';
import { Metier } from '../metier/metier';

/**
 * Accueil = l'outil, entouré du contenu éditorial propre à ce produit
 * (`contenu.json`). La structure est commune ; les mots ne le sont jamais.
 */
@Component({
  selector: 'app-accueil-page',
  imports: [Blocs, Hero, Metier, OffreBlock, RouterLink],
  template: `
    <mp-hero [titre]="c.accueil.titre" [chapo]="c.accueil.chapo" />
    <app-metier />
    <mp-blocs id="explication" titre="Comment ça marche" [blocs]="c.accueil.explication" />
    <mp-blocs id="exemples" titre="Exemples" [blocs]="c.accueil.exemples" />
    <p><a routerLink="/aide">Aide et questions fréquentes</a></p>
    <mp-offre-block [offre]="c.offre" />
  `,
})
export class AccueilPage {
  protected readonly c: Contenu = contenu;

  constructor() {
    const produit = inject(PRODUIT);
    inject(SeoService).apply({
      title: `${contenu.accueil.titre} — ${produit.nom}`,
      description: produit.description,
      path: '/',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: produit.nom,
        description: produit.description,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Web',
        inLanguage: 'fr',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      },
    });
  }
}

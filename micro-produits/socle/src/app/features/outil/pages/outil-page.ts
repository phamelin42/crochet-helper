import { Component, inject } from '@angular/core';
import { PRODUIT } from '../../../core/produit';
import { SeoService } from '../../../core/seo/seo.service';
import { OffreBlock } from '../components/offre-block';
import { OutilDemarrage } from '../components/outil-demarrage';

/**
 * Page d'accueil = l'outil. Le titre reprend la requête visée : c'est elle
 * qui amène la visite (CLAUDE.md, « Acquisition »).
 */
@Component({
  selector: 'app-outil-page',
  imports: [OffreBlock, OutilDemarrage],
  template: `
    <section class="hero">
      <h1>{{ produit.nom }}</h1>
      <p class="lead">{{ produit.promesse }}</p>
    </section>
    <app-outil-demarrage />
    <app-offre-block />
  `,
})
export class OutilPage {
  protected readonly produit = PRODUIT;

  constructor() {
    inject(SeoService).apply({
      title: `${PRODUIT.nom} — ${PRODUIT.requete}`,
      description: PRODUIT.description,
      path: '/',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: PRODUIT.nom,
        description: PRODUIT.description,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Web',
        inLanguage: 'fr',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      },
    });
  }
}

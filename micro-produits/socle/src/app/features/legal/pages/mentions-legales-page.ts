import { Component, inject } from '@angular/core';
import { PRODUIT } from '../../../core/produit';
import { SeoService } from '../../../core/seo/seo.service';

@Component({
  selector: 'app-mentions-legales-page',
  template: `
    <article class="prose">
      <h1>Mentions légales</h1>
      <h2>Éditeur</h2>
      <p>
        {{ e.nom }}<br />{{ e.statut }}<br />{{ e.adresse }}<br />Contact&nbsp;: {{ e.contact }}
      </p>
      <h2>Hébergement</h2>
      <p>{{ e.hebergeur }}</p>
      <h2>Responsabilité</h2>
      <p>
        {{ nom }} est un outil d'aide. Les documents produits sont à relire par leur auteur, qui en
        reste responsable&nbsp;; ils ne remplacent pas le conseil d'un professionnel.
      </p>
    </article>
  `,
})
export class MentionsLegalesPage {
  protected readonly e = PRODUIT.editeur;
  protected readonly nom = PRODUIT.nom;

  constructor() {
    inject(SeoService).apply({
      title: `Mentions légales — ${PRODUIT.nom}`,
      description: `Éditeur, hébergeur et conditions d'utilisation de ${PRODUIT.nom}.`,
      path: '/mentions-legales',
    });
  }
}

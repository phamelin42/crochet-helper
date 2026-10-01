import { Component, inject } from '@angular/core';
import { Contenu, SeoService } from '@mp/core';
import { Blocs, Faq, Hero, OffreBlock } from '@mp/ui/sections';
import contenu from '../../contenu.json';

/**
 * Vitrine interne : chaque composant de `@mp/ui` dans ses états, avec le
 * thème de ce faux produit. Non indexée, jamais publiée. Un composant ajouté
 * à `libs/ui` y entre (tools/check-vitrine.mjs). Ses textes sont des
 * exemples, exclus du contrôle de contenu unique.
 */
@Component({
  selector: 'app-vitrine-page',
  imports: [Blocs, Faq, Hero, OffreBlock],
  template: `
    <mp-hero [titre]="c.accueil.titre" [chapo]="c.accueil.chapo" />
    <section class="card" aria-labelledby="boutons">
      <h2 id="boutons">Boutons</h2>
      <p>
        <button type="button" class="btn btn-primary">Action principale</button>
        <button type="button" class="btn btn-secondary">Action secondaire</button>
      </p>
    </section>
    <mp-blocs id="blocs" titre="Blocs" [blocs]="c.accueil.explication" />
    <mp-faq [questions]="c.aide.faq" />
    <mp-offre-block [offre]="c.offre" />
  `,
})
export class VitrinePage {
  protected readonly c: Contenu = contenu;

  constructor() {
    inject(SeoService).apply({
      title: 'Vitrine des composants partagés',
      description: contenu.aide.description,
      path: '/',
      noIndex: true,
    });
  }
}

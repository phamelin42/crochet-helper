import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PRODUIT } from '@mp/core';

/**
 * Pied de page volontairement sans texte rédigé : une phrase répétée sur les
 * dix sites serait du contenu dupliqué (docs/contenu-unique.md).
 */
@Component({
  selector: 'mp-site-footer',
  imports: [RouterLink],
  template: `
    <footer class="site-footer">
      <nav aria-label="Pied de page">
        <a routerLink="/">{{ nom }}</a>
        <a routerLink="/aide">Aide et questions fréquentes</a>
        <a routerLink="/mentions-legales">Mentions légales</a>
        <a routerLink="/confidentialite">Confidentialité</a>
      </nav>
    </footer>
  `,
})
export class SiteFooter {
  protected readonly nom = inject(PRODUIT).nom;
}

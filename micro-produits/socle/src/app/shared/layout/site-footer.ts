import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PRODUIT } from '../../core/produit';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  template: `
    <footer class="site-footer">
      <p>{{ nom }} — gratuit, sans inscription, vos données restent sur votre appareil.</p>
      <nav aria-label="Informations légales">
        <a routerLink="/mentions-legales">Mentions légales</a>
        <a routerLink="/confidentialite">Confidentialité</a>
      </nav>
    </footer>
  `,
})
export class SiteFooter {
  protected readonly nom = PRODUIT.nom;
}

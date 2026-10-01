import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PRODUIT } from '../../core/produit';
import { InstallButton } from '../ui/install-button';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, InstallButton],
  template: `
    <header class="site-header">
      <a class="brand" routerLink="/">
        <img src="/favicon.svg" alt="" width="32" height="32" />
        <span>{{ nom }}</span>
      </a>
      <app-install-button />
    </header>
  `,
})
export class SiteHeader {
  protected readonly nom = PRODUIT.nom;
}

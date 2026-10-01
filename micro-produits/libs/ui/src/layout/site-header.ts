import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PRODUIT } from '@mp/core';
import { InstallButton } from './install-button';
import { ThemeToggle } from './theme-toggle';

@Component({
  selector: 'mp-site-header',
  imports: [RouterLink, InstallButton, ThemeToggle],
  template: `
    <header class="site-header">
      <a class="brand" routerLink="/">
        <img [src]="'/' + produit.logo" alt="" width="32" height="32" />
        <span>{{ produit.nom }}</span>
      </a>
      <div class="header-actions">
        <mp-theme-toggle />
        <mp-install-button />
      </div>
    </header>
  `,
})
export class SiteHeader {
  protected readonly produit = inject(PRODUIT);
}

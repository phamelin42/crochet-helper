import {
  ApplicationRef,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PRODUIT } from '@mp/core';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';
import { UpdateBanner } from './update-banner';

/**
 * Coquille commune : lien d'évitement, en-tête, bannière de mise à jour,
 * contenu routé, pied de page. Le thème du produit (couleurs, typographie)
 * se pose ici en propriétés CSS, depuis `produit.json` : présent dans le HTML
 * pré-rendu, donc sans changement d'apparence au chargement.
 */
@Component({
  selector: 'mp-shell',
  // `data-ready` : posé une fois l'application hydratée et la page rendue ;
  // les tests e2e l'attendent avant d'agir.
  host: { '[style]': 'variables()', '[attr.data-ready]': "ready() ? '' : null" },
  imports: [RouterOutlet, SiteFooter, SiteHeader, UpdateBanner],
  template: `
    <a class="skip-link" href="#main">Aller au contenu</a>
    <mp-site-header />
    <mp-update-banner />
    <main id="main" tabindex="-1">
      <router-outlet />
    </main>
    <mp-site-footer />
  `,
})
export class Shell {
  private readonly theme = inject(PRODUIT).theme;
  protected readonly ready = signal(false);
  protected readonly variables = computed(
    () =>
      `--color-accent: ${this.theme.accent}; --color-primary: ${this.theme.accentFonce}; ` +
      `--font-body: var(--font-${this.theme.typographie})`,
  );

  constructor() {
    const appRef = inject(ApplicationRef);
    afterNextRender(() => void appRef.whenStable().then(() => this.ready.set(true)));
  }
}

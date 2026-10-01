import { ApplicationRef, Component, afterNextRender, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteFooter } from './shared/layout/site-footer';
import { SiteHeader } from './shared/layout/site-header';
import { UpdateBanner } from './shared/layout/update-banner';

/** Coquille : en-tête, contenu routé, pied de page. */
@Component({
  selector: 'app-root',
  // Posé une fois l'application hydratée et la page rendue : les tests e2e
  // l'attendent avant d'agir (un clic avant hydratation est perdu).
  host: { '[attr.data-ready]': "ready() ? '' : null" },
  imports: [RouterOutlet, SiteFooter, SiteHeader, UpdateBanner],
  template: `
    <a class="skip-link" href="#main">Aller au contenu</a>
    <app-site-header />
    <app-update-banner />
    <main id="main" tabindex="-1">
      <router-outlet />
    </main>
    <app-site-footer />
  `,
})
export class App {
  protected readonly ready = signal(false);

  constructor() {
    const appRef = inject(ApplicationRef);
    afterNextRender(() => void appRef.whenStable().then(() => this.ready.set(true)));
  }
}

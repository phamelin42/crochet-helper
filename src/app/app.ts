import {
  ApplicationRef,
  Component,
  ViewContainerRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { I18nService } from './core/i18n/i18n.service';
import { AppChrome } from './shared/layout/app-chrome';
import { SiteFooter } from './shared/layout/site-footer';
import { SiteHeader } from './shared/layout/site-header';
import { TooltipHost } from './shared/ui/tooltip/tooltip-host';

/** Coquille de l'application : en-tête, contenu routé, infobulle globale. */
@Component({
  selector: 'fil-root',
  // Absent du HTML pré-rendu, posé une fois l'application hydratée **et** la
  // page routée rendue (`whenStable` attend la navigation initiale) : avant,
  // un clic est perdu (pas de rejeu d'événements, voir app.config.ts) et un
  // champ rempli est réinitialisé par l'hydratation de la page. Les tests e2e
  // l'attendent avant d'agir.
  host: { '[attr.data-ready]': "ready() ? '' : null" },
  imports: [AppChrome, RouterOutlet, SiteFooter, SiteHeader, TooltipHost],
  template: `
    <a class="skip-link" href="#main">{{ i18n.t('ui.skipToContent') }}</a>
    <fil-site-header />
    <fil-app-chrome />
    <main id="main" tabindex="-1">
      <router-outlet />
    </main>
    <fil-site-footer />
    <fil-tooltip-host />
  `,
})
export class App {
  protected readonly i18n = inject(I18nService);
  protected readonly ready = signal(false);
  private readonly view = inject(ViewContainerRef);

  constructor() {
    const appRef = inject(ApplicationRef);
    // afterNextRender : navigateur seulement, jamais dans le HTML pré-rendu.
    afterNextRender(
      () =>
        void appRef.whenStable().then(() => {
          this.ready.set(true);
          void this.suggestLanguage();
        }),
    );
  }

  /**
   * Propose l'autre langue à qui la lit dans son navigateur. Chargé à la
   * demande, après le premier affichage : rien au bundle initial.
   */
  private async suggestLanguage(): Promise<void> {
    const { LanguageSuggestion } = await import('./shared/layout/language-suggestion');
    // Posé à côté de `fil-root`, en surimpression : rien du gabarit ne bouge.
    this.view.createComponent(LanguageSuggestion);
  }
}

import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { I18nService } from './core/i18n/i18n.service';
import { SiteHeader } from './shared/layout/site-header';
import { TooltipHost } from './shared/ui/tooltip/tooltip-host';

/** Coquille de l'application : en-tête, contenu routé, infobulle globale. */
@Component({
  selector: 'fil-root',
  imports: [RouterOutlet, SiteHeader, TooltipHost],
  template: `
    <a class="skip-link" href="#main">{{ i18n.t('ui.skipToContent') }}</a>
    <fil-site-header />
    <main id="main" tabindex="-1">
      <router-outlet />
    </main>
    <fil-tooltip-host />
  `,
})
export class App {
  protected readonly i18n = inject(I18nService);
}

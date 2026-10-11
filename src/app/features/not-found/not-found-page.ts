import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DEFAULT_LOCALE, localePrefix } from '../../core/i18n/locale';
import { ROUTE_PATHS } from '../../core/i18n/route-paths';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_NAME } from '../../core/seo/site';
import { Button } from '../../shared/ui/button/button';

/**
 * Adresse inconnue. Le serveur répond déjà 404 ; la page le dit à la lectrice
 * au lieu d'afficher le lecteur comme si de rien n'était. Elle est pré-rendue
 * une seule fois (`404.html`), sans savoir quelle langue l'adresse visait : les
 * deux langues y figurent, et chacune mène à son accueil et à son glossaire.
 */
@Component({
  selector: 'fil-not-found-page',
  imports: [Button, RouterLink],
  host: { class: 'wrap' },
  template: `
    <section class="hero">
      <h1>Page not found</h1>
      <p>
        This address leads nowhere. Go back to the reader to paste a pattern, or browse the
        glossary.
      </p>
      <div class="cta-row">
        <a filButton="primary" [routerLink]="home.en">Back to the reader</a>
        <a filButton="secondary" [routerLink]="glossary.en">Glossary</a>
      </div>
    </section>

    <section class="hero" lang="fr">
      <h2>Page introuvable</h2>
      <p>
        Cette adresse ne mène nulle part. Retournez au lecteur pour coller un patron, ou parcourez
        le glossaire.
      </p>
      <div class="cta-row">
        <a filButton="primary" [routerLink]="home.fr">Retour au lecteur</a>
        <a filButton="secondary" [routerLink]="glossary.fr">Glossaire</a>
      </div>
    </section>
  `,
})
export default class NotFoundPage {
  private readonly seo = inject(SeoService);

  protected readonly home = { en: localePrefix('en') || '/', fr: localePrefix('fr') };
  protected readonly glossary = {
    en: localePrefix('en') + ROUTE_PATHS.glossary.en,
    fr: localePrefix('fr') + ROUTE_PATHS.glossary.fr,
  };

  constructor() {
    this.seo.apply({
      title: `Page not found — ${SITE_NAME}`,
      description: 'This page does not exist. Page introuvable.',
      path: ROUTE_PATHS.reader,
      locale: DEFAULT_LOCALE,
      noIndex: true,
    });
  }
}

import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';

/**
 * Pied de page : un seul lien aujourd'hui, vers le kit pour les créatrices de
 * patrons (fiche 23). Un lien posé ici plutôt que seulement en page d'accueil
 * pour qu'il reste joignable depuis n'importe quelle page.
 */
@Component({
  selector: 'fil-site-footer',
  imports: [RouterLink],
  host: { class: 'site-footer' },
  template: ` <a [routerLink]="i18n.link('forDesigners')">{{ i18n.t('footer.designers') }}</a> `,
})
export class SiteFooter {
  protected readonly i18n = inject(I18nService);
}

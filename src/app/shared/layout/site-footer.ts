import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';

/**
 * Deux colonnes de maillage interne, écrites à plat : `site-footer.spec.ts`
 * vérifie que chaque route publique de `ROUTE_PATHS` non déjà présente dans la
 * navigation d'en-tête (visible sur toute page — lecteur, projets, glossaire,
 * bien formater, convertisseur) y a son lien. Le pied de page se concentre
 * donc sur le maillage qui manquait vraiment : les guides, le compteur de
 * rangs et le kit créatrices, plutôt que de dupliquer l'en-tête.
 */
@Component({
  selector: 'fil-site-footer',
  imports: [RouterLink],
  host: { class: 'site-footer', role: 'contentinfo' },
  template: `
    <div class="footer-columns">
      <div>
        <p class="footer-heading">{{ i18n.t('footer.learn') }}</p>
        <a [routerLink]="i18n.link('guideReadingPattern')">{{
          i18n.t('footer.guideReadingPattern')
        }}</a>
        <a [routerLink]="i18n.link('guideReadingChart')">{{
          i18n.t('footer.guideReadingChart')
        }}</a>
        <a [routerLink]="i18n.link('guideCrochetOrKnitting')">{{
          i18n.t('footer.guideCrochetOrKnitting')
        }}</a>
      </div>
      <div>
        <p class="footer-heading">{{ i18n.t('footer.project') }}</p>
        <a [routerLink]="i18n.link('rowCounter')">{{ i18n.t('footer.rowCounter') }}</a>
        <a [routerLink]="i18n.link('hookSizes')">{{ i18n.t('footer.hookSizes') }}</a>
        <a [routerLink]="i18n.link('gaugeCalculator')">{{ i18n.t('footer.gaugeCalculator') }}</a>
        <a [routerLink]="i18n.link('forDesigners')">{{ i18n.t('footer.forDesigners') }}</a>
        <a href="https://discord.gg/DPYydhZRND" target="_blank" rel="noopener">{{
          i18n.t('ui.discord')
        }}</a>
        <a [href]="i18n.otherLocaleHref()" [attr.hreflang]="i18n.other()">{{
          i18n.other().toUpperCase()
        }}</a>
      </div>
    </div>
    <p class="footer-tagline">{{ i18n.t('footer.tagline') }}</p>
  `,
})
export class SiteFooter {
  protected readonly i18n = inject(I18nService);
}

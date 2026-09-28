import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';

/**
 * Trois colonnes de maillage interne, écrites à plat plutôt qu'en boucle sur
 * `ROUTE_PATHS` : à budget de bundle serré, un `@for` coûte plus que onze
 * liens statiques. `site-footer.spec.ts` couvre le risque inverse — une route
 * publique oubliée ici — en bouclant côté test.
 */
@Component({
  selector: 'fil-site-footer',
  imports: [RouterLink],
  host: { class: 'site-footer', role: 'contentinfo' },
  template: `
    <div class="footer-columns">
      <div>
        <p class="footer-heading">{{ i18n.t('footer.tools') }}</p>
        <a [routerLink]="i18n.link('reader')">{{ i18n.t('nav.reader') }}</a>
        <a [routerLink]="i18n.link('converter')">{{ i18n.t('nav.converter') }}</a>
      </div>
      <div>
        <p class="footer-heading">{{ i18n.t('footer.learn') }}</p>
        <a [routerLink]="i18n.link('glossary')">{{ i18n.t('nav.glossary') }}</a>
        <a [routerLink]="i18n.link('format')">{{ i18n.t('nav.format') }}</a>
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
        <a [routerLink]="i18n.link('forDesigners')">{{ i18n.t('footer.forDesigners') }}</a>
        <a href="https://discord.gg/DPYydhZRND" target="_blank" rel="noopener">{{
          i18n.t('ui.discord')
        }}</a>
        <a [href]="i18n.otherLocaleHref()" [attr.hreflang]="i18n.other()">{{
          i18n.t('footer.otherLanguage')
        }}</a>
      </div>
    </div>
    <p class="footer-tagline">{{ i18n.t('footer.tagline') }}</p>
  `,
})
export class SiteFooter {
  protected readonly i18n = inject(I18nService);
}

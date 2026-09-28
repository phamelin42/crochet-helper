import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { RouteName } from '../../core/i18n/route-paths';
import { TranslationKey } from '../../core/i18n/translations';

interface FooterLink {
  readonly route: RouteName;
  readonly label: TranslationKey;
}

interface FooterColumn {
  readonly heading: TranslationKey;
  readonly links: readonly FooterLink[];
}

/**
 * Trois colonnes de maillage interne, générées par un `@for` : `site-footer.spec.ts`
 * vérifie que chaque route publique de `ROUTE_PATHS` (hors lecteur et projets,
 * déjà joignables ailleurs) y a son lien, colonne par colonne ci-dessous.
 */
const COLUMNS: readonly FooterColumn[] = [
  {
    heading: 'footer.tools',
    links: [
      { route: 'reader', label: 'nav.reader' },
      { route: 'converter', label: 'nav.converter' },
    ],
  },
  {
    heading: 'footer.learn',
    links: [
      { route: 'glossary', label: 'nav.glossary' },
      { route: 'format', label: 'nav.format' },
      { route: 'guideReadingPattern', label: 'footer.guideReadingPattern' },
      { route: 'guideReadingChart', label: 'footer.guideReadingChart' },
      { route: 'guideCrochetOrKnitting', label: 'footer.guideCrochetOrKnitting' },
    ],
  },
  {
    heading: 'footer.project',
    links: [{ route: 'forDesigners', label: 'footer.forDesigners' }],
  },
];

@Component({
  selector: 'fil-site-footer',
  imports: [RouterLink],
  host: { class: 'site-footer', role: 'contentinfo' },
  template: `
    <div class="footer-columns">
      @for (col of columns; track col.heading) {
        <div>
          <p class="footer-heading">{{ i18n.t(col.heading) }}</p>
          @for (link of col.links; track link.route) {
            <a [routerLink]="i18n.link(link.route)">{{ i18n.t(link.label) }}</a>
          }
          @if ($last) {
            <a href="https://discord.gg/DPYydhZRND" target="_blank" rel="noopener">{{
              i18n.t('ui.discord')
            }}</a>
            <a [href]="i18n.otherLocaleHref()" [attr.hreflang]="i18n.other()">{{
              i18n.other().toUpperCase()
            }}</a>
          }
        </div>
      }
    </div>
    <p class="footer-tagline">{{ i18n.t('footer.tagline') }}</p>
  `,
})
export class SiteFooter {
  protected readonly i18n = inject(I18nService);
  protected readonly columns = COLUMNS;
}

import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { RouteName } from '../../core/i18n/route-paths';
import { TranslationKey } from '../../core/i18n/translations';

interface FooterEntry {
  readonly route: RouteName;
  readonly label: TranslationKey;
}

interface FooterColumn {
  readonly heading: TranslationKey;
  readonly entries: readonly FooterEntry[];
}

/**
 * Deux colonnes de maillage interne, entièrement composées de routes de
 * `ROUTE_PATHS`. La troisième colonne (« Le projet ») est rendue à part dans
 * le template : elle mélange une route interne et des liens externes
 * (Discord, l'autre langue). Une route publique de `ROUTE_PATHS` absente
 * d'ici — hors `reader` et `projects`, déjà joignables ailleurs — fait échouer
 * `site-footer.spec.ts` : toute page future doit s'y ajouter.
 */
const COLUMNS: readonly FooterColumn[] = [
  {
    heading: 'footer.tools',
    entries: [
      { route: 'reader', label: 'nav.reader' },
      { route: 'converter', label: 'nav.converter' },
    ],
  },
  {
    heading: 'footer.learn',
    entries: [
      { route: 'glossary', label: 'nav.glossary' },
      { route: 'format', label: 'nav.format' },
      { route: 'guideReadingPattern', label: 'footer.guideReadingPattern' },
      { route: 'guideReadingChart', label: 'footer.guideReadingChart' },
      { route: 'guideCrochetOrKnitting', label: 'footer.guideCrochetOrKnitting' },
    ],
  },
];

@Component({
  selector: 'fil-site-footer',
  imports: [RouterLink],
  host: { class: 'site-footer' },
  template: `
    <div class="footer-columns">
      @for (column of columns; track column.heading) {
        <nav [attr.aria-label]="i18n.t(column.heading)">
          <h2>{{ i18n.t(column.heading) }}</h2>
          <ul>
            @for (entry of column.entries; track entry.route) {
              <li><a [routerLink]="i18n.link(entry.route)">{{ i18n.t(entry.label) }}</a></li>
            }
          </ul>
        </nav>
      }
      <nav [attr.aria-label]="i18n.t('footer.project')">
        <h2>{{ i18n.t('footer.project') }}</h2>
        <ul>
          <li><a [routerLink]="i18n.link('forDesigners')">{{ i18n.t('footer.forDesigners') }}</a></li>
          <li>
            <a href="https://discord.gg/DPYydhZRND" target="_blank" rel="noopener">{{
              i18n.t('ui.discord')
            }}</a>
          </li>
          <li>
            <a [href]="i18n.otherLocaleHref()" [attr.hreflang]="i18n.other()">{{
              i18n.t('footer.otherLanguage')
            }}</a>
          </li>
        </ul>
      </nav>
    </div>
    <p class="footer-tagline">{{ i18n.t('footer.tagline') }}</p>
  `,
})
export class SiteFooter {
  protected readonly i18n = inject(I18nService);
  protected readonly columns = COLUMNS;
}

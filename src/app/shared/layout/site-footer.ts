import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';

// En boucle plutôt qu'à plat : chaque lien de plus coûtait des octets au bundle initial.
// Les clés sont celles de `ROUTE_PATHS` et de `footer.*` (mêmes noms).
const LEARN = [
  'guideReadingPattern',
  'readForeignPattern',
  'guideReadingChart',
  'guideCrochetOrKnitting',
] as const;
const PROJECT = ['rowCounter', 'hookSizes', 'gaugeCalculator', 'forDesigners'] as const;

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
        @for (key of learn; track key) {
          <a [routerLink]="i18n.link(key)">{{ label(key) }}</a>
        }
      </div>
      <div>
        <p class="footer-heading">{{ i18n.t('footer.project') }}</p>
        @for (key of project; track key) {
          <a [routerLink]="i18n.link(key)">{{ label(key) }}</a>
        }
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
  protected readonly learn = LEARN;
  protected readonly project = PROJECT;

  protected label(key: (typeof LEARN)[number] | (typeof PROJECT)[number]): string {
    return this.i18n.t(`footer.${key}`);
  }
}

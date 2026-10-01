import { Component, EnvironmentInjector, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale } from '../../core/i18n/locale';
import { ROUTE_PATHS } from '../../core/i18n/route-paths';
import { DisplayPrefsService, ReaderTextSize } from '../../core/platform/display-prefs.service';
import { WakeLockService } from '../../core/platform/wake-lock.service';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_NAME } from '../../core/seo/site';
import { Checkbox } from '../../shared/ui/checkbox/checkbox';
import { Segmented, SegmentedOption } from '../../shared/ui/segmented/segmented';

const TEXT_SIZES: readonly ReaderTextSize[] = ['base', 'lg', 'xl'];

const COPY = {
  fr: {
    title: `Réglages — ${SITE_NAME}`,
    description: 'Fond sombre, écran allumé, langue et taille du texte.',
    h1: 'Réglages',
    display: 'Affichage',
    dim: 'Fond sombre',
    wake: 'Garder l’écran allumé',
    textSize: 'Taille du texte',
    language: 'Langue',
    switchLanguage: 'Passer en English',
    more: 'Pour aller plus loin',
    discord: 'Rejoindre le Discord',
    privacy: 'Confidentialité',
    guideReadingPattern: 'Lire un patron',
    guideReadingChart: 'Lire un diagramme',
    guideCrochetOrKnitting: 'Crochet ou tricot',
  },
  en: {
    title: `Settings — ${SITE_NAME}`,
    description: 'Dark background, screen kept awake, language and text size.',
    h1: 'Settings',
    display: 'Display',
    dim: 'Dark background',
    wake: 'Keep screen awake',
    textSize: 'Text size',
    language: 'Language',
    switchLanguage: 'Passer en français',
    more: 'Learn more',
    discord: 'Join the Discord',
    privacy: 'Privacy',
    guideReadingPattern: 'Reading a pattern',
    guideReadingChart: 'Reading a chart',
    guideCrochetOrKnitting: 'Crochet or knitting',
  },
} satisfies Record<Locale, Record<string, string>>;

const GUIDES = ['guideReadingPattern', 'guideReadingChart', 'guideCrochetOrKnitting'] as const;

/**
 * Réglages (fiche 43) : ce que l'en-tête du site porte, regroupé pour le mode
 * appli, où l'en-tête est masqué. La route existe aussi dans un navigateur,
 * mais elle n'est reliée que depuis la barre d'onglets : `noIndex`, hors
 * sitemap, pour ne pas devenir une page orpheline indexée.
 */
@Component({
  selector: 'fil-settings-page',
  imports: [Checkbox, RouterLink, Segmented],
  host: { class: 'wrap' },
  template: `
    <article class="settings">
      <h1>{{ c.h1 }}</h1>

      <section class="settings-group">
        <h2>{{ c.display }}</h2>
        <fil-checkbox [checked]="prefs.dim()" (checkedChange)="setDim($event)" [label]="c.dim" />
        @if (wakeLock.supported()) {
          <fil-checkbox
            [checked]="wakeLock.active()"
            (checkedChange)="wakeLock.toggle()"
            [label]="c.wake"
          />
        }
        <fil-segmented
          name="settings-text-size"
          [label]="c.textSize"
          [options]="textSizeOptions"
          [selected]="textSizeIndex()"
          (selectedChange)="setTextSize($event)"
        />
      </section>

      <section class="settings-group">
        <h2>{{ c.language }}</h2>
        <a [href]="i18n.otherLocaleHref()" [attr.hreflang]="i18n.other()">{{ c.switchLanguage }}</a>
      </section>

      <section class="settings-group">
        <h2>{{ c.more }}</h2>
        <ul class="settings-links">
          @for (guide of guides; track guide) {
            <li>
              <a [routerLink]="i18n.link(guide)">{{ c[guide] }}</a>
            </li>
          }
          <li>
            <a [routerLink]="i18n.link('privacy')">{{ c.privacy }}</a>
          </li>
          <li>
            <a href="https://discord.gg/DPYydhZRND" target="_blank" rel="noopener">{{
              c.discord
            }}</a>
          </li>
        </ul>
      </section>
    </article>
  `,
})
export default class SettingsPage {
  protected readonly i18n = inject(I18nService);
  protected readonly prefs = inject(DisplayPrefsService);
  protected readonly wakeLock = inject(WakeLockService);
  private readonly seo = inject(SeoService);
  private readonly injector = inject(EnvironmentInjector);
  private readonly locale =
    (inject(ActivatedRoute).snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;

  protected readonly c = COPY[this.locale];
  protected readonly guides = GUIDES;
  protected readonly textSizeOptions: SegmentedOption[] = [
    { value: 0, label: 'A' },
    { value: 1, label: 'A+' },
    { value: 2, label: 'A++' },
  ];
  protected readonly textSizeIndex = computed(() => TEXT_SIZES.indexOf(this.prefs.textSize()));

  constructor() {
    this.i18n.setLocale(this.locale);
    this.seo.apply({
      title: this.c.title,
      description: this.c.description,
      path: ROUTE_PATHS.settings,
      locale: this.locale,
      noIndex: true,
    });
  }

  protected setDim(value: boolean): void {
    this.prefs.setDim(value);
    this.track('dim', value ? 'on' : 'off');
  }

  protected setTextSize(index: number): void {
    const value = TEXT_SIZES[index] ?? 'base';
    this.prefs.setTextSize(value);
    this.track('text_size', value);
  }

  private track(pref: string, value: string): void {
    void import('../../core/analytics/analytics.service').then(({ AnalyticsService }) =>
      this.injector.get(AnalyticsService).track('reading_pref_changed', { pref, value }),
    );
  }
}

import {
  Component,
  EnvironmentInjector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale } from '../../core/i18n/locale';
import { ROUTE_PATHS } from '../../core/i18n/route-paths';
import {
  DefaultView,
  DisplayPrefsService,
  ReaderTextSize,
} from '../../core/platform/display-prefs.service';
import { WakeLockService } from '../../core/platform/wake-lock.service';
import { RavelryAccess } from '../../core/ravelry/ravelry-access';
import { RavelrySession } from '../../core/ravelry/ravelry-session.service';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_NAME } from '../../core/seo/site';
import { Checkbox } from '../../shared/ui/checkbox/checkbox';
import { RavelryConnection } from '../../shared/ui/ravelry-connection/ravelry-connection';
import { CONNECT_COPY } from '../discover/data/connect-copy';
import { Segmented, SegmentedOption } from '../../shared/ui/segmented/segmented';

const TEXT_SIZES: readonly ReaderTextSize[] = ['base', 'lg', 'xl'];
const DEFAULT_VIEWS: readonly DefaultView[] = ['ask', 'text', 'chart'];

const COPY = {
  fr: {
    title: `Réglages — ${SITE_NAME}`,
    description: 'Fond sombre, écran allumé, langue et taille du texte.',
    h1: 'Réglages',
    display: 'Affichage',
    dim: 'Fond sombre',
    wake: 'Garder l’écran allumé',
    textSize: 'Taille du texte',
    defaultView: 'À l’ouverture d’un patron',
    viewAsk: 'Me demander',
    viewText: 'Texte',
    viewChart: 'Diagramme',
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
    defaultView: 'When a pattern opens',
    viewAsk: 'Ask me',
    viewText: 'Text',
    viewChart: 'Chart',
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
  imports: [Checkbox, RavelryConnection, RouterLink, Segmented],
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
        <p class="settings-label" id="settings-text-size-label">{{ c.textSize }}</p>
        <fil-segmented
          name="settings-text-size"
          labelledBy="settings-text-size-label"
          [options]="textSizeOptions"
          [selected]="textSizeIndex()"
          (selectedChange)="setTextSize($event)"
        />
        <p class="settings-label" id="settings-default-view-label">{{ c.defaultView }}</p>
        <fil-segmented
          name="settings-default-view"
          labelledBy="settings-default-view-label"
          [options]="viewOptions"
          [selected]="viewIndex()"
          (selectedChange)="setDefaultView($event)"
        />
      </section>

      @if (ravelryOn) {
        <section class="settings-group" aria-labelledby="settings-ravelry">
          <h2 id="settings-ravelry">{{ cc.settingsTitle }}</h2>
          <p>{{ cc.settingsIntro }}</p>
          @if (session.loaded()) {
            <fil-ravelry-connection
              [connected]="session.connected()"
              [busy]="busy()"
              [connectLabel]="cc.connect"
              [busyLabel]="cc.connecting"
              [connectedLabel]="cc.connected"
              [disconnectLabel]="cc.disconnect"
              [message]="ravelryMessage()"
              (connect)="connectRavelry()"
              (disconnect)="session.disconnect()"
            />
          }
        </section>
      }

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
  protected readonly cc = CONNECT_COPY[this.locale];
  /** La section Ravelry n'existe que si l'interrupteur de la recherche est allumé (ADR-004). */
  protected readonly ravelryOn = inject(RavelryAccess).enabled;
  protected readonly session = inject(RavelrySession);
  private readonly router = inject(Router);
  protected readonly busy = signal(false);
  protected readonly ravelryMessage = computed(() =>
    this.session.connected()
      ? ''
      : this.session.expired()
        ? this.cc.expired
        : this.session.farewell()
          ? this.cc.disconnected
          : '',
  );
  protected readonly guides = GUIDES;
  protected readonly textSizeOptions: SegmentedOption[] = [
    { value: 0, label: 'A' },
    { value: 1, label: 'A+' },
    { value: 2, label: 'A++' },
  ];
  protected readonly textSizeIndex = computed(() => TEXT_SIZES.indexOf(this.prefs.textSize()));
  protected readonly viewOptions: SegmentedOption[] = [
    { value: 0, label: this.c.viewAsk },
    { value: 1, label: this.c.viewText },
    { value: 2, label: this.c.viewChart },
  ];
  protected readonly viewIndex = computed(() => DEFAULT_VIEWS.indexOf(this.prefs.defaultView()));

  constructor() {
    this.i18n.setLocale(this.locale);
    this.seo.apply({
      title: this.c.title,
      description: this.c.description,
      path: ROUTE_PATHS.settings,
      locale: this.locale,
      noIndex: true,
    });
    afterNextRender(() => {
      if (this.ravelryOn) void this.session.load();
    });
  }

  protected async connectRavelry(): Promise<void> {
    this.busy.set(true);
    if (!(await this.session.begin(this.router.url))) this.busy.set(false);
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

  protected setDefaultView(index: number): void {
    const value = DEFAULT_VIEWS[index] ?? 'ask';
    this.prefs.setDefaultView(value);
    this.track('default_view', value);
  }

  private track(pref: string, value: string): void {
    void import('../../core/analytics/analytics.service').then(({ AnalyticsService }) =>
      this.injector.get(AnalyticsService).track('reading_pref_changed', { pref, value }),
    );
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../core/i18n/locale';
import { SeoService } from '../../core/seo/seo.service';
import { CRUMBS, breadcrumbList, glossaryCrumb, homeCrumb } from '../../core/seo/breadcrumbs';
import { SITE_NAME, SITE_ORIGIN } from '../../core/seo/site';
import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { ROUTE_PATHS } from '../../core/i18n/route-paths';
import { GLOSSARY, GlossaryEntry, pageEntryOf } from '../reader/data/glossary';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { Button } from '../../shared/ui/button/button';
import { InputField } from '../../shared/ui/field/input';
import { Segmented, SegmentedOption } from '../../shared/ui/segmented/segmented';
import { CraftFilter, LangFilter, groupGlossary, letterAnchor } from './data/glossary-groups';

const CRAFTS: readonly CraftFilter[] = ['all', 'crochet', 'tricot'];
const LANGS: readonly LangFilter[] = ['all', 'en', 'fr'];

const COPY: Record<Locale, Record<string, string>> = {
  fr: {
    title: `Abréviations de crochet et de tricot — ${SITE_NAME}`,
    description:
      'ms, sc, aug, dim, k2tog, cercle magique… la traduction en clair des abréviations de patrons de crochet et de tricot, en français et en anglais, US et UK.',
    h1: 'Abréviations de crochet et de tricot',
    lead: 'Les patrons abrègent tout. Voici ce que chaque sigle veut dire, en français et en anglais. Dans le lecteur, ces termes sont soulignés et leur définition apparaît au survol.',
    search: 'Filtrer les abréviations',
    term: 'Abréviation',
    fr: 'Français',
    en: 'Anglais',
    craft: 'Technique',
    crochet: 'crochet',
    tricot: 'tricot',
    commun: 'crochet et tricot',
    craftFilter: 'Technique',
    allCrafts: 'Tout',
    langFilter: 'Langue du patron',
    allLangs: 'Toutes',
    langEn: 'Anglais',
    langFr: 'Français',
    letters: 'Aller à la lettre',
    empty: 'Aucun terme ne correspond.',
    clear: 'Effacer les filtres',
  },
  en: {
    title: `Crochet and knitting abbreviations — ${SITE_NAME}`,
    description:
      'sc, dc, inc, dec, k2tog, magic ring… what every crochet and knitting pattern abbreviation means, in English and French, with US and UK notation side by side.',
    h1: 'Crochet and knitting abbreviations',
    lead: 'Patterns abbreviate everything. Here is what each one means, in English and French. In the reader these terms are underlined and their definition appears on hover.',
    search: 'Filter abbreviations',
    term: 'Abbreviation',
    fr: 'French',
    en: 'English',
    craft: 'Craft',
    crochet: 'crochet',
    tricot: 'knitting',
    commun: 'crochet and knitting',
    craftFilter: 'Craft',
    allCrafts: 'All',
    langFilter: 'Pattern language',
    allLangs: 'All',
    langEn: 'English',
    langFr: 'French',
    letters: 'Jump to letter',
    empty: 'No term matches.',
    clear: 'Clear filters',
  },
};

/**
 * Page glossaire. Deuxième rôle, aussi important que le premier : c'est la page
 * que les moteurs de recherche indexent le mieux (« ms crochet signification »),
 * donc son contenu est entièrement pré-rendu, sans dépendre du JavaScript.
 */
@Component({
  selector: 'fil-glossary-page',
  imports: [Breadcrumb, Button, InputField, RouterLink, Segmented],
  host: { class: 'wrap' },
  template: `
    <section class="hero">
      <fil-breadcrumb [items]="crumbs" [label]="crumbLabel" />
      <h1>{{ c['h1'] }}</h1>
      <p>{{ c['lead'] }}</p>
    </section>

    <div class="field glossary-filter">
      <label for="glossary-filter">{{ c['search'] }}</label>
      <input
        filInput
        id="glossary-filter"
        type="search"
        [value]="query()"
        (input)="query.set($any($event.target).value)"
      />
    </div>

    <div class="glossary-filters">
      <div class="glossary-filter-group">
        <span class="glossary-filter-label">{{ c['craftFilter'] }}</span>
        <fil-segmented
          name="glossary-craft"
          [label]="c['craftFilter']"
          [options]="craftOptions"
          [selected]="craftIndex()"
          (selectedChange)="setCraft($event)"
        />
      </div>
      <div class="glossary-filter-group">
        <span class="glossary-filter-label">{{ c['langFilter'] }}</span>
        <fil-segmented
          name="glossary-lang"
          [label]="c['langFilter']"
          [options]="langOptions"
          [selected]="langIndex()"
          (selectedChange)="setLang($event)"
        />
      </div>
    </div>

    @if (groups().length) {
      <nav class="glossary-letters" [attr.aria-label]="c['letters']">
        @for (group of groups(); track group.letter) {
          <a [routerLink]="[]" [fragment]="anchorOf(group.letter)">{{ group.letter }}</a>
        }
      </nav>

      <div class="glossary-table-scroll">
        <table class="table glossary-list">
          <caption class="visually-hidden">
            {{
              c['h1']
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ c['term'] }}</th>
              <th scope="col">{{ c['fr'] }}</th>
              <th scope="col">{{ c['en'] }}</th>
              <th scope="col">{{ c['craft'] }}</th>
            </tr>
          </thead>
          @for (group of groups(); track group.letter) {
            <tbody>
              <tr>
                <th
                  scope="rowgroup"
                  colspan="4"
                  class="glossary-letter"
                  [id]="anchorOf(group.letter)"
                >
                  {{ group.letter }}
                </th>
              </tr>
              @for (entry of group.entries; track entry.term) {
                <tr>
                  <th scope="row">
                    <a [routerLink]="hrefOf(entry)"
                      ><code>{{ entry.term }}</code></a
                    >
                    @if (entry.region) {
                      <span class="tag">{{ entry.region }}</span>
                    }
                  </th>
                  <td [attr.data-label]="c['fr']">{{ entry.fr }}</td>
                  <td [attr.data-label]="c['en']">{{ entry.en }}</td>
                  <td class="text-muted" [attr.data-label]="c['craft']">{{ c[entry.craft] }}</td>
                </tr>
              }
            </tbody>
          }
        </table>
      </div>
    } @else {
      <p class="glossary-empty" role="status">
        {{ c['empty'] }}
        <button filButton="ghost" type="button" (click)="clearFilters()">{{ c['clear'] }}</button>
      </p>
    }
  `,
})
export default class GlossaryPage {
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = COPY[this.locale];
  protected readonly query = signal('');

  private readonly analytics = inject(AnalyticsService);
  protected readonly craft = signal<CraftFilter>('all');
  protected readonly lang = signal<LangFilter>('all');
  protected readonly craftIndex = computed(() => CRAFTS.indexOf(this.craft()));
  protected readonly langIndex = computed(() => LANGS.indexOf(this.lang()));

  protected readonly craftOptions: readonly SegmentedOption[] = [
    { value: 0, label: this.c['allCrafts'] },
    { value: 1, label: this.c['crochet'] },
    { value: 2, label: this.c['tricot'] },
  ];
  protected readonly langOptions: readonly SegmentedOption[] = [
    { value: 0, label: this.c['allLangs'] },
    { value: 1, label: this.c['langEn'] },
    { value: 2, label: this.c['langFr'] },
  ];

  /** Tri et regroupement dans un `computed` : le rendu ne fait que parcourir. */
  protected readonly groups = computed(() =>
    groupGlossary(GLOSSARY, { craft: this.craft(), lang: this.lang(), query: this.query() }),
  );

  protected setCraft(index: number): void {
    this.craft.set(CRAFTS[index] ?? 'all');
    this.trackFilters();
  }

  protected setLang(index: number): void {
    this.lang.set(LANGS[index] ?? 'all');
    this.trackFilters();
  }

  protected clearFilters(): void {
    this.craft.set('all');
    this.lang.set('all');
    this.query.set('');
  }

  private trackFilters(): void {
    this.analytics.track('glossary_filtered', { craft: this.craft(), lang: this.lang() });
  }

  protected anchorOf(letter: string): string {
    return letterAnchor(letter);
  }

  /**
   * Chaque abréviation mène à sa page : le tableau est aussi leur porte
   * d'entrée. Une graphie sans page propre (`slst`) mène à celle qui la sert.
   */
  protected hrefOf(entry: GlossaryEntry): string {
    const slug = pageEntryOf(entry, this.locale).slug;
    return `${localePrefix(this.locale)}${ROUTE_PATHS.glossary[this.locale]}/${slug}`;
  }

  protected readonly crumbLabel = CRUMBS[this.locale].label;
  protected readonly crumbs = [homeCrumb(this.locale), glossaryCrumb(this.locale)];

  constructor() {
    this.i18n.setLocale(this.locale);
    this.seo.apply({
      title: this.c['title'],
      description: this.c['description'],
      path: ROUTE_PATHS.glossary,
      locale: this.locale,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'DefinedTermSet',
            '@id': `${this.origin}${localePrefix(this.locale)}${ROUTE_PATHS.glossary[this.locale]}`,
            name: this.c['h1'],
            inLanguage: this.locale,
            hasDefinedTerm: GLOSSARY.map((entry) => ({
              '@type': 'DefinedTerm',
              name: entry.term,
              description: this.locale === 'fr' ? entry.fr : entry.en,
              url: `${this.origin}${this.hrefOf(entry)}`,
            })),
          },
          breadcrumbList(this.origin, this.crumbs),
        ],
      },
    });
  }
}

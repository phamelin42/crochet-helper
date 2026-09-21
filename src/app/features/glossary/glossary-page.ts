import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../core/i18n/locale';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_NAME, SITE_ORIGIN } from '../../core/seo/site';
import { ROUTE_PATHS } from '../../core/i18n/route-paths';
import { GLOSSARY, GlossaryEntry } from '../reader/data/glossary';
import { InputField } from '../../shared/ui/field/input';

const COPY: Record<Locale, Record<string, string>> = {
  fr: {
    title: `Abréviations de crochet et de tricot — ${SITE_NAME}`,
    description:
      'ms, sc, aug, dim, k2tog, cercle magique… la traduction en clair des abréviations de patrons de crochet et de tricot, en français et en anglais.',
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
  },
  en: {
    title: `Crochet and knitting abbreviations — ${SITE_NAME}`,
    description:
      'sc, dc, inc, dec, k2tog, magic ring… what every crochet and knitting pattern abbreviation means, in English and French.',
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
  },
};

/**
 * Page glossaire. Deuxième rôle, aussi important que le premier : c'est la page
 * que les moteurs de recherche indexent le mieux (« ms crochet signification »),
 * donc son contenu est entièrement pré-rendu, sans dépendre du JavaScript.
 */
@Component({
  selector: 'fil-glossary-page',
  imports: [InputField, RouterLink],
  host: { class: 'wrap' },
  template: `
    <section class="hero">
      <h1>{{ c['h1'] }}</h1>
      <p>{{ c['lead'] }}</p>
    </section>

    <div class="field" style="max-width:320px">
      <label for="glossary-filter">{{ c['search'] }}</label>
      <input
        filInput
        id="glossary-filter"
        type="search"
        [value]="query()"
        (input)="query.set($any($event.target).value)"
      />
    </div>

    <table class="table" style="margin-top:var(--space-6)">
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
      <tbody>
        @for (entry of filtered(); track entry.term) {
          <tr>
            <th scope="row">
              <a [routerLink]="hrefOf(entry)"
                ><code>{{ entry.term }}</code></a
              >
            </th>
            <td>{{ entry.fr }}</td>
            <td>{{ entry.en }}</td>
            <td class="text-muted">{{ c[entry.craft] }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class GlossaryPage {
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = COPY[this.locale];
  protected readonly query = signal('');

  protected readonly filtered = computed(() => {
    const needle = this.query().trim().toLowerCase();
    if (!needle) return GLOSSARY;
    return GLOSSARY.filter(
      (entry) =>
        entry.term.toLowerCase().includes(needle) ||
        entry.fr.toLowerCase().includes(needle) ||
        entry.en.toLowerCase().includes(needle),
    );
  });

  /** Chaque abréviation a sa page : le tableau est aussi leur porte d'entrée. */
  protected hrefOf(entry: GlossaryEntry): string {
    return `${localePrefix(this.locale)}${ROUTE_PATHS.glossary[this.locale]}/${entry.slug}`;
  }

  constructor() {
    this.i18n.setLocale(this.locale);
    this.seo.apply({
      title: this.c['title'],
      description: this.c['description'],
      path: ROUTE_PATHS.glossary,
      locale: this.locale,
      jsonLd: {
        '@context': 'https://schema.org',
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
    });
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { Locale } from '../../core/i18n/locale';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_NAME } from '../../core/seo/site';
import { ROUTE_PATHS } from '../../core/i18n/route-paths';
import { GLOSSARY } from '../reader/data/glossary';
import { InputField } from '../../shared/ui/field/input';

const COPY: Record<Locale, Record<string, string>> = {
  fr: {
    title: `Glossaire des abréviations de crochet et de tricot — ${SITE_NAME}`,
    description:
      'ms, sc, aug, dim, k2tog, cercle magique… la traduction en clair des abréviations de patrons de crochet et de tricot, en français et en anglais.',
    h1: 'Abréviations de crochet et de tricot',
    lead: 'Les patrons abrègent tout. Voici ce que chaque sigle veut dire, en français et en anglais. Dans le lecteur, ces termes sont soulignés et leur définition apparaît au survol.',
    search: 'Filtrer les abréviations',
    term: 'Abréviation',
    fr: 'Français',
    en: 'Anglais',
    craft: 'Technique',
  },
  en: {
    title: `Crochet and knitting abbreviations glossary — ${SITE_NAME}`,
    description:
      'sc, dc, inc, dec, k2tog, magic ring… what each crochet and knitting pattern abbreviation means, in English and French.',
    h1: 'Crochet and knitting abbreviations',
    lead: 'Patterns abbreviate everything. Here is what each one means, in English and French. In the reader these terms are underlined and their definition appears on hover.',
    search: 'Filter abbreviations',
    term: 'Abbreviation',
    fr: 'French',
    en: 'English',
    craft: 'Craft',
  },
};

/**
 * Page glossaire. Deuxième rôle, aussi important que le premier : c'est la page
 * que les moteurs de recherche indexent le mieux (« ms crochet signification »),
 * donc son contenu est entièrement pré-rendu, sans dépendre du JavaScript.
 */
@Component({
  selector: 'fil-glossary-page',
  imports: [InputField],
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
              <code>{{ entry.term }}</code>
            </th>
            <td>{{ entry.fr }}</td>
            <td>{{ entry.en }}</td>
            <td class="text-muted">{{ entry.craft }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class GlossaryPage {
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? 'fr';
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
        name: this.c['h1'],
        inLanguage: this.locale,
        hasDefinedTerm: GLOSSARY.map((entry) => ({
          '@type': 'DefinedTerm',
          name: entry.term,
          description: this.locale === 'fr' ? entry.fr : entry.en,
        })),
      },
    });
  }
}

import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../core/i18n/locale';
import { ROUTE_PATHS } from '../../core/i18n/route-paths';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_NAME, SITE_ORIGIN } from '../../core/seo/site';
import { Button } from '../../shared/ui/button/button';
import { InputField } from '../../shared/ui/field/input';
import { Segmented, SegmentedOption } from '../../shared/ui/segmented/segmented';
import { ConversionResult, Region, convertTerms } from './data/convert-terms';
import { HOOK_SIZES, annotateHookSizes } from './data/hook-sizes';

const NBSP = ' ';

interface ConverterCopy {
  readonly title: string;
  readonly description: string;
  readonly h1: string;
  readonly lead: string;
  readonly directionLabel: string;
  readonly usToUk: string;
  readonly ukToUs: string;
  readonly inputLabel: string;
  readonly convert: string;
  readonly resultTitle: string;
  readonly resultEmpty: string;
  replacementsTitle(count: number): string;
  readonly noReplacement: string;
  /** Termes de l'autre convention trouvés dans le patron : la convention choisie est sans doute fausse. */
  unmatchedTitle(from: Region): string;
  directionOf(from: Region, to: Region): string;
  readonly backToReader: string;
  readonly backToGlossary: string;
  readonly hookSizesTitle: string;
  readonly hookSizesLead: string;
  readonly hookSizesMm: string;
  readonly hookSizesUs: string;
}

const COPY: Record<Locale, ConverterCopy> = {
  fr: {
    title: `Convertisseur US ↔ UK et tailles de crochet — ${SITE_NAME}`,
    description:
      'Convertissez un patron de crochet entier de la notation américaine à la britannique, ou inversement. sc, dc, hdc, tr, dtr, htr : les mêmes lettres désignent des mailles différentes selon la convention. Avec le tableau des tailles de crochet mm ↔ US.',
    h1: 'Convertisseur d’abréviations US ↔ UK',
    lead: '« dc » désigne une bride aux États-Unis et une maille serrée au Royaume-Uni : se tromper de convention ruine un ouvrage. Collez un patron entier, choisissez le sens, et vérifiez chaque remplacement avant de crocheter.',
    directionLabel: 'Sens de la conversion',
    usToUk: 'Américain → britannique',
    ukToUs: 'Britannique → américain',
    inputLabel: 'Votre patron',
    convert: 'Convertir',
    resultTitle: 'Résultat',
    resultEmpty: 'Le texte converti apparaîtra ici, avec la liste de chaque remplacement.',
    replacementsTitle: (n) => (n > 1 ? `${n} remplacements effectués` : '1 remplacement effectué'),
    noReplacement: 'Aucune abréviation à convertir dans ce texte.',
    unmatchedTitle: (from) =>
      `Termes laissés tels quels : ils n’appartiennent pas à la notation ${from === 'US' ? 'américaine' : 'britannique'}. Vérifiez la convention du patron.`,
    directionOf: (from, to) => `Notation ${from} convertie en notation ${to}.`,
    backToReader: 'Lire tout un patron pas à pas',
    backToGlossary: 'Toutes les abréviations',
    hookSizesTitle: 'Tailles de crochet mm ↔ US',
    hookSizesLead: `Un patron américain donne la taille du crochet par une lettre («${NBSP}G-6 hook${NBSP}») plutôt qu’en millimètres. Dans le texte converti, chaque taille reconnue reçoit son équivalent entre parenthèses${NBSP}; voici le tableau complet.`,
    hookSizesMm: 'Diamètre (mm)',
    hookSizesUs: 'Taille US',
  },
  en: {
    title: `US ↔ UK crochet converter and hook sizes — ${SITE_NAME}`,
    description:
      'Convert a whole crochet pattern from US to UK notation, or the other way round. sc, dc, hdc, tr, dtr, htr: the same letters mean different stitches depending on the convention. With the mm ↔ US crochet hook size chart.',
    h1: 'US ↔ UK abbreviation converter',
    lead: '"dc" means double crochet in the US and single crochet in the UK: mixing up the convention ruins a piece. Paste a whole pattern, pick the direction, and check every replacement before you hook.',
    directionLabel: 'Conversion direction',
    usToUk: 'US → UK',
    ukToUs: 'UK → US',
    inputLabel: 'Your pattern',
    convert: 'Convert',
    resultTitle: 'Result',
    resultEmpty: 'The converted text will appear here, with every replacement listed.',
    replacementsTitle: (n) => (n > 1 ? `${n} replacements made` : '1 replacement made'),
    noReplacement: 'No abbreviation to convert in this text.',
    unmatchedTitle: (from) =>
      `Left as they are: these terms are not ${from} notation. Check which convention the pattern uses.`,
    directionOf: (from, to) => `${from} notation converted to ${to} notation.`,
    backToReader: 'Read a whole pattern step by step',
    backToGlossary: 'All abbreviations',
    hookSizesTitle: 'Crochet hook sizes mm ↔ US',
    hookSizesLead:
      'A US pattern gives the hook size as a letter ("G-6 hook") rather than in millimetres. In the converted text, every recognised size gets its equivalent in brackets; here is the full chart.',
    hookSizesMm: 'Diameter (mm)',
    hookSizesUs: 'US size',
  },
};

/**
 * Convertisseur d'abréviations US ↔ UK.
 *
 * Requête transactionnelle et fréquente : la donnée existe déjà dans le
 * glossaire, il ne manquait que la correspondance entre les deux conventions
 * (`data/convert-terms.ts`). Le résultat liste chaque remplacement fait plutôt
 * que de ne montrer que le texte final, pour que la lectrice puisse vérifier
 * avant de crocheter.
 */
@Component({
  selector: 'fil-converter-page',
  imports: [Button, InputField, RouterLink, Segmented],
  host: { class: 'wrap' },
  template: `
    <section class="hero">
      <h1>{{ c.h1 }}</h1>
      <p>{{ c.lead }}</p>
    </section>

    <section class="stack">
      <fil-segmented
        name="converter-direction"
        [label]="c.directionLabel"
        [options]="directionOptions"
        [(selected)]="direction"
      />

      <div class="field">
        <label for="converter-input">{{ c.inputLabel }}</label>
        <textarea
          filInput
          id="converter-input"
          rows="10"
          spellcheck="false"
          [value]="source()"
          (input)="source.set($any($event.target).value)"
        ></textarea>
      </div>

      <button type="button" filButton="primary" (click)="convert()">{{ c.convert }}</button>
    </section>

    <section class="card" aria-live="polite">
      <h2 class="card-title">{{ c.resultTitle }}</h2>
      @if (result(); as r) {
        <p class="card-body">{{ c.directionOf(r.from, r.to) }}</p>
        <div class="prompt-box">
          <pre tabindex="0">{{ r.text }}</pre>
        </div>

        @if (r.replacements.length) {
          <h3 class="card-body">{{ c.replacementsTitle(r.replacements.length) }}</h3>
          <ul class="term-links">
            @for (item of r.replacements; track $index) {
              <li>
                <code>{{ item.term }}</code> → <code>{{ item.replacement }}</code>
              </li>
            }
          </ul>
        } @else {
          <p class="card-body">{{ c.noReplacement }}</p>
        }

        @if (r.unmatched.length) {
          <h3 class="card-body">{{ c.unmatchedTitle(r.from) }}</h3>
          <ul class="term-links">
            @for (term of r.unmatched; track term) {
              <li>
                <code>{{ term }}</code>
              </li>
            }
          </ul>
        }
      } @else {
        <p class="card-body">{{ c.resultEmpty }}</p>
      }
    </section>

    <section class="stack">
      <h2>{{ c.hookSizesTitle }}</h2>
      <p>{{ c.hookSizesLead }}</p>
      <div class="glossary-table-scroll">
        <table class="table">
          <caption class="visually-hidden">
            {{
              c.hookSizesTitle
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ c.hookSizesMm }}</th>
              <th scope="col">{{ c.hookSizesUs }}</th>
            </tr>
          </thead>
          <tbody>
            @for (size of hookSizes; track size.us) {
              <tr>
                <td>{{ size.mm }} mm</td>
                <td>
                  <code>{{ size.us }}</code>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    <div class="navrow">
      <a filButton="primary" [routerLink]="i18n.link('reader')">{{ c.backToReader }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('glossary')">{{ c.backToGlossary }}</a>
    </div>
  `,
})
export class ConverterPage {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly analytics = inject(AnalyticsService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = COPY[this.locale];

  protected readonly directionOptions: readonly SegmentedOption[] = [
    { value: 0, label: this.c.usToUk },
    { value: 1, label: this.c.ukToUs },
  ];

  protected readonly direction = signal(0);
  protected readonly source = signal('');
  protected readonly hookSizes = HOOK_SIZES;

  /**
   * Dernière conversion demandée. Le résultat ne suit pas la frappe : il
   * correspond toujours au texte et au sens validés par le bouton, et la mesure
   * `conversion_run` compte donc des conversions, pas des touches.
   */
  protected readonly result = signal<(ConversionResult & { from: Region; to: Region }) | undefined>(
    undefined,
  );

  constructor() {
    this.i18n.setLocale(this.locale);
    const path = ROUTE_PATHS.converter;
    this.seo.apply({
      title: this.c.title,
      description: this.c.description,
      path,
      locale: this.locale,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        '@id': `${this.origin}${localePrefix(this.locale)}${path[this.locale]}`,
        name: this.c.h1,
        description: this.c.description,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any',
        inLanguage: this.locale,
      },
    });
  }

  protected convert(): void {
    if (!this.source().trim()) return;
    const [from, to]: [Region, Region] = this.direction() === 0 ? ['US', 'UK'] : ['UK', 'US'];
    const terms = convertTerms(this.source(), from, to);
    const hooks = annotateHookSizes(terms.text);
    this.result.set({
      text: hooks.text,
      replacements: [
        ...terms.replacements,
        ...hooks.annotations.map((a) => ({
          term: a.original,
          replacement: `${a.original} (${a.added})`,
        })),
      ],
      unmatched: [...terms.unmatched, ...hooks.unknown],
      from,
      to,
    });
    this.analytics.track('conversion_run', {
      from,
      to,
      replacements: terms.replacements.length,
      hooks: hooks.annotations.length,
    });
  }
}

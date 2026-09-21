import { Component, computed, inject, signal } from '@angular/core';
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
  readonly replacementsTitle: string;
  readonly unmatchedTitle: string;
  readonly backToReader: string;
  readonly backToGlossary: string;
}

const COPY: Record<Locale, ConverterCopy> = {
  fr: {
    title: `Convertisseur US ↔ UK — ${SITE_NAME}`,
    description:
      'Convertissez un patron de crochet entier de la notation américaine à la britannique, ou inversement. sc, dc, hdc, tr, dtr, htr : les mêmes lettres désignent des mailles différentes selon la convention.',
    h1: 'Convertisseur d’abréviations US ↔ UK',
    lead: '« dc » désigne une bride aux États-Unis et une maille serrée au Royaume-Uni : se tromper de convention ruine un ouvrage. Collez un patron entier, choisissez le sens, et vérifiez chaque remplacement avant de crocheter.',
    directionLabel: 'Sens de la conversion',
    usToUk: 'Américain → britannique',
    ukToUs: 'Britannique → américain',
    inputLabel: 'Votre patron',
    convert: 'Convertir',
    resultTitle: 'Résultat',
    resultEmpty: 'Le texte converti apparaît ici.',
    replacementsTitle: 'Remplacements effectués',
    unmatchedTitle: 'Termes reconnus, sans équivalent direct',
    backToReader: 'Lire tout un patron pas à pas',
    backToGlossary: 'Toutes les abréviations',
  },
  en: {
    title: `US ↔ UK crochet converter — ${SITE_NAME}`,
    description:
      'Convert a whole crochet pattern from US to UK notation, or the other way round. sc, dc, hdc, tr, dtr, htr: the same letters mean different stitches depending on the convention.',
    h1: 'US ↔ UK abbreviation converter',
    lead: '"dc" means double crochet in the US and single crochet in the UK: mixing up the convention ruins a piece. Paste a whole pattern, pick the direction, and check every replacement before you hook.',
    directionLabel: 'Conversion direction',
    usToUk: 'US → UK',
    ukToUs: 'UK → US',
    inputLabel: 'Your pattern',
    convert: 'Convert',
    resultTitle: 'Result',
    resultEmpty: 'The converted text appears here.',
    replacementsTitle: 'Replacements made',
    unmatchedTitle: 'Recognised terms with no direct equivalent',
    backToReader: 'Read a whole pattern step by step',
    backToGlossary: 'All abbreviations',
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

    <fil-segmented
      name="converter-direction"
      [label]="c.directionLabel"
      [options]="directionOptions"
      [(selected)]="direction"
    />

    <div class="field" style="margin-top:var(--space-4)">
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

    <section class="card" style="margin-top:var(--space-6)">
      <h2 class="card-title">{{ c.resultTitle }}</h2>
      <div class="prompt-box">
        <pre>{{ result().text || c.resultEmpty }}</pre>
      </div>

      @if (result().replacements.length) {
        <p class="card-body">{{ c.replacementsTitle }}</p>
        <ul class="term-links">
          @for (item of result().replacements; track $index) {
            <li>
              <code>{{ item.term }}</code> → <code>{{ item.replacement }}</code>
            </li>
          }
        </ul>
      }

      @if (result().unmatched.length) {
        <p class="card-body">{{ c.unmatchedTitle }}</p>
        <ul class="term-links">
          @for (term of result().unmatched; track term) {
            <li>
              <code>{{ term }}</code>
            </li>
          }
        </ul>
      }
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

  protected readonly from = computed<Region>(() => (this.direction() === 0 ? 'US' : 'UK'));
  protected readonly to = computed<Region>(() => (this.direction() === 0 ? 'UK' : 'US'));
  protected readonly result = computed<ConversionResult>(() =>
    convertTerms(this.source(), this.from(), this.to()),
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
    this.analytics.track('conversion_run', {
      from: this.from(),
      to: this.to(),
      replacements: this.result().replacements.length,
    });
  }
}

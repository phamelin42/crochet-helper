import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../../core/i18n/locale';
import { LocalizedPath, ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME, SITE_ORIGIN } from '../../../core/seo/site';
import { Button } from '../../../shared/ui/button/button';
import { InputField } from '../../../shared/ui/field/input';
import { TooltipService } from '../../../shared/ui/tooltip/tooltip.service';
import { GLOSSARY, GlossaryEntry, TextSegment, annotate } from '../../reader/data/glossary';

const CRAFT_LABEL: Record<Locale, Record<GlossaryEntry['craft'], string>> = {
  fr: { crochet: 'Crochet', tricot: 'Tricot', commun: 'Crochet et tricot' },
  en: { crochet: 'Crochet', tricot: 'Knitting', commun: 'Crochet and knitting' },
};

const ROW_WORD: Record<Locale, string> = { fr: 'Rang 1', en: 'Row 1' };

const COPY: Record<Locale, Record<string, string>> = {
  fr: {
    kicker: 'Abréviation',
    meansIntro: 'veut dire',
    tryTitle: 'Essayez avec un rang de votre patron',
    tryLead:
      'Collez un rang qui contient cette abréviation : les termes connus du glossaire sont soulignés, leur définition apparaît au survol.',
    tryLabel: 'Un rang de patron',
    neighborsTitle: 'À voir aussi',
    backToReader: 'Ouvrir le lecteur complet',
    backToGlossary: 'Voir toutes les abréviations',
  },
  en: {
    kicker: 'Abbreviation',
    meansIntro: 'means',
    tryTitle: 'Try it with a row from your pattern',
    tryLead:
      'Paste a row that contains this abbreviation: terms known to the glossary are underlined, their definition shows on hover.',
    tryLabel: 'A row from a pattern',
    neighborsTitle: 'See also',
    backToReader: 'Open the full reader',
    backToGlossary: 'See all abbreviations',
  },
};

/** Tête d'une définition, sans la glose qui suit un tiret cadratin. */
function headOf(definition: string): string {
  return definition.split(/\s+—\s+/)[0];
}

/** Autres entrées qui désignent exactement le même point : synonymes de notation. */
function synonymsOf(entry: GlossaryEntry): readonly GlossaryEntry[] {
  return GLOSSARY.filter((e) => e !== entry && e.fr === entry.fr && e.en === entry.en);
}

/**
 * Une page par abréviation : chacune répond à une requête distincte
 * (« what does sc mean », « ms crochet signification ») et embarque un
 * lecteur réduit mais fonctionnel, pour que la page fasse quelque chose et ne
 * se contente pas de définir — sinon elle se fait absorber par les réponses
 * générées des moteurs de recherche, et le clic n'arrive jamais.
 */
@Component({
  selector: 'fil-glossary-term-page',
  imports: [Button, InputField, RouterLink],
  host: { class: 'wrap' },
  template: `
    <section class="hero">
      <p class="card-kicker">{{ c['kicker'] }}</p>
      <h1>
        <code>{{ entry.term }}</code>
      </h1>
      <p>
        <span class="steplabel">{{ craftLabel() }}</span>
      </p>
      <p>
        <strong>{{ c['meansIntro'] }} :</strong>
        {{ entry.fr }} <span class="text-muted">— {{ entry.en }}</span>
      </p>
    </section>

    <section class="card">
      <h2 class="card-title">{{ c['tryTitle'] }}</h2>
      <p class="card-body">{{ c['tryLead'] }}</p>

      <div class="field">
        <label for="mini-reader-input">{{ c['tryLabel'] }}</label>
        <textarea
          filInput
          id="mini-reader-input"
          rows="2"
          [value]="line()"
          (input)="line.set($any($event.target).value)"
        ></textarea>
      </div>

      <p class="step-body mini-output">
        @for (segment of segments(); track $index) {
          @if (segment.definition) {
            <span
              class="abbr"
              tabindex="0"
              role="button"
              [attr.aria-label]="segment.text + ' : ' + segment.definition"
              (pointerenter)="show($event, segment.text, segment.definition)"
              (pointerleave)="tooltips.hide()"
              (focus)="show($event, segment.text, segment.definition)"
              (blur)="tooltips.hide()"
              (click)="show($event, segment.text, segment.definition)"
              >{{ segment.text }}</span
            >
          } @else {
            {{ segment.text }}
          }
        }
      </p>
    </section>

    @if (neighbors().length) {
      <section>
        <h2 class="card-title">{{ c['neighborsTitle'] }}</h2>
        <ul class="neighbors">
          @for (neighbor of neighbors(); track neighbor.slug) {
            <li>
              <a [routerLink]="termHref(neighbor)"
                ><code>{{ neighbor.term }}</code> — {{ neighbor.fr }}</a
              >
            </li>
          }
        </ul>
      </section>
    }

    <div class="navrow">
      <a filButton="secondary" [routerLink]="i18n.link('reader')">{{ c['backToReader'] }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('glossary')">{{ c['backToGlossary'] }}</a>
    </div>
  `,
  styles: `
    .neighbors {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2) var(--space-5);
      list-style: none;
      padding: 0;
      margin: var(--space-3) 0 0;
    }
    .mini-output {
      max-width: none;
      font-size: clamp(19px, 2.4vw, 25px);
    }
  `,
})
export class GlossaryTermPage {
  protected readonly tooltips = inject(TooltipService);
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly entry = GLOSSARY.find(
    (e) => e.term === (this.route.snapshot.data['term'] as string),
  )!;
  protected readonly c = COPY[this.locale];

  protected readonly line = signal(`${ROW_WORD[this.locale]}: 6 ${this.entry.term}, ch 1, rep *`);
  protected readonly segments = computed<TextSegment[]>(() => annotate(this.line(), this.locale));

  protected readonly craftLabel = computed(() => CRAFT_LABEL[this.locale][this.entry.craft]);

  protected readonly neighbors = computed<readonly GlossaryEntry[]>(() => {
    const synonyms = synonymsOf(this.entry);
    if (synonyms.length) return synonyms;
    return GLOSSARY.filter((e) => e !== this.entry && e.craft === this.entry.craft).slice(0, 6);
  });

  constructor() {
    this.i18n.setLocale(this.locale);

    const path: LocalizedPath = {
      fr: `${ROUTE_PATHS.glossary.fr}/${this.entry.slug}`,
      en: `${ROUTE_PATHS.glossary.en}/${this.entry.slug}`,
    };
    const glossaryUrl = `${this.origin}${localePrefix(this.locale)}${ROUTE_PATHS.glossary[this.locale]}`;

    this.seo.apply({
      title: `${this.entry.term} — ${headOf(this.locale === 'fr' ? this.entry.fr : this.entry.en)} — ${SITE_NAME}`,
      description:
        this.locale === 'fr'
          ? `« ${this.entry.term} » veut dire ${this.entry.fr} (${this.entry.en} en anglais). Essayez-le avec un rang de votre patron.`
          : `“${this.entry.term}” means ${this.entry.en} (${this.entry.fr} in French). Try it with a row from your pattern.`,
      path,
      locale: this.locale,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'DefinedTerm',
        name: this.entry.term,
        description: this.locale === 'fr' ? this.entry.fr : this.entry.en,
        inLanguage: this.locale,
        inDefinedTermSet: glossaryUrl,
      },
    });
  }

  protected termHref(entry: GlossaryEntry): string {
    return `${this.i18n.prefix()}${ROUTE_PATHS.glossary[this.locale]}/${entry.slug}`;
  }

  protected show(event: Event, term: string, definition: string): void {
    this.tooltips.showFor(event.target as HTMLElement, term, definition);
  }
}

import { Component, computed, inject, linkedSignal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../../core/i18n/locale';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME, SITE_ORIGIN } from '../../../core/seo/site';
import { Button } from '../../../shared/ui/button/button';
import { InputField } from '../../../shared/ui/field/input';
import { TooltipService } from '../../../shared/ui/tooltip/tooltip.service';
import { regionCrossReferenceOf } from '../../converter/data/convert-terms';
import { GLOSSARY, GlossaryEntry, annotate } from '../../reader/data/glossary';
import { headOf, neighborsOf } from '../data/term-neighbors';

type Craft = GlossaryEntry['craft'];

interface TermCopy {
  /** Question de la page, de part et d'autre de l'abréviation. */
  readonly question: Record<Craft, readonly [string, string]>;
  /** Langue des patrons où l'abréviation apparaît. */
  readonly notation: Record<Locale, string>;
  readonly craft: Record<Craft, string>;
  readonly means: string;
  /** Traduction dans l'autre langue, précédée de ce libellé. */
  readonly otherLanguage: string;
  readonly tryTitle: string;
  readonly tryLead: string;
  readonly tryLabel: string;
  readonly regionTitle: string;
  /** Un patron britannique emploie ces lettres pour une autre maille : laquelle. */
  regionReused(term: string, otherMeaning: string): string;
  /** Cette maille s'écrit autrement en notation britannique : comment. */
  regionEquivalent(otherTerm: string): string;
  readonly synonymsTitle: string;
  readonly relatedTitle: string;
  readonly backToReader: string;
  readonly backToGlossary: string;
  /** Guillemets de la langue, posés autour de l'abréviation dans le titre. */
  readonly quotes: readonly [string, string];
  description(entry: GlossaryEntry): string;
}

const NBSP = ' ';
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const COPY: Record<Locale, TermCopy> = {
  fr: {
    question: {
      crochet: ['Que veut dire ', ` au crochet${NBSP}?`],
      tricot: ['Que veut dire ', ` au tricot${NBSP}?`],
      commun: ['Que veut dire ', ` au crochet et au tricot${NBSP}?`],
    },
    notation: { fr: 'Abréviation française', en: 'Abréviation anglaise' },
    craft: { crochet: 'Crochet', tricot: 'Tricot', commun: 'Crochet et tricot' },
    means: 'veut dire',
    otherLanguage: `En anglais${NBSP}:`,
    tryTitle: 'Essayez avec un rang de votre patron',
    tryLead:
      'Voici un rang qui l’emploie. Remplacez-le par un rang de votre patron : chaque abréviation reconnue est soulignée, et sa traduction apparaît au survol.',
    tryLabel: 'Un rang de patron',
    regionTitle: 'Convention britannique',
    regionReused: (term, otherMeaning) =>
      `Dans un patron britannique, «${NBSP}${term}${NBSP}» désigne ${otherMeaning}.`,
    regionEquivalent: (otherTerm) =>
      `Un patron britannique écrit «${NBSP}${otherTerm}${NBSP}» pour ce point.`,
    synonymsTitle: 'Autres façons de l’écrire',
    relatedTitle: 'À voir aussi',
    backToReader: 'Lire tout un patron pas à pas',
    backToGlossary: 'Toutes les abréviations',
    quotes: [`«${NBSP}`, `${NBSP}»`],
    description: (e) =>
      `«${NBSP}${e.term}${NBSP}» veut dire ${headOf(e.fr)} (${headOf(e.en)} en anglais). Collez un rang de votre patron${NBSP}: chaque abréviation y est traduite en clair.`,
  },
  en: {
    question: {
      crochet: ['What does ', ' mean in crochet?'],
      tricot: ['What does ', ' mean in knitting?'],
      commun: ['What does ', ' mean in crochet and knitting?'],
    },
    notation: { fr: 'French abbreviation', en: 'English abbreviation' },
    craft: { crochet: 'Crochet', tricot: 'Knitting', commun: 'Crochet and knitting' },
    means: 'means',
    otherLanguage: 'In French:',
    tryTitle: 'Try it with a row from your pattern',
    tryLead:
      'Here is a row that uses it. Replace it with a row from your pattern: every abbreviation the reader knows is underlined, and its meaning shows on hover.',
    tryLabel: 'A row from a pattern',
    regionTitle: 'British notation',
    regionReused: (term, otherMeaning) => `In a British pattern, “${term}” means ${otherMeaning}.`,
    regionEquivalent: (otherTerm) => `A British pattern writes “${otherTerm}” for this stitch.`,
    synonymsTitle: 'Other ways to write it',
    relatedTitle: 'See also',
    backToReader: 'Read a whole pattern step by step',
    backToGlossary: 'All abbreviations',
    quotes: ['“', '”'],
    description: (e) =>
      `“${e.term}” means ${headOf(e.en)} (${headOf(e.fr)} in French). Paste a row from your pattern and every abbreviation in it is spelled out.`,
  },
};

/**
 * Titre de l'onglet et du résultat de recherche.
 *
 * Il reprend mot pour mot la question du `<h1>`, `question` étant la seule
 * source des deux : un terme commun aux deux métiers annonçait « in crochet »
 * dans le titre et « in crochet and knitting » dans la page, soit une promesse
 * différente de la réponse sur les trente pages concernées.
 */
export function titleOf(entry: GlossaryEntry, locale: Locale): string {
  const c = COPY[locale];
  const [before, after] = c.question[entry.craft];
  const [open, close] = c.quotes;
  const meaning = capitalize(headOf(entry[locale]));
  return `${before}${open}${entry.term}${close}${after} ${meaning} — ${SITE_NAME}`;
}

/**
 * Une page par abréviation : chacune répond à une requête distincte
 * (« what does sc mean », « ms crochet signification ») et embarque un
 * lecteur réduit mais fonctionnel, pour que la page fasse quelque chose et ne
 * se contente pas de définir — sinon elle se fait absorber par les réponses
 * générées des moteurs de recherche, et le clic n'arrive jamais.
 *
 * Le composant est réutilisé quand on passe d'une abréviation à une autre par
 * un lien de la page : tout ce qui dépend du terme est donc dérivé du
 * paramètre d'URL, jamais lu une seule fois à la construction.
 */
@Component({
  selector: 'fil-glossary-term-page',
  imports: [Button, InputField, RouterLink],
  host: { class: 'wrap' },
  template: `
    <section class="hero">
      <p class="card-kicker">{{ c.notation[entry().lang] }} · {{ c.craft[entry().craft] }}</p>
      <h1>
        {{ question()[0] }}<code>{{ entry().term }}</code
        >{{ question()[1] }}
      </h1>
      <p>
        <code>{{ entry().term }}</code> {{ c.means }} <strong>{{ meaning().head }}</strong
        >{{ meaning().rest }}
      </p>
      <p class="text-muted">{{ c.otherLanguage }} {{ entry()[otherLocale] }}</p>
    </section>

    <section class="card">
      <h2 class="card-title">{{ c.tryTitle }}</h2>
      <p class="card-body">{{ c.tryLead }}</p>

      <div class="field">
        <label for="term-try-input">{{ c.tryLabel }}</label>
        <textarea
          filInput
          id="term-try-input"
          rows="2"
          spellcheck="false"
          [value]="line()"
          (input)="edit($any($event.target).value)"
        ></textarea>
      </div>

      <p class="step-body term-try">
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
            <ng-container>{{ segment.text }}</ng-container>
          }
        }
      </p>
    </section>

    @if (regionRef(); as region) {
      <section class="card">
        <h2 class="card-title">{{ c.regionTitle }}</h2>
        <p class="card-body">{{ regionNote() }}</p>
        <a filButton="ghost" [routerLink]="hrefOf(region.other)"
          ><code>{{ region.other.term }}</code></a
        >
      </section>
    }

    @if (neighbors().synonyms.length) {
      <section class="term-section">
        <h2 class="card-title">{{ c.synonymsTitle }}</h2>
        <ul class="term-links">
          @for (other of neighbors().synonyms; track other.slug) {
            <li>
              <a [routerLink]="hrefOf(other)"
                ><code>{{ other.term }}</code> — {{ c.notation[other.lang] }}</a
              >
            </li>
          }
        </ul>
      </section>
    }

    <section class="term-section">
      <h2 class="card-title">{{ c.relatedTitle }}</h2>
      <ul class="term-links">
        @for (other of neighbors().related; track other.slug) {
          <li>
            <a [routerLink]="hrefOf(other)"
              ><code>{{ other.term }}</code> — {{ headOf(other[locale]) }}</a
            >
          </li>
        }
      </ul>
    </section>

    <div class="navrow">
      <a filButton="primary" [routerLink]="i18n.link('reader')">{{ c.backToReader }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('glossary')">{{ c.backToGlossary }}</a>
    </div>
  `,
})
export class GlossaryTermPage {
  protected readonly tooltips = inject(TooltipService);
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly analytics = inject(AnalyticsService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);

  protected readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly otherLocale: Locale = this.locale === 'fr' ? 'en' : 'fr';
  protected readonly c = COPY[this.locale];
  protected readonly headOf = headOf;

  /** `canMatch` garantit que le slug appartient au glossaire. */
  private readonly slug = toSignal(this.route.paramMap.pipe(map((params) => params.get('slug'))), {
    requireSync: true,
  });
  protected readonly entry = computed(() => GLOSSARY.find((e) => e.slug === this.slug())!);

  protected readonly question = computed(() => this.c.question[this.entry().craft]);
  protected readonly meaning = computed(() => {
    const definition = this.entry()[this.locale];
    const head = headOf(definition);
    // La glose éventuelle suit la tête, séparée d'un tiret cadratin.
    return { head, rest: `${definition.slice(head.length)}.` };
  });
  protected readonly neighbors = computed(() => neighborsOf(this.entry()));

  /**
   * Variante régionale de ce terme, quand `sc`, `dc`, `hdc`, `tr`, `dtr` ou
   * `htr` en a une : la fiche 14 avait laissé ce point de côté faute de
   * données, c'est le champ `region` du glossaire qui les apporte.
   */
  protected readonly regionRef = computed(() => {
    const ref = regionCrossReferenceOf(this.entry().term);
    if (!ref) return undefined;
    const other = GLOSSARY.find((e) => e.term === ref.otherTerm);
    return other ? { reusedInUk: ref.reusedInUk, other } : undefined;
  });
  protected readonly regionNote = computed(() => {
    const ref = this.regionRef();
    if (!ref) return '';
    return ref.reusedInUk
      ? this.c.regionReused(this.entry().term, headOf(ref.other[this.locale]))
      : this.c.regionEquivalent(ref.other.term);
  });

  /** Rang d'essai : l'exemple du terme, remplacé dès que la personne écrit. */
  protected readonly line = linkedSignal(() => this.entry().example);
  protected readonly segments = computed(() => annotate(this.line(), this.locale));
  private triedFor: string | null = null;

  constructor() {
    this.i18n.setLocale(this.locale);
    // Émet de façon synchrone à la construction, donc aussi au pré-rendu.
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(() => this.applySeo());
  }

  protected hrefOf(entry: GlossaryEntry): string {
    return `${localePrefix(this.locale)}${ROUTE_PATHS.glossary[this.locale]}/${entry.slug}`;
  }

  protected edit(value: string): void {
    this.line.set(value);
    if (this.triedFor !== this.entry().slug) {
      this.triedFor = this.entry().slug;
      this.analytics.track('term_tried');
    }
  }

  protected show(event: Event, term: string, definition: string): void {
    this.analytics.track('glossary_hover');
    this.tooltips.showFor(event.target as HTMLElement, term, definition);
  }

  private applySeo(): void {
    const entry = this.entry();
    const path = {
      fr: `${ROUTE_PATHS.glossary.fr}/${entry.slug}`,
      en: `${ROUTE_PATHS.glossary.en}/${entry.slug}`,
    };
    const url = `${this.origin}${localePrefix(this.locale)}${path[this.locale]}`;
    const glossaryUrl = `${this.origin}${localePrefix(this.locale)}${ROUTE_PATHS.glossary[this.locale]}`;

    this.seo.apply({
      title: titleOf(entry, this.locale),
      description: this.c.description(entry),
      path,
      locale: this.locale,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'DefinedTerm',
        '@id': url,
        url,
        name: entry.term,
        description: entry[this.locale],
        inLanguage: this.locale,
        inDefinedTermSet: glossaryUrl,
      },
    });
  }
}

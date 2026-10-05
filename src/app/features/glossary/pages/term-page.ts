import { Component, computed, inject, linkedSignal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../../core/i18n/locale';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { CRUMBS, breadcrumbList, glossaryCrumb, homeCrumb } from '../../../core/seo/breadcrumbs';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME, SITE_ORIGIN } from '../../../core/seo/site';
import { Breadcrumb } from '../../../shared/ui/breadcrumb/breadcrumb';
import { Button } from '../../../shared/ui/button/button';
import { InputField } from '../../../shared/ui/field/input';
import { TooltipService } from '../../../shared/ui/tooltip/tooltip.service';
import { regionCrossReferenceOf } from '../../converter/data/convert-terms';
import {
  GLOSSARY,
  GlossaryEntry,
  annotate,
  pageEntryOf,
  pageSlugsOf,
} from '../../reader/data/glossary';
import { articleOf } from '../data/term-articles';
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
  /** Titres des cinq sections de l'article, dans l'ordre d'affichage. */
  readonly articleTitles: {
    readonly how: string;
    readonly inPattern: string;
    readonly usUk: string;
    readonly mistakes: string;
    readonly tip: string;
  };
  readonly tryTitle: string;
  readonly tryLead: string;
  readonly tryLabel: string;
  readonly regionTitle: string;
  readonly regionConvert: string;
  /** Un patron britannique emploie ces lettres pour une autre maille : laquelle. */
  regionReused(term: string, otherMeaning: string): string;
  /** Cette maille s'écrit autrement en notation britannique : comment. */
  regionEquivalent(otherTerm: string): string;
  /** Terme propre au britannique (`htr`, `trtr`) : comment l'écrit un patron américain. */
  regionUkOnly(term: string, otherTerm: string): string;
  readonly synonymsTitle: string;
  readonly relatedTitle: string;
  readonly faqTitle: string;
  readonly furtherTitle: string;
  /** Guides à proposer : lire un patron dans sa langue, ou dans l'autre. */
  readonly guides: { readonly reading: string; readonly foreign: string };
  readonly backToReader: string;
  readonly backToGlossary: string;
  /** Guillemets de la langue, posés autour de l'abréviation dans le titre. */
  readonly quotes: readonly [string, string];
  /**
   * Libellé posé devant le sens quand l'abréviation vient de l'autre langue :
   * on cherche « blo crochet traduction », pas « blo signification ».
   */
  readonly translation: string;
  /**
   * Descriptions possibles, de la plus complète à la plus courte : la page
   * garde la plus longue qui tient en 160 caractères. `rich` : la page a un
   * article (gestes, rang expliqué, US/UK, erreurs).
   */
  descriptions(entry: GlossaryEntry, rich: boolean): readonly string[];
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
    articleTitles: {
      how: 'Comment faire',
      inPattern: 'Dans un patron',
      usUk: `US ou UK${NBSP}?`,
      mistakes: 'Erreurs fréquentes',
      tip: 'Un conseil',
    },
    tryTitle: 'Essayez avec un rang de votre patron',
    tryLead:
      'Voici un rang qui l’emploie. Remplacez-le par un rang de votre patron : chaque abréviation reconnue est soulignée, et sa traduction apparaît au survol.',
    tryLabel: 'Un rang de patron',
    regionTitle: 'Convention britannique',
    regionConvert: 'Convertir un patron US ↔ UK',
    regionReused: (term, otherMeaning) =>
      `Dans un patron britannique, «${NBSP}${term}${NBSP}» désigne la ${otherMeaning}.`,
    regionEquivalent: (otherTerm) =>
      `Un patron britannique écrit «${NBSP}${otherTerm}${NBSP}» pour ce point.`,
    regionUkOnly: (term, otherTerm) =>
      `«${NBSP}${term}${NBSP}» n’existe qu’en notation britannique. Un patron américain écrit «${NBSP}${otherTerm}${NBSP}» pour ce point.`,
    synonymsTitle: 'Autres façons de l’écrire',
    relatedTitle: 'À voir aussi',
    faqTitle: 'Questions fréquentes',
    furtherTitle: 'Pour aller plus loin',
    guides: {
      reading: 'Guide : lire un patron de crochet ou de tricot',
      foreign: 'Guide : lire un patron anglais en français',
    },
    backToReader: 'Lire tout un patron pas à pas',
    backToGlossary: 'Toutes les abréviations',
    quotes: [`«${NBSP}`, `${NBSP}»`],
    translation: `Traduction${NBSP}:`,
    descriptions: (e, rich) => {
      // Abréviation anglaise lue en français : la page traduit.
      const means =
        e.lang === 'fr'
          ? `«${NBSP}${e.term}${NBSP}» veut dire ${headOf(e.fr)}`
          : `Traduction de «${NBSP}${e.term}${NBSP}» en français${NBSP}: ${headOf(e.fr)}`;
      const both = `${means} (${headOf(e.en)} en anglais)`;
      return rich
        ? [
            `${both}. Le geste, un rang de patron expliqué, les notations US et UK, les erreurs fréquentes et un conseil.`,
            `${both}. Le geste, un rang de patron expliqué, les notations US et UK et les erreurs fréquentes.`,
            `${both}${NBSP}: le geste, un rang de patron expliqué, les notations US et UK.`,
            `${means}${NBSP}: le geste, un rang de patron expliqué, les notations US et UK.`,
          ]
        : [
            `${both}. Collez un rang de votre patron${NBSP}: chaque abréviation y est traduite en clair.`,
            `${means}. Collez un rang de votre patron${NBSP}: chaque abréviation y est traduite.`,
          ];
    },
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
    articleTitles: {
      how: 'How to work it',
      inPattern: 'In a pattern',
      usUk: 'US or UK?',
      mistakes: 'Common mistakes',
      tip: 'A tip',
    },
    tryTitle: 'Try it with a row from your pattern',
    tryLead:
      'Here is a row that uses it. Replace it with a row from your pattern: every abbreviation the reader knows is underlined, and its meaning shows on hover.',
    tryLabel: 'A row from a pattern',
    regionTitle: 'British notation',
    regionConvert: 'Convert a pattern US ↔ UK',
    regionReused: (term, otherMeaning) => `In a British pattern, “${term}” means ${otherMeaning}.`,
    regionEquivalent: (otherTerm) => `A British pattern writes “${otherTerm}” for this stitch.`,
    regionUkOnly: (term, otherTerm) =>
      `“${term}” only exists in British notation. A US pattern writes “${otherTerm}” for this stitch.`,
    synonymsTitle: 'Other ways to write it',
    relatedTitle: 'See also',
    faqTitle: 'Frequently asked questions',
    furtherTitle: 'Go further',
    guides: {
      reading: 'Guide: how to read a crochet or knitting pattern',
      foreign: 'Guide: reading a French pattern in English',
    },
    backToReader: 'Read a whole pattern step by step',
    backToGlossary: 'All abbreviations',
    quotes: ['“', '”'],
    translation: 'Translation:',
    descriptions: (e, rich) => {
      const means =
        e.lang === 'en'
          ? `“${e.term}” means ${headOf(e.en)}`
          : `“${e.term}” in English: ${headOf(e.en)}`;
      const both = `${means} (${headOf(e.fr)} in French)`;
      return rich
        ? [
            `${both}. How it works, a pattern row explained, US and UK notation, common mistakes and a tip.`,
            `${both}. How it works, a pattern row explained, US and UK notation and common mistakes.`,
            `${both}: how it works, a pattern row explained, US and UK notation.`,
            `${means}: how it works, a pattern row explained, US and UK notation.`,
          ]
        : [
            `${both}. Paste a row from your pattern and every abbreviation in it is spelled out.`,
            `${means}. Paste a row from your pattern and every abbreviation is spelled out.`,
          ];
    },
  },
};

/**
 * Titre de l'onglet et du résultat de recherche.
 *
 * Il reprend mot pour mot la question du `<h1>`, `question` étant la seule
 * source des deux : un terme commun aux deux métiers annonçait « in crochet »
 * dans le titre et « in crochet and knitting » dans la page, soit une promesse
 * différente de la réponse sur les trente pages concernées.
 *
 * 60 caractères au plus : le nom du site cède la place d'abord, puis la
 * tournure de la question (« « sk » crochet et tricot — Sauter une maille »),
 * pour garder le sens, ou la traduction d'une abréviation de l'autre langue.
 */
export function titleOf(entry: GlossaryEntry, locale: Locale): string {
  const c = COPY[locale];
  const [before, after] = c.question[entry.craft];
  const [open, close] = c.quotes;
  const question = `${before}${open}${entry.term}${close}${after}`;
  const head = headOf(entry[locale]);
  const meaning = entry.lang === locale ? capitalize(head) : `${c.translation} ${head}`;
  // Forme courte quand la question ne laisse pas la place au sens : le terme,
  // le métier et le sens (ou la traduction) passent avant la tournure.
  const term = `${open}${entry.term}${close}`;
  const craft = c.craft[entry.craft].toLowerCase();
  return fit(
    [
      `${question} ${meaning} — ${SITE_NAME}`,
      `${question} ${meaning}`,
      `${term} ${craft} — ${meaning}`,
      `${term} — ${meaning}`,
      `${question} — ${SITE_NAME}`,
      question,
    ],
    TITLE_MAX,
  );
}

/** Au-delà, les résultats de recherche coupent le titre. */
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 160;

/** La première des formulations qui tient dans `max` caractères, sinon la plus courte. */
function fit(candidates: readonly string[], max: number): string {
  return candidates.find((text) => text.length <= max) ?? candidates[candidates.length - 1];
}

/** Description de la page : la plus complète qui tienne en 160 caractères. */
export function descriptionOf(entry: GlossaryEntry, locale: Locale, rich: boolean): string {
  return fit(COPY[locale].descriptions(entry, rich), DESCRIPTION_MAX);
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
/**
 * Ce que la notation britannique change pour ce terme, quand il appartient au
 * décalage US/UK (`sc`, `hdc`, `dc`, `tr`, `dtr`, `htr`, `trtr`) : la note à
 * afficher en tête de page et l'entrée équivalente à lier. Trois cas :
 * - lettres propres au britannique (`htr`, `trtr`) : leur équivalent américain ;
 * - lettres réutilisées par le britannique (`dc`, `tr`, `dtr`) : la maille
 *   qu'elles y désignent, le piège qui ruine un ouvrage ;
 * - lettres propres à l'américain (`sc`, `hdc`) : leur équivalent britannique.
 */
export function regionNoteOf(
  entry: GlossaryEntry,
  locale: Locale,
): { readonly note: string; readonly other: GlossaryEntry } | undefined {
  const ref = regionCrossReferenceOf(entry.term);
  const other = ref && GLOSSARY.find((e) => e.term === ref.otherTerm);
  if (!ref || !other) return undefined;
  const c = COPY[locale];
  const note =
    entry.region === 'UK'
      ? c.regionUkOnly(entry.term, other.term)
      : ref.reusedInUk
        ? c.regionReused(entry.term, headOf(other[locale]))
        : c.regionEquivalent(other.term);
  return { note, other };
}

@Component({
  selector: 'fil-glossary-term-page',
  imports: [Breadcrumb, Button, InputField, RouterLink],
  host: { class: 'wrap' },
  template: `
    <section class="hero">
      <fil-breadcrumb [items]="crumbs()" [label]="crumbLabel" />
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

    @if (article(); as a) {
      <section class="term-section">
        <h2 class="card-title">{{ c.articleTitles.how }}</h2>
        @for (paragraph of a.how; track $index) {
          <p>{{ paragraph }}</p>
        }
      </section>

      <section class="term-section">
        <h2 class="card-title">{{ c.articleTitles.inPattern }}</h2>
        <p class="step-body term-try">
          @for (segment of exampleSegments(); track $index) {
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
        <p>{{ a.inPattern }}</p>
      </section>

      <section class="term-section">
        <h2 class="card-title">{{ c.articleTitles.usUk }}</h2>
        <p>{{ a.usUk }}</p>
      </section>

      <section class="term-section">
        <h2 class="card-title">{{ c.articleTitles.mistakes }}</h2>
        <ul>
          @for (mistake of a.mistakes; track $index) {
            <li>{{ mistake }}</li>
          }
        </ul>
      </section>

      <section class="term-section">
        <h2 class="card-title">{{ c.articleTitles.tip }}</h2>
        <p>{{ a.tip }}</p>
      </section>

      @if (a.faq?.length) {
        <section class="term-section">
          <h2 class="card-title">{{ c.faqTitle }}</h2>
          @for (item of a.faq; track item.q) {
            <h3>{{ item.q }}</h3>
            <p>{{ item.a }}</p>
          }
        </section>
      }
    }

    @if (regionRef(); as region) {
      <section class="card">
        <h2 class="card-title">{{ c.regionTitle }}</h2>
        <p class="card-body">{{ region.note }}</p>
        <div class="navrow">
          <a filButton="ghost" [routerLink]="hrefOf(region.other)"
            ><code>{{ region.other.term }}</code></a
          >
          <a filButton="ghost" [routerLink]="i18n.link('converter')">{{ c.regionConvert }}</a>
        </div>
      </section>
    }

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

    @if (neighbors().synonyms.length || neighbors().variants.length) {
      <section class="term-section">
        <h2 class="card-title">{{ c.synonymsTitle }}</h2>
        <ul class="term-links">
          @for (other of neighbors().variants; track other.slug) {
            <li class="term-variant">
              <code>{{ other.term }}</code> — {{ c.notation[other.lang] }}
            </li>
          }
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

    <section class="term-section">
      <h2 class="card-title">{{ c.furtherTitle }}</h2>
      <ul class="term-links">
        <li>
          <a [routerLink]="i18n.link(guide().route)">{{ guide().label }}</a>
        </li>
        @if (isRegional()) {
          <li>
            <a [routerLink]="i18n.link('converter')">{{ c.regionConvert }}</a>
          </li>
        }
      </ul>
    </section>

    <div class="navrow">
      <a filButton="primary" [routerLink]="i18n.link('reader')">{{ c.backToReader }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('glossary')" [fragment]="entry().slug">{{
        c.backToGlossary
      }}</a>
    </div>
  `,
})
export default class GlossaryTermPage {
  protected readonly tooltips = inject(TooltipService);
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly analytics = inject(AnalyticsService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly otherLocale: Locale = this.locale === 'fr' ? 'en' : 'fr';
  protected readonly c = COPY[this.locale];
  protected readonly headOf = headOf;

  /** `canMatch` garantit que le slug appartient au glossaire. */
  private readonly slug = toSignal(this.route.paramMap.pipe(map((params) => params.get('slug'))), {
    requireSync: true,
  });
  /**
   * L'entrée que sert la page. Une graphie sans page propre (`slst`) affiche
   * celle qui la sert (`sl st`), le temps que l'URL soit remplacée.
   */
  protected readonly entry = computed(() =>
    pageEntryOf(
      GLOSSARY.find((e) => e.slug === this.slug())!,
      this.locale,
    ),
  );

  protected readonly question = computed(() => this.c.question[this.entry().craft]);
  protected readonly meaning = computed(() => {
    const definition = this.entry()[this.locale];
    const head = headOf(definition);
    // La glose éventuelle suit la tête, séparée d'un tiret cadratin.
    return { head, rest: `${definition.slice(head.length)}.` };
  });
  protected readonly crumbLabel = CRUMBS[this.locale].label;
  protected readonly crumbs = computed(() => [
    homeCrumb(this.locale),
    glossaryCrumb(this.locale),
    { label: this.entry().term, href: this.hrefOf(this.entry()) },
  ]);
  protected readonly neighbors = computed(() => neighborsOf(this.entry(), this.locale));

  /** Variante régionale de ce terme, quand elle existe (voir `regionNoteOf`). */
  protected readonly regionRef = computed(() => regionNoteOf(this.entry(), this.locale));
  /** Terme touché par le décalage US/UK : le convertisseur le concerne. */
  protected readonly isRegional = computed(() => !!this.entry().region || !!this.regionRef());
  /**
   * Le guide utile : une abréviation de l'autre langue (`ms` lue en anglais,
   * `sc` lue en français) mène au guide de lecture d'un patron étranger.
   */
  protected readonly guide = computed(() =>
    this.entry().lang === this.locale
      ? { route: 'guideReadingPattern' as const, label: this.c.guides.reading }
      : { route: 'readForeignPattern' as const, label: this.c.guides.foreign },
  );

  /** Article long, pour les vingt abréviations qui en ont un ; les autres gardent le gabarit. */
  protected readonly article = computed(() => articleOf(this.entry().slug, this.locale));
  /** Le rang d'exemple de l'entrée, avec ses abréviations soulignées comme dans le lecteur. */
  protected readonly exampleSegments = computed(() => annotate(this.entry().example, this.locale));

  /** Rang d'essai : l'exemple du terme, remplacé dès que la personne écrit. */
  protected readonly line = linkedSignal(() => this.entry().example);
  protected readonly segments = computed(() => annotate(this.line(), this.locale));
  private triedFor: string | null = null;

  constructor() {
    this.i18n.setLocale(this.locale);
    // Émet de façon synchrone à la construction, donc aussi au pré-rendu.
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(() => {
      // Navigation dans l'application vers une graphie qui redirige : même
      // destination que la 301 de l'hébergeur, sans garder l'ancienne URL.
      if (this.slug() !== this.entry().slug) {
        void this.router.navigateByUrl(this.hrefOf(this.entry()), { replaceUrl: true });
      }
      this.applySeo();
    });
  }

  /** Lien vers la page qui sert `entry` dans cette langue, jamais vers une redirection. */
  protected hrefOf(entry: GlossaryEntry): string {
    const slug = pageEntryOf(entry, this.locale).slug;
    return `${localePrefix(this.locale)}${ROUTE_PATHS.glossary[this.locale]}/${slug}`;
  }

  protected edit(value: string): void {
    this.line.set(value);
    if (this.triedFor !== this.entry().slug) {
      this.triedFor = this.entry().slug;
      this.analytics.track('term_tried');
    }
  }

  protected show(event: Event, term: string, definition: string): void {
    if (this.tooltips.isStationaryHover(event)) return;
    this.analytics.track('glossary_hover');
    this.tooltips.showFor(event.target as HTMLElement, term, definition);
  }

  private applySeo(): void {
    const entry = this.entry();
    // `magic ring` et `cercle magique` : une page par langue, chacune la
    // traduction de l'autre, sous deux slugs.
    const slugs = pageSlugsOf(entry);
    const path = {
      fr: `${ROUTE_PATHS.glossary.fr}/${slugs.fr}`,
      en: `${ROUTE_PATHS.glossary.en}/${slugs.en}`,
    };
    const url = `${this.origin}${localePrefix(this.locale)}${path[this.locale]}`;
    const faq = this.article()?.faq;
    const glossaryUrl = `${this.origin}${localePrefix(this.locale)}${ROUTE_PATHS.glossary[this.locale]}`;

    this.seo.apply({
      title: titleOf(entry, this.locale),
      description: descriptionOf(entry, this.locale, !!this.article()),
      path,
      locale: this.locale,
      // Une page sans article n'est que le gabarit (définition, rang
      // d'exemple) : trop mince pour l'index, elle reste suivie pour ses
      // liens et sort du sitemap. TODO(2026-10-04) : la réindexer en lui
      // écrivant un article (`data/articles/`), qui lève ce `noIndex` seul.
      noIndex: !this.article(),
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'DefinedTerm',
            '@id': url,
            url,
            name: entry.term,
            description: entry[this.locale],
            inLanguage: this.locale,
            inDefinedTermSet: {
              '@type': 'DefinedTermSet',
              '@id': glossaryUrl,
              name: CRUMBS[this.locale].glossary,
            },
          },
          breadcrumbList(this.origin, this.crumbs()),
          // Seules les questions affichées sur la page (section FAQ de l'article).
          ...(faq?.length
            ? [
                {
                  '@type': 'FAQPage',
                  mainEntity: faq.map((item) => ({
                    '@type': 'Question',
                    name: item.q,
                    acceptedAnswer: { '@type': 'Answer', text: item.a },
                  })),
                },
              ]
            : []),
        ],
      },
    });
  }
}

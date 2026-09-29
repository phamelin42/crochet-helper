import { isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnalyticsService, roundToHundred } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../../core/i18n/locale';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME, SITE_ORIGIN } from '../../../core/seo/site';
import { Button } from '../../../shared/ui/button/button';
import { InputField } from '../../../shared/ui/field/input';
// `data/` est du domaine partagé : import autorisé d'une autre fonctionnalité.
import { abbreviationTable } from '../../reader/data/abbreviation-table';
import { expandAbbreviations } from '../../reader/data/glossary';
import { READER_COPY } from '../../reader/data/reader-copy';

const NBSP = ' ';

/** Même seuil que le bouton « Copier le lien du patron » du lecteur. */
const MAX_LINK_LENGTH = 8000;

interface Section {
  readonly h2: string;
  readonly paragraphs: readonly string[];
  /** Puces après les paragraphes (lecture d'un rang mot à mot). */
  readonly list?: readonly string[];
  /** Le tableau des abréviations s'insère après cette section. */
  readonly table?: true;
}

interface ForeignCopy {
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly h1: string;
  readonly lead: string;
  readonly example: string;
  readonly inputLabel: string;
  readonly outputLabel: string;
  readonly unknownHint: string;
  readonly openInReader: string;
  readonly tableCaption: string;
  readonly colAbbr: string;
  readonly colMeaning: string;
  readonly sections: readonly Section[];
  readonly toConverter: string;
  readonly toGuide: string;
  readonly toGlossary: string;
}

const COPY: Record<Locale, ForeignCopy> = {
  fr: {
    seoTitle: `Lire un patron de crochet anglais en français — ${SITE_NAME}`,
    seoDescription:
      'Traduire les abréviations d’un patron de crochet anglais (sc, dc, inc, sl st…) : collez un rang, lisez-le en clair, ouvrez-le en grand dans le lecteur. Sans inscription.',
    h1: 'Lire un patron de crochet anglais en français',
    lead: `Collez un rang ou un patron anglais${NBSP}: chaque abréviation reconnue s’écrit en toutes lettres, en français, avec le sigle d’origine entre parenthèses. Rien n’est envoyé nulle part, tout se passe dans votre navigateur.`,
    example: 'Row 1: 6 sc in magic ring, inc in each st around (12)',
    inputLabel: 'Collez un rang ou un patron',
    outputLabel: 'Le même texte, abréviations développées',
    unknownHint:
      'Les sigles soulignés en pointillés ne sont pas dans notre glossaire : ils restent tels quels, vérifiez-les dans le patron d’origine.',
    openInReader: 'Ouvrir dans le lecteur',
    tableCaption:
      'Les quinze abréviations anglaises les plus courantes et leur équivalent français',
    colAbbr: 'Abréviation',
    colMeaning: 'En français',
    sections: [
      {
        h2: 'Pourquoi les patrons anglais font peur',
        paragraphs: [
          `Un patron de crochet anglais ne ressemble à rien de ce qu’on apprend en français. Il est écrit en abréviations de deux ou trois lettres, sans un mot de trop${NBSP}: «${NBSP}Rnd 3${NBSP}: *sc in next 2 sts, inc in next st; rep from * around${NBSP}». Pour une débutante, cela ressemble à un code secret. Pour une crocheteuse expérimentée, c’est pourtant la langue la plus courte et la plus régulière qui soit, et une fois les quinze ou vingt abréviations de base acquises, on lit un patron en quelques secondes.`,
          `Trois choses rendent l’exercice piégeux. D’abord les abréviations elles-mêmes, qui ne ressemblent pas aux nôtres${NBSP}: la maille serrée se dit «${NBSP}sc${NBSP}» (single crochet) et non «${NBSP}ms${NBSP}». Ensuite la double convention américaine et britannique, qui donne à un même sigle deux sens différents. Enfin les habitudes d’écriture, comme «${NBSP}ch 2 counts as first dc${NBSP}», qui dit qu’une chaînette de deux mailles en l’air remplace la première bride du rang, au lieu de s’ajouter à elle. Cette page traite les trois.`,
        ],
      },
      {
        h2: 'Les quinze abréviations à connaître',
        paragraphs: [
          `Le tableau ci-dessous reprend les quinze abréviations qu’on rencontre dans presque tous les patrons anglais. Il est généré à partir du glossaire du site, le même que celui des infobulles du lecteur${NBSP}: un équivalent ne peut donc pas différer d’un endroit à l’autre. Les définitions américaines sont marquées «${NBSP}US${NBSP}», les britanniques «${NBSP}UK${NBSP}».`,
        ],
        table: true,
      },
      {
        h2: 'Lire un rang type, mot à mot',
        paragraphs: [
          `Prenons le rang de l’outil ci-dessus${NBSP}: «${NBSP}Row 1: 6 sc in magic ring, inc in each st around (12)${NBSP}». Lu de gauche à droite, il se traduit ainsi${NBSP}:`,
        ],
        list: [
          `«${NBSP}Row 1${NBSP}» : le rang, ou le tour, numéro 1.`,
          `«${NBSP}6 sc in magic ring${NBSP}» : 6 mailles serrées dans un cercle magique.`,
          `«${NBSP}inc in each st around${NBSP}» : une augmentation dans chaque maille, tout le tour. Chaque maille en produit deux, donc 6 mailles deviennent 12.`,
          `«${NBSP}(12)${NBSP}» : le nombre de mailles attendu à la fin du tour. C’est votre contrôle${NBSP}: si vous en avez 11 ou 13, il y a une erreur quelque part.`,
        ],
      },
      {
        h2: 'Les pièges : dc, sk, sp et « rep from * »',
        paragraphs: [
          `Le premier piège est le sigle «${NBSP}dc${NBSP}». Dans un patron américain, il désigne la bride. Dans un patron britannique, il désigne la maille serrée, c’est-à-dire ce que les Américains écrivent «${NBSP}sc${NBSP}». Le sigle «${NBSP}tr${NBSP}» change de la même façon${NBSP}: double bride en américain, bride en britannique. Un patron qui emploie «${NBSP}sc${NBSP}» ou «${NBSP}hdc${NBSP}» est américain${NBSP}; un patron qui emploie «${NBSP}htr${NBSP}» est britannique. Si rien ne l’indique, cherchez la mention «${NBSP}US terms${NBSP}» ou «${NBSP}UK terms${NBSP}» près du début.`,
          `Deux petits mots piègent aussi les débutantes${NBSP}: «${NBSP}sk${NBSP}» (skip) veut dire sauter une maille, et «${NBSP}sp${NBSP}» (space) désigne l’espace laissé par une maille sautée, dans lequel on travaille au rang suivant. Enfin «${NBSP}rep from *${NBSP}» ordonne de recommencer depuis l’astérisque jusqu’à la fin du rang${NBSP}: ce qui se trouve entre l’astérisque et «${NBSP}rep${NBSP}» est le motif à répéter, et le patron précise souvent combien de fois, ou combien de mailles restent à la fin.`,
        ],
      },
      {
        h2: 'Convertir un patron entier',
        paragraphs: [
          `Pour un seul rang, l’outil ci-dessus suffit. Pour un patron entier, ou pour passer d’une convention américaine à une convention britannique sans se tromper de bride, utilisez le convertisseur US ↔ UK${NBSP}: il réécrit les sigles et ajoute l’équivalent des tailles de crochet.`,
        ],
      },
      {
        h2: 'Puis le lire en grand, dans le lecteur',
        paragraphs: [
          `Lire un rang traduit sur un écran, c’est bien${NBSP}; suivre un patron de quarante rangs crochet en main, c’est autre chose. Le bouton «${NBSP}Ouvrir dans le lecteur${NBSP}» envoie votre texte dans le lecteur de ${SITE_NAME}${NBSP}: une seule instruction à la fois, en très grand, avec le compteur de rangs, le compteur de répétitions et le chronomètre. Chaque abréviation reste soulignée${NBSP}: un survol ou un toucher en donne la définition, et l’interrupteur «${NBSP}Abréviations développées${NBSP}» écrit tout en clair, comme ici.`,
        ],
      },
    ],
    toConverter: 'Convertir un patron entier',
    toGuide: 'Le guide pour lire un patron',
    toGlossary: 'Le glossaire complet',
  },
  en: {
    seoTitle: `Reading a French crochet pattern in English — ${SITE_NAME}`,
    seoDescription:
      'Translate the abbreviations of a French crochet pattern (ms, db, ml, aug, dim…): paste a row, read it in plain English, open it in large type in the reader. No sign-up.',
    h1: 'Reading a French crochet pattern in English',
    lead: 'Paste a row or a whole French pattern: every abbreviation we recognise is written out in English, with the original abbreviation in brackets. Nothing is sent anywhere, it all happens in your browser.',
    example: 'Tour 1 : 6 ms dans un cercle magique, 2 aug dans chaque maille',
    inputLabel: 'Paste a row or a pattern',
    outputLabel: 'The same text, abbreviations written out',
    unknownHint:
      'Abbreviations underlined with dashes are not in our glossary: they are left as they are, so check them in the original pattern.',
    openInReader: 'Open in the reader',
    tableCaption: 'French pattern abbreviations and their English equivalent',
    colAbbr: 'Abbreviation',
    colMeaning: 'In English',
    sections: [
      {
        h2: 'Why French patterns look so cryptic',
        paragraphs: [
          'A French crochet pattern is written in short abbreviations, with hardly a full word: "Tour 3 : *2 ms, aug ; répéter de * tout le tour". If you have only ever read English patterns, it looks like a code. It is not: the structure is the same as in English, with a stitch, a number and a repeat, and only the words change. Once you know a handful of them, you can follow a pattern from a French designer, and there are many of them, especially for amigurumi.',
          'Three things make it tricky. First, the abbreviations themselves, which do not look like ours: the single crochet is "ms" (maille serrée), not "sc". Second, the American and British conventions, which give one and the same word two different meanings. Third, the rows and rounds: French patterns speak of "tours" for rounds, and a number in brackets at the end gives the stitch count you should have. This page covers all three.',
        ],
      },
      {
        h2: 'The French abbreviations to know',
        paragraphs: [
          'The table below lists every French abbreviation of our glossary with its English equivalent. It is generated from the same glossary as the reader’s tooltips, so an equivalent cannot differ from one place to another. The English meaning is the American one when the two conventions differ.',
        ],
        table: true,
      },
      {
        h2: 'Reading a typical row, word by word',
        paragraphs: [
          'Take the row in the tool above: "Tour 1 : 6 ms dans un cercle magique, 2 aug dans chaque maille". Read from left to right, it says:',
        ],
        list: [
          '"Tour 1": round number 1. The colon after the number is a French typographic habit, not a sign.',
          '"6 ms dans un cercle magique": 6 single crochets in a magic ring.',
          '"2 aug dans chaque maille": 2 increases in each stitch. French patterns often give the number of increases first, then the stitch they go into.',
        ],
      },
      {
        h2: 'The traps: bride, ml, aug and the two conventions',
        paragraphs: [
          'The main trap is that French stitch names do not map one to one onto British ones. A French "bride" is a stitch worked with one yarn over, which is a double crochet in American terms and a treble in British terms. If you read a French pattern with British habits, your work comes out a stitch too tall or too short. Decide once which convention you follow, and stay with it for the whole pattern.',
          'Two more traps are worth knowing. "ml" (maille en l’air) is a chain, and a French pattern says how many to make before turning, exactly as an English one does. "aug" and "dim" are an increase and a decrease: "2 aug" means two increases, not two stitches worked into one. When in doubt, count your stitches against the number in brackets at the end of the round.',
        ],
      },
      {
        h2: 'Converting a whole pattern',
        paragraphs: [
          'For a single row, the tool above is enough. For a whole pattern, or to move from one convention to the other without mixing up the stitch heights, use the US ↔ UK converter: it rewrites the abbreviations and adds the equivalent of the hook sizes.',
        ],
      },
      {
        h2: 'Then read it in large type, in the reader',
        paragraphs: [
          'Reading a translated row on a screen is one thing; following a forty-row pattern with a hook in your hand is another. The "Open in the reader" button sends your text to the reader: one instruction at a time, in very large type, with a row counter, a repeat counter and a timer. Every abbreviation stays underlined: hover or tap for its definition, and the "Abbreviations written out" switch writes everything in plain words, as it does here.',
        ],
      },
    ],
    toConverter: 'Convert a whole pattern',
    toGuide: 'The guide to reading a pattern',
    toGlossary: 'The full glossary',
  },
};

/**
 * Lire un patron dans l'autre langue (fiche 31) : l'outil sait déjà écrire une
 * abréviation en clair, la page le dit à qui cherche « traduire un patron de
 * crochet anglais ».
 *
 * Le texte collé est rendu en segments par `@for`, jamais en HTML.
 */
@Component({
  selector: 'fil-foreign-pattern-page',
  imports: [Button, InputField, RouterLink],
  host: { class: 'wrap' },
  template: `
    <section class="hero">
      <h1>{{ c.h1 }}</h1>
      <p>{{ c.lead }}</p>
    </section>

    <section class="card">
      <div class="field">
        <label for="foreign-input">{{ c.inputLabel }}</label>
        <textarea
          filInput
          id="foreign-input"
          rows="4"
          spellcheck="false"
          [value]="text()"
          (input)="edit($any($event.target).value)"
        ></textarea>
      </div>

      <p class="hint">{{ c.outputLabel }}</p>
      <p class="step-body term-try foreign-output" aria-live="polite">
        @for (segment of segments(); track $index) {
          @if (segment.abbr) {
            <ng-container>{{ segment.text + ' (' + segment.abbr + ')' }}</ng-container>
          } @else if (segment.unknown) {
            <span class="foreign-unknown">{{ segment.text }}</span>
          } @else {
            <ng-container>{{ segment.text }}</ng-container>
          }
        }
      </p>
      @if (hasUnknown()) {
        <p class="hint">{{ c.unknownHint }}</p>
      }

      <div class="navrow">
        @if (readerHref(); as href) {
          <a filButton="primary" class="foreign-open" [attr.href]="href">{{ c.openInReader }}</a>
        }
      </div>
      @if (tooLong()) {
        <p class="hint" role="alert">{{ tooLongMessage }}</p>
      }
    </section>

    <article class="prose">
      @for (section of c.sections; track section.h2) {
        <h2>{{ section.h2 }}</h2>
        @for (paragraph of section.paragraphs; track $index) {
          <p>{{ paragraph }}</p>
        }
        @if (section.list; as items) {
          <ul>
            @for (item of items; track $index) {
              <li>{{ item }}</li>
            }
          </ul>
        }
        @if (section.table) {
          <div class="glossary-table-scroll">
            <table class="table foreign-table">
              <caption class="visually-hidden">
                {{
                  c.tableCaption
                }}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{{ c.colAbbr }}</th>
                  <th scope="col">{{ c.colMeaning }}</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows; track row.term) {
                  <tr>
                    <td>
                      <code>{{ row.term }}</code>
                    </td>
                    <td>
                      {{ row.meaning }}
                      @if (row.region) {
                        <span class="tag">{{ row.region }}</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </article>

    <div class="navrow">
      <a filButton="primary" [routerLink]="i18n.link('converter')">{{ c.toConverter }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('guideReadingPattern')">{{ c.toGuide }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('glossary')">{{ c.toGlossary }}</a>
    </div>
  `,
})
export default class ForeignPatternPage {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);
  private readonly analytics = inject(AnalyticsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = COPY[this.locale];
  protected readonly rows = abbreviationTable(this.locale);
  protected readonly tooLongMessage = READER_COPY[this.locale]['ui.linkTooLong'];

  protected readonly text = signal(this.c.example);
  protected readonly segments = computed(() => expandAbbreviations(this.text(), this.locale));
  protected readonly hasUnknown = computed(() => this.segments().some((s) => s.unknown));

  /** Lien `#p=` vers le lecteur ; `null` tant qu'il n'est pas prêt, ou si le texte est trop long. */
  protected readonly readerHref = signal<string | null>(null);
  protected readonly tooLong = signal(false);

  private tried = false;
  private ticket = 0;

  protected edit(value: string): void {
    this.text.set(value);
    if (!this.tried) {
      this.tried = true;
      this.analytics.track('foreign_pattern_tried', {
        locale: this.locale,
        length: roundToHundred(value.length),
      });
    }
  }

  constructor() {
    this.i18n.setLocale(this.locale);
    const path = ROUTE_PATHS.readForeignPattern;
    const url = `${this.origin}${localePrefix(this.locale)}${path[this.locale]}`;
    this.seo.apply({
      title: this.c.seoTitle,
      description: this.c.seoDescription,
      path,
      locale: this.locale,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        '@id': url,
        headline: this.c.h1,
        description: this.c.seoDescription,
        inLanguage: this.locale,
        author: { '@type': 'Organization', name: SITE_NAME },
      },
    });

    effect(() => {
      const source = this.text().trim();
      if (this.isBrowser) void this.refreshLink(source);
    });
  }

  private async refreshLink(source: string): Promise<void> {
    const ticket = ++this.ticket;
    if (!source) {
      this.readerHref.set(null);
      this.tooLong.set(false);
      return;
    }
    // Chargé à la demande : le permalien n'a pas sa place dans le bundle initial.
    const { encodePattern } = await import('../../reader/data/pattern-link');
    const encoded = await encodePattern(source);
    if (ticket !== this.ticket) return; // une saisie plus récente a pris le dessus
    const href = `${this.i18n.link('reader')}#p=${encoded}`;
    const tooLong = href.length > MAX_LINK_LENGTH;
    this.tooLong.set(tooLong);
    this.readerHref.set(tooLong ? null : href);
  }
}

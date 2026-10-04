import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../../core/i18n/locale';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME, SITE_ORIGIN } from '../../../core/seo/site';
import { Button } from '../../../shared/ui/button/button';
import { InputField } from '../../../shared/ui/field/input';
// `data/` est du domaine partagé : import autorisé d'une autre fonctionnalité.
import { HOOK_SIZES, findHookSize } from '../../converter/data/hook-sizes';

const NBSP = ' ';

interface HookSizesCopy {
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly h1: string;
  readonly lead: string;
  readonly finderLabel: string;
  readonly finderPlaceholder: string;
  readonly notInStandard: string;
  readonly tableCaption: string;
  readonly colMm: string;
  readonly colUs: string;
  readonly sections: readonly { readonly h2: string; readonly paragraphs: readonly string[] }[];
  readonly toConverter: string;
  readonly toReader: string;
}

const COPY: Record<Locale, HookSizesCopy> = {
  fr: {
    seoTitle: `Tailles de crochet${NBSP}: tableau de correspondance mm ↔ US`,
    seoDescription:
      'Le tableau des tailles de crochet en millimètres et en notation américaine (G-6, H-8…), un chercheur pour passer de l’une à l’autre et comment bien la choisir.',
    h1: 'Tailles de crochet : le tableau mm ↔ US',
    lead: `Un patron américain écrit «${NBSP}G-6${NBSP}», votre boîte de crochets indique «${NBSP}4${NBSP}mm${NBSP}»${NBSP}: tapez l’une ou l’autre pour trouver l’équivalent, ou parcourez le tableau complet.`,
    finderLabel: 'Une taille : 4 mm ou G-6',
    finderPlaceholder: '4 mm, G-6, 7…',
    notInStandard: 'Cette taille n’est pas dans la norme',
    tableCaption: 'Tailles de crochet : diamètre en millimètres et notation américaine',
    colMm: 'Diamètre (mm)',
    colUs: 'Taille US',
    sections: [
      {
        h2: 'Pourquoi une lettre et un chiffre ?',
        paragraphs: [
          `Les crochets américains portent deux repères${NBSP}: une lettre et un numéro, comme «${NBSP}G-6${NBSP}». La lettre suit l’ordre croissant des diamètres, du B au P, et le numéro donne la position de la taille dans une seconde série. Les deux disent la même chose, et un patron américain n’en cite souvent qu’un seul${NBSP}: «${NBSP}size G${NBSP}» ou «${NBSP}6${NBSP}» tout court. La seule taille sans lettre du tableau est le 7, qui vaut 4,5${NBSP}mm.`,
          `Les fabricants n’ont pas tous appliqué ces repères avec la même rigueur, et deux crochets de même lettre peuvent différer d’un quart de millimètre selon la marque. C’est pourquoi le diamètre en millimètres, gravé ou imprimé sur le manche, reste la seule information fiable. Mesurez votre crochet avec un gabarit si le marquage est effacé, et fiez-vous à lui plutôt qu’à la lettre.`,
        ],
      },
      {
        h2: 'La norme du Craft Yarn Council',
        paragraphs: [
          `Le tableau de cette page reprend la correspondance publiée par le Craft Yarn Council, l’organisme américain qui normalise les étiquettes de fil et les patrons. Il couvre quatorze tailles, de 2,25${NBSP}mm (B-1) à 10${NBSP}mm (N/P-15). Les notations à deux lettres, «${NBSP}M/N-13${NBSP}» et «${NBSP}N/P-15${NBSP}», existent parce que les fabricants ne s’accordent pas sur la lettre de ces grosses tailles${NBSP}: le numéro, lui, ne change pas.`,
          `Cette norme sert de référence, pas de loi${NBSP}: elle décrit ce que les patrons américains attendent, et c’est à ce titre qu’on l’utilise pour traduire un patron. Elle ne dit rien des crochets en acier, très fins, réservés à la dentelle, qui ont leur propre numérotation et ne figurent pas ici.`,
        ],
      },
      {
        h2: 'Millimètres, US et numérotation britannique',
        paragraphs: [
          `Le millimètre est le langage commun${NBSP}: la plupart des crochets vendus en Europe n’indiquent que lui, et un patron français ou allemand parle toujours en millimètres. Le système américain, lui, est celui des lettres. Il existe aussi une ancienne numérotation britannique, qui compte à l’envers${NBSP}: plus le numéro est grand, plus le crochet est fin. Elle a presque disparu des étiquettes récentes, et nous ne la reproduisons pas ici faute de source vérifiée${NBSP}: en cas de doute sur un vieux patron, cherchez le diamètre en millimètres.`,
        ],
      },
      {
        h2: 'Choisir sa taille selon le fil et l’échantillon',
        paragraphs: [
          `L’étiquette d’une pelote suggère un crochet, souvent sous forme d’une plage en millimètres, et c’est un bon point de départ. Mais la bonne taille est celle qui donne la bonne tension avec votre main et votre fil, et cela ne se devine pas${NBSP}: cela se mesure sur un échantillon. Travaillez un carré d’une dizaine de centimètres dans le point du patron, mesurez le nombre de mailles et de rangs sur dix centimètres, et comparez avec ce que le patron annonce.`,
          `Trop de mailles pour dix centimètres${NBSP}: votre ouvrage est trop serré, passez à un crochet plus gros. Pas assez${NBSP}: il est trop lâche, prenez un crochet plus fin. Un demi-millimètre change déjà nettement la taille d’un vêtement. Une main qui serre demande plus souvent un crochet plus gros que celui du patron, et l’inverse pour une main qui laisse du mou. Un ouvrage qui doit garder sa forme, comme un amigurumi, se travaille volontiers au crochet plus fin que celui de l’étiquette, pour un tissu dense qui ne laisse pas voir le rembourrage.`,
        ],
      },
      {
        h2: 'Que faire quand le patron dit « size G » ?',
        paragraphs: [
          `Une lettre seule désigne la taille américaine correspondante${NBSP}: «${NBSP}size G${NBSP}» veut dire G-6, soit 4${NBSP}mm. Tapez la lettre dans le chercheur ci-dessus pour le confirmer. Attention aux lettres partagées, M et N par exemple${NBSP}: si le patron cite un numéro, préférez-le à la lettre. Et si votre patron cite une taille absente du tableau, ne l’arrondissez pas au hasard${NBSP}: vérifiez le patron d’origine ou demandez à la créatrice.`,
          `Pour un patron entier, inutile de convertir chaque taille à la main${NBSP}: le convertisseur US ↔ UK ajoute l’équivalent à côté de chaque taille de crochet qu’il rencontre, en même temps qu’il traduit les abréviations.`,
        ],
      },
    ],
    toConverter: 'Convertir un patron entier',
    toReader: 'Le lecteur de patron',
  },
  en: {
    seoTitle: `Crochet hook size chart, mm ↔ US sizes — ${SITE_NAME}`,
    seoDescription:
      'The crochet hook size chart in millimetres and US notation (G-6, H-8…), a finder to go from one to the other, and how to choose the right hook for your yarn.',
    h1: 'Crochet hook sizes: the mm ↔ US chart',
    lead: 'A US pattern says "G-6", the box your hooks came in says "4 mm": type either one to find its equivalent, or browse the full chart.',
    finderLabel: 'A size: 4 mm or G-6',
    finderPlaceholder: '4 mm, G-6, 7…',
    notInStandard: 'This size is not in the standard',
    tableCaption: 'Crochet hook sizes: diameter in millimetres and US notation',
    colMm: 'Diameter (mm)',
    colUs: 'US size',
    sections: [
      {
        h2: 'Why a letter and a number?',
        paragraphs: [
          'American crochet hooks carry two markings: a letter and a number, as in "G-6". The letter follows the diameters in increasing order, from B to P, and the number gives the size’s position in a second series. Both say the same thing, and a US pattern often quotes only one of them: "size G" or just "6". The only size in the chart with no letter is the 7, which is 4.5 mm.',
          'Manufacturers have not all applied these markings equally strictly, and two hooks with the same letter can differ by a quarter of a millimetre depending on the brand. That is why the diameter in millimetres, stamped or printed on the handle, remains the only dependable figure. Measure your hook with a gauge if the marking has worn off, and trust that rather than the letter.',
        ],
      },
      {
        h2: 'The Craft Yarn Council standard',
        paragraphs: [
          'The chart on this page follows the correspondence published by the Craft Yarn Council, the American body that standardises yarn labels and patterns. It covers fourteen sizes, from 2.25 mm (B-1) to 10 mm (N/P-15). The two-letter notations, "M/N-13" and "N/P-15", exist because manufacturers disagree on the letter for these large sizes: the number does not change.',
          'This standard is a reference, not a law: it describes what American patterns expect, and that is why it is used to translate a pattern. It says nothing about steel hooks, the very fine ones reserved for lace, which have their own numbering and are not covered here.',
        ],
      },
      {
        h2: 'Millimetres, US and the British numbering',
        paragraphs: [
          'The millimetre is the common language: most hooks sold in Europe show only that, and a French or German pattern always speaks in millimetres. The American system is the one with letters. There is also an older British numbering, which counts backwards: the bigger the number, the finer the hook. It has almost vanished from recent labels, and we do not reproduce it here for lack of a verified source: if you are unsure about an old pattern, look for the diameter in millimetres.',
        ],
      },
      {
        h2: 'Choosing your size from the yarn and your gauge',
        paragraphs: [
          'A yarn label suggests a hook, often as a range in millimetres, and it is a good starting point. But the right size is the one that gives the right tension with your hand and your yarn, and that cannot be guessed: it has to be measured on a swatch. Work a square of about ten centimetres in the pattern’s stitch, count the stitches and rows over ten centimetres, and compare with what the pattern states.',
          'Too many stitches over ten centimetres: your work is too tight, move up to a bigger hook. Too few: it is too loose, take a finer hook. Half a millimetre already makes a clear difference to the size of a garment. A tight hand more often needs a bigger hook than the pattern’s, and the opposite for a loose one. A piece that must hold its shape, such as an amigurumi, is often worked with a finer hook than the label suggests, for a dense fabric that does not let the stuffing show.',
        ],
      },
      {
        h2: 'What to do when the pattern says "size G"',
        paragraphs: [
          'A letter on its own means the matching US size: "size G" means G-6, which is 4 mm. Type the letter into the finder above to confirm it. Beware of shared letters, M and N for example: if the pattern quotes a number, prefer it to the letter. And if your pattern quotes a size that is not in the chart, do not round it at random: check the original pattern or ask the designer.',
          'For a whole pattern there is no need to convert every size by hand: the US ↔ UK converter adds the equivalent next to each hook size it finds, at the same time as it translates the abbreviations.',
        ],
      },
    ],
    toConverter: 'Convert a whole pattern',
    toReader: 'The pattern reader',
  },
};

/**
 * Page dédiée aux tailles de crochet (fiche 29) : la requête « crochet hook
 * sizes chart » mérite sa page, hors du convertisseur dont le titre parle de
 * conversion US / UK.
 */
@Component({
  selector: 'fil-hook-sizes-page',
  imports: [Button, InputField, RouterLink],
  host: { class: 'wrap' },
  template: `
    <section class="hero">
      <h1>{{ c.h1 }}</h1>
      <p>{{ c.lead }}</p>
    </section>

    <section class="card">
      <div class="field">
        <label for="hook-size-input">{{ c.finderLabel }}</label>
        <input
          filInput
          type="text"
          id="hook-size-input"
          autocomplete="off"
          [placeholder]="c.finderPlaceholder"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
        />
      </div>
      <div class="hook-result step-body" aria-live="polite">
        @if (found(); as size) {
          {{ size.mm }} mm = {{ size.us }}
        } @else if (query().trim()) {
          {{ c.notInStandard }}
        }
      </div>
    </section>

    <section class="stack">
      <div class="glossary-table-scroll">
        <table class="table">
          <caption class="visually-hidden">
            {{
              c.tableCaption
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ c.colMm }}</th>
              <th scope="col">{{ c.colUs }}</th>
            </tr>
          </thead>
          <tbody>
            @for (size of sizes; track size.us) {
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

    <article class="prose">
      @for (section of c.sections; track section.h2) {
        <h2>{{ section.h2 }}</h2>
        @for (paragraph of section.paragraphs; track $index) {
          <p>{{ paragraph }}</p>
        }
      }
    </article>

    <div class="navrow">
      <a filButton="primary" [routerLink]="i18n.link('converter')">{{ c.toConverter }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('reader')">{{ c.toReader }}</a>
    </div>
  `,
})
export default class HookSizesPage {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = COPY[this.locale];
  protected readonly sizes = HOOK_SIZES;

  protected readonly query = signal('');
  protected readonly found = computed(() => findHookSize(this.query()));

  constructor() {
    this.i18n.setLocale(this.locale);
    const path = ROUTE_PATHS.hookSizes;
    this.seo.apply({
      title: this.c.seoTitle,
      description: this.c.seoDescription,
      path,
      locale: this.locale,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${this.origin}${localePrefix(this.locale)}${path[this.locale]}`,
        name: this.c.h1,
        description: this.c.seoDescription,
        inLanguage: this.locale,
      },
    });
  }
}

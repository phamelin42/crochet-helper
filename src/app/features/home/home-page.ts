import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { Locale } from '../../core/i18n/locale';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_NAME } from '../../core/seo/site';
import { ROUTE_PATHS } from '../../core/i18n/route-paths';
import { Button } from '../../shared/ui/button/button';

const COPY: Record<Locale, Record<string, string>> = {
  fr: {
    title: `${SITE_NAME} — lire un patron de crochet une étape à la fois`,
    description:
      'Crochet helper transforme un tutoriel de crochet ou de tricot collé en texte en une lecture pas à pas : une instruction en grand, un compteur de rangs, un glossaire des abréviations. Gratuit, sans compte, hors ligne.',
    h1: 'Un patron, une étape à la fois',
    lead: "Collez le tutoriel. Crochet helper le découpe en rangs, affiche l'instruction en cours en grand, compte vos répétitions et explique les abréviations au survol.",
    cta: 'Ouvrir le lecteur',
    ctaSecondary: 'Voir le glossaire',
    f1t: 'Découpage automatique',
    f1b: '« Rang 1 », « Round 3 », « Rangs 5-8 » : Crochet helper reconnaît les libellés français et anglais, isole le matériel et sépare les pièces.',
    f2t: 'Compteurs à portée de main',
    f2b: 'Répétitions, avancement, chronomètre de session. Les flèches du clavier suffisent, crochet en main.',
    f3t: 'Glossaire intégré',
    f3b: 'ms, sc, aug, k2tog… survolez une abréviation pour la voir en clair, dans la langue de votre choix.',
    f4t: 'Hors ligne et privé',
    f4b: "Aucun compte, aucun envoi. Votre patron et votre progression restent sur l'appareil.",
  },
  en: {
    title: `${SITE_NAME} — read a crochet pattern one step at a time`,
    description:
      'Crochet helper turns a pasted crochet or knitting pattern into a step-by-step read: one large instruction, a row counter, a glossary of abbreviations. Free, no account, offline.',
    h1: 'One pattern, one step at a time',
    lead: 'Paste the pattern. Crochet helper splits it into rows, shows the current instruction large, counts your repeats and explains abbreviations on hover.',
    cta: 'Open the reader',
    ctaSecondary: 'Browse the glossary',
    f1t: 'Automatic splitting',
    f1b: '“Row 1”, “Round 3”, “Rows 5-8”: Crochet helper recognises French and English labels, isolates materials and separates pieces.',
    f2t: 'Counters within reach',
    f2b: 'Repeats, progress, session timer. Arrow keys are enough, hook in hand.',
    f3t: 'Built-in glossary',
    f3b: 'sc, dc, inc, k2tog… hover an abbreviation to see it spelled out, in the language you choose.',
    f4t: 'Offline and private',
    f4b: 'No account, no upload. Your pattern and your progress stay on the device.',
  },
};

/** Page d'accueil : porte d'entrée du référencement et présentation du produit. */
@Component({
  selector: 'fil-home-page',
  imports: [Button, RouterLink],
  host: { class: 'wrap' },
  template: `
    <section class="hero">
      <h1>{{ c['h1'] }}</h1>
      <p>{{ c['lead'] }}</p>
      <div class="cta-row">
        <a filButton="primary" [routerLink]="i18n.link('reader')">{{ c['cta'] }}</a>
        <a filButton="secondary" [routerLink]="i18n.link('glossary')">{{ c['ctaSecondary'] }}</a>
      </div>
    </section>

    <hr class="hr" />

    <section class="grid-cards">
      @for (feature of features; track feature.title) {
        <article class="card elev-sm">
          <h2 class="card-title">{{ feature.title }}</h2>
          <p class="card-body">{{ feature.body }}</p>
        </article>
      }
    </section>
  `,
})
export class HomePage {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? 'fr';
  protected readonly c = COPY[this.locale];
  protected readonly features = [
    { title: this.c['f1t'], body: this.c['f1b'] },
    { title: this.c['f2t'], body: this.c['f2b'] },
    { title: this.c['f3t'], body: this.c['f3b'] },
    { title: this.c['f4t'], body: this.c['f4b'] },
  ];

  constructor() {
    this.i18n.setLocale(this.locale);
    this.seo.apply({
      title: this.c['title'],
      description: this.c['description'],
      path: ROUTE_PATHS.home,
      locale: this.locale,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        inLanguage: this.locale,
        description: this.c['description'],
      },
    });
  }
}

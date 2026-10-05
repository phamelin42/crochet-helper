import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../../core/i18n/locale';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME, SITE_ORIGIN } from '../../../core/seo/site';
import { PRIVACY_EVENTS, PRIVACY_EVENT_NAMES } from '../data/privacy-events';

const NBSP = ' ';

interface PrivacyCopy {
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly h1: string;
  readonly updated: string;
  readonly lead: string;
  readonly h2Device: string;
  readonly bodyDevice: string;
  readonly h2Audience: string;
  readonly bodyAudience: string;
  readonly bodyAudienceSent: string;
  readonly bodyAudienceNever: string;
  readonly h2Events: string;
  readonly bodyEvents: string;
  readonly h2Links: string;
  readonly bodyLinks: string;
  readonly h2Waitlist: string;
  readonly bodyWaitlist: string;
  readonly h2Delete: string;
  readonly bodyDelete: string;
  readonly h2Contact: string;
  readonly bodyContact: string;
  readonly contactLink: string;
  readonly h2Next: string;
  readonly bodyNext: string;
  readonly projects: string;
}

const COPY: Record<Locale, PrivacyCopy> = {
  fr: {
    seoTitle: `Confidentialité${NBSP}: vos patrons restent sur votre appareil`,
    seoDescription:
      'Vos patrons restent sur votre appareil, sans compte. Ce que l’outil garde, ce que la mesure d’audience envoie ou ne voit jamais, et comment tout effacer.',
    h1: 'Confidentialité',
    updated: `Mise à jour le 30${NBSP}septembre 2026.`,
    lead: `Vos patrons restent sur votre appareil${NBSP}: ${SITE_NAME} n’a ni compte, ni serveur qui les reçoive.`,
    h2Device: 'Ce qui reste sur votre appareil',
    bodyDevice:
      'Vos patrons, votre progression, le chronomètre, les photos et les diagrammes que vous ajoutez sont enregistrés dans le navigateur (IndexedDB). Vos préférences d’affichage (taille du texte, fond sombre, mode page pleine), le compteur de rangs en ligne et le projet ouvert en dernier le sont dans le stockage local du navigateur (localStorage). Rien de tout cela n’est envoyé à un serveur.',
    h2Audience: 'La mesure d’audience',
    bodyAudience: `Pour savoir quelles pages servent, ${SITE_NAME} utilise Umami, un outil de mesure installé sur notre propre serveur (chez OVH), sans cookie ni identifiant${NBSP}: rien ne permet de reconnaître une personne d’une visite à l’autre, et rien n’est revendu ni confié à une régie publicitaire.`,
    bodyAudienceSent: `Ce qui part${NBSP}: la page vue, le pays, le type d’appareil et de navigateur, la langue, et les gestes listés plus bas. Seules deux dates civiles, stockées dans votre navigateur, servent à dire si une visite est un retour (un jour, une semaine, un mois plus tard)${NBSP}: elles ne sont jamais envoyées telles quelles.`,
    bodyAudienceNever: `Ce qui ne part jamais${NBSP}: le texte d’un patron, un nom de fichier, une recherche saisie.`,
    h2Events: 'Les gestes mesurés',
    bodyEvents: `Chaque geste ci-dessous est compté, sans le contenu de ce que vous avez saisi${NBSP}:`,
    h2Links: 'Les liens de partage',
    bodyLinks: `Quand vous copiez le lien d’un patron ou d’un projet, le patron est contenu dans le lien lui-même, après le signe #. Cette partie d’une adresse n’est jamais transmise au serveur qui héberge le site${NBSP}: le lien ne passe par aucun serveur de ${SITE_NAME}.`,
    h2Waitlist: 'La liste d’attente',
    bodyWaitlist: `Si vous suivez le lien « En savoir plus » de la liste d’attente, vous arrivez sur un formulaire hébergé par Tally. Si vous y laissez votre adresse électronique, elle va chez Tally et sert uniquement à vous prévenir quand une version synchronisée entre appareils existera. Ne rien remplir, c’est ne rien envoyer.`,
    h2Delete: 'Effacer vos données',
    bodyDelete: `Dans «${NBSP}Mes projets${NBSP}», supprimez un projet pour l’effacer de l’appareil. Pour tout effacer d’un coup, supprimez les données du site dans les réglages de votre navigateur. Comme rien n’est gardé ailleurs, il n’y a rien d’autre à demander.`,
    h2Contact: 'Nous écrire',
    bodyContact: `Une question sur vos données${NBSP}? Écrivez-nous sur le Discord du projet.`,
    contactLink: 'Ouvrir le Discord',
    h2Next: 'Et la suite',
    bodyNext:
      'Si une option payante de synchronisation entre appareils voit le jour, cette page sera mise à jour avant sa mise en service.',
    projects: 'Mes projets',
  },
  en: {
    seoTitle: `Privacy: your patterns stay on your device — ${SITE_NAME}`,
    seoDescription:
      'Your patterns stay on your device, with no account. What the tool keeps, what audience measurement sends and what it never sees, and how to erase everything.',
    h1: 'Privacy',
    updated: 'Last updated September 30, 2026.',
    lead: `Your patterns stay on your device: ${SITE_NAME} has no account and no server that receives them.`,
    h2Device: 'What stays on your device',
    bodyDevice:
      'Your patterns, your progress, the timer, and the pictures and charts you add are saved in your browser (IndexedDB). Your display preferences (text size, dark background, full-page mode), the online row counter and the last project you opened are saved in the browser’s local storage (localStorage). None of this is sent to a server.',
    h2Audience: 'Audience measurement',
    bodyAudience: `To learn which pages are useful, ${SITE_NAME} uses Umami, a measurement tool installed on our own server (at OVH), with no cookie and no identifier: nothing can recognise a person from one visit to the next, and nothing is sold or handed to an ad network.`,
    bodyAudienceSent:
      'What is sent: the page viewed, the country, the type of device and browser, the language, and the actions listed below. Two calendar dates stored in your browser are only used to tell whether a visit is a return (a day, a week, a month later): they are never sent as they are.',
    bodyAudienceNever:
      'What is never sent: the text of a pattern, a file name, anything you type in a search.',
    h2Events: 'The actions measured',
    bodyEvents: 'Each action below is counted, without the content of what you typed:',
    h2Links: 'Share links',
    bodyLinks: `When you copy a pattern or project link, the pattern is carried by the link itself, after the # sign. That part of an address is never sent to the server that hosts the site: the link goes through no ${SITE_NAME} server.`,
    h2Waitlist: 'The waiting list',
    bodyWaitlist:
      'If you follow the “Tell me more” link of the waiting list, you land on a form hosted by Tally. If you leave your email address there, it goes to Tally and is only used to tell you when a version that syncs between devices exists. Filling in nothing sends nothing.',
    h2Delete: 'Erasing your data',
    bodyDelete:
      'In “My projects”, delete a project to remove it from the device. To erase everything at once, clear the site’s data in your browser settings. Since nothing is kept anywhere else, there is nothing else to ask for.',
    h2Contact: 'Contact',
    bodyContact: 'A question about your data? Write to us on the project’s Discord.',
    contactLink: 'Open Discord',
    h2Next: 'What comes next',
    bodyNext:
      'If a paid option to sync between devices ever exists, this page will be updated before it goes live.',
    projects: 'My projects',
  },
};

/**
 * Confidentialité (fiche 40) : exigée par le Play Store, et un argument. Les
 * gestes mesurés viennent de `PRIVACY_EVENTS`, typé sur `AnalyticsEvent`.
 */
@Component({
  selector: 'fil-privacy-page',
  imports: [RouterLink],
  host: { class: 'wrap' },
  template: `
    <article class="prose">
      <h1>{{ c.h1 }}</h1>
      <p class="hint">{{ c.updated }}</p>
      <p class="lead">{{ c.lead }}</p>

      <h2>{{ c.h2Device }}</h2>
      <p>{{ c.bodyDevice }}</p>

      <h2>{{ c.h2Audience }}</h2>
      <p>{{ c.bodyAudience }}</p>
      <p>{{ c.bodyAudienceSent }}</p>
      <p>{{ c.bodyAudienceNever }}</p>

      <h2>{{ c.h2Events }}</h2>
      <p>{{ c.bodyEvents }}</p>
      <ul>
        @for (name of eventNames; track name) {
          <li>{{ events[name][locale] }}</li>
        }
      </ul>

      <h2>{{ c.h2Links }}</h2>
      <p>{{ c.bodyLinks }}</p>

      <h2>{{ c.h2Waitlist }}</h2>
      <p>{{ c.bodyWaitlist }}</p>

      <h2>{{ c.h2Delete }}</h2>
      <p>
        {{ c.bodyDelete }}
        <a [routerLink]="i18n.link('projects')">{{ c.projects }}</a>
      </p>

      <h2>{{ c.h2Contact }}</h2>
      <p>
        {{ c.bodyContact }}
        <a href="https://discord.gg/DPYydhZRND" target="_blank" rel="noopener">{{
          c.contactLink
        }}</a>
      </p>

      <h2>{{ c.h2Next }}</h2>
      <p>{{ c.bodyNext }}</p>
    </article>
  `,
})
export default class PrivacyPage {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);

  protected readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = COPY[this.locale];
  protected readonly events = PRIVACY_EVENTS;
  protected readonly eventNames = PRIVACY_EVENT_NAMES;

  constructor() {
    this.i18n.setLocale(this.locale);
    const url = `${this.origin}${localePrefix(this.locale)}${ROUTE_PATHS.privacy[this.locale]}`;
    this.seo.apply({
      title: this.c.seoTitle,
      description: this.c.seoDescription,
      path: ROUTE_PATHS.privacy,
      locale: this.locale,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': url,
        name: this.c.h1,
        description: this.c.seoDescription,
        inLanguage: this.locale,
      },
    });
  }
}

import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../../core/i18n/locale';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME, SITE_ORIGIN } from '../../../core/seo/site';
import { Button } from '../../../shared/ui/button/button';

const NBSP = ' ';

interface DesignersCopy {
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly h1: string;
  readonly lead: string;
  readonly h2Client: string;
  readonly bodyClient: string;
  readonly h2Link: string;
  readonly bodyLink: string;
  readonly tryReader: string;
  readonly h2Badge: string;
  readonly bodyBadge: string;
  readonly badgeAlt: string;
  readonly copyCode: string;
  readonly codeCopied: string;
  readonly codeHint: string;
  readonly h2Pin: string;
  readonly bodyPin: string;
  readonly downloadPin: string;
  readonly h2Limit: string;
  readonly bodyLimit: string;
}

const COPY: Record<Locale, DesignersCopy> = {
  fr: {
    seoTitle: `Un kit pour les créatrices de patrons — ${SITE_NAME}`,
    seoDescription:
      'Offrez « Ouvrir dans Pattern Reader » à vos clientes : un lien qui contient tout le patron, un badge prêt à copier et un visuel à épingler.',
    h1: 'Offrez « Ouvrir dans Pattern Reader » à vos clientes',
    lead: `Rien à installer, rien à héberger${NBSP}: un lien qui contient tout votre patron, prêt à coller dans votre boutique, votre bio ou votre PDF.`,
    h2Client: 'Ce que voit votre cliente',
    bodyClient: `Elle ouvre votre lien et retrouve directement votre patron dans le lecteur${NBSP}: une seule instruction à la fois, écrite en grand, avec le compteur de rangs, le chronomètre et le glossaire des abréviations au survol. Rien à créer de son côté${NBSP}: ni compte, ni téléchargement.`,
    h2Link: 'Comment créer le lien',
    bodyLink: `Collez le texte de votre patron dans le lecteur, comme vous le feriez pour le lire vous-même, puis cliquez sur «${NBSP}Copier le lien${NBSP}». Le lien obtenu contient tout le patron${NBSP}: personne d’autre n’a besoin de l’héberger.`,
    tryReader: 'Essayer le lecteur',
    h2Badge: 'Le badge à copier',
    bodyBadge:
      'Un badge à poser près de vos patrons, sur votre boutique ou dans un PDF. Remplacez les points de suspension par le lien copié à l’étape précédente.',
    badgeAlt: 'Ouvrir dans Pattern Reader',
    copyCode: 'Copier le code',
    codeCopied: 'Copié !',
    codeHint: 'Le lien affiché est un exemple : remplacez « … » par le vôtre.',
    h2Pin: 'Un visuel à épingler',
    bodyPin:
      'Une image verticale prête pour Pinterest ou un réseau social, à associer à votre propre lien.',
    downloadPin: 'Télécharger le visuel (PNG)',
    h2Limit: 'La limite, en toute franchise',
    bodyLimit: `Un patron très long ne tient pas dans un lien${NBSP}: au-delà de 8${NBSP}000 caractères, Pattern Reader refuse de créer le lien plutôt que d’en livrer un tronqué. Pour un patron de cette taille, mieux vaut renvoyer vers son texte complet et laisser votre cliente le coller elle-même dans le lecteur.`,
  },
  en: {
    seoTitle: `A kit for pattern designers — ${SITE_NAME}`,
    seoDescription:
      'Offer "Open in Pattern Reader" to your customers: a link that carries the whole pattern, a badge ready to copy, and a pinnable image.',
    h1: 'Offer "Open in Pattern Reader" to your customers',
    lead: 'Nothing to install, nothing to host: a link that carries your whole pattern, ready to paste into your shop, your bio or a PDF.',
    h2Client: 'What your customer sees',
    bodyClient:
      'She opens your link and lands straight in the reader with your pattern loaded: one instruction at a time, in large print, with a row counter, a timer and abbreviations explained on hover. Nothing for her to set up: no account, no download.',
    h2Link: 'How to create the link',
    bodyLink:
      'Paste your pattern text into the reader, the same way you would to read it yourself, then click "Copy link". The resulting link carries the whole pattern: nobody else needs to host it.',
    tryReader: 'Try the reader',
    h2Badge: 'The badge to copy',
    bodyBadge:
      'A badge to place next to your patterns, on your shop or in a PDF. Replace the ellipsis with the link you copied in the previous step.',
    badgeAlt: 'Open in Pattern Reader',
    copyCode: 'Copy the code',
    codeCopied: 'Copied!',
    codeHint: 'The link shown is an example: replace "…" with your own.',
    h2Pin: 'A pinnable image',
    bodyPin:
      'A vertical image ready for Pinterest or a social network, to pair with your own link.',
    downloadPin: 'Download the image (PNG)',
    h2Limit: 'The limit, honestly stated',
    bodyLimit:
      'A very long pattern does not fit in a link: beyond 8,000 characters, Pattern Reader refuses to create the link rather than hand over a truncated one. For a pattern that size, it is better to link to the full text and let your customer paste it into the reader herself.',
  },
};

/**
 * Kit pour les créatrices de patrons (fiche 23) : le canal le mieux noté du
 * plan d'acquisition n'avait ni page, ni badge, ni visuel à offrir.
 */
@Component({
  selector: 'fil-for-designers-page',
  imports: [Button, RouterLink],
  host: { class: 'wrap' },
  template: `
    <article class="prose">
      <h1>{{ c.h1 }}</h1>
      <p class="lead">{{ c.lead }}</p>

      <h2>{{ c.h2Client }}</h2>
      <p>{{ c.bodyClient }}</p>

      <h2>{{ c.h2Link }}</h2>
      <p>{{ c.bodyLink }}</p>
      <p>
        <a filButton="secondary" [routerLink]="i18n.link('reader')">{{ c.tryReader }}</a>
      </p>

      <h2>{{ c.h2Badge }}</h2>
      <p>{{ c.bodyBadge }}</p>
      <p>
        <img [src]="badgeSrc" [alt]="c.badgeAlt" width="260" height="48" />
      </p>
      <div class="prompt-box">
        <pre tabindex="0">{{ badgeCode }}</pre>
        <button type="button" filButton="primary" (click)="copyCode()">
          {{ codeCopied() ? c.codeCopied : c.copyCode }}
        </button>
      </div>
      <p class="hint">{{ c.codeHint }}</p>

      <h2>{{ c.h2Pin }}</h2>
      <p>{{ c.bodyPin }}</p>
      <p class="pin-preview">
        <img src="/pin/pattern-reader-pin.svg" alt="" width="200" height="300" />
      </p>
      <p>
        <a filButton="secondary" href="/pin/pattern-reader-pin.png" download>{{ c.downloadPin }}</a>
      </p>

      <h2>{{ c.h2Limit }}</h2>
      <p>{{ c.bodyLimit }}</p>
    </article>
  `,
})
export class ForDesignersPage {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = COPY[this.locale];
  protected readonly codeCopied = signal(false);

  protected readonly badgeSrc =
    this.locale === 'fr'
      ? '/badges/open-in-pattern-reader-fr.svg'
      : '/badges/open-in-pattern-reader.svg';

  protected readonly badgeCode = `<a href="${this.origin}/#p=…"><img src="${this.origin}${this.badgeSrc}" alt="${COPY[this.locale].badgeAlt}" width="260" height="48"></a>`;

  constructor() {
    this.i18n.setLocale(this.locale);
    const url = `${this.origin}${localePrefix(this.locale)}${ROUTE_PATHS.forDesigners[this.locale]}`;
    this.seo.apply({
      title: this.c.seoTitle,
      description: this.c.seoDescription,
      path: ROUTE_PATHS.forDesigners,
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

  protected async copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.badgeCode);
      this.codeCopied.set(true);
      setTimeout(() => this.codeCopied.set(false), 2000);
    } catch {
      // Presse-papiers refusé : le code reste sélectionnable à la main.
    }
  }
}

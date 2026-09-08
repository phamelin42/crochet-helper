import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Locale } from '../../../core/i18n/locale';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME } from '../../../core/seo/site';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { MaterialsList } from '../components/materials-list';
import { PatternImport } from '../components/pattern-import';
import { ReaderCounters } from '../components/reader-counters';
import { StepView } from '../components/step-view';
import { ReaderStore } from '../state/reader-store';

const SEO: Record<Locale, { title: string; description: string }> = {
  fr: {
    title: `Lecteur de patterns crochet et tricot — ${SITE_NAME}`,
    description:
      'Collez un tutoriel de crochet ou de tricot : Crochet helper le découpe en étapes, affiche une seule instruction à la fois, compte vos rangs et traduit les abréviations. Gratuit, sans compte, tout reste sur votre appareil.',
  },
  en: {
    title: `Crochet and knitting pattern reader — ${SITE_NAME}`,
    description:
      'Paste any crochet or knitting pattern: Crochet helper splits it into steps, shows one instruction at a time, counts your rows and explains the abbreviations. Free, no account, everything stays on your device.',
  },
};

/**
 * Page du lecteur : import, étape en cours, compteurs, matériel.
 *
 * Les raccourcis clavier sont posés ici plutôt que dans les composants
 * enfants — une seule page les écoute, et ils restent inactifs quand le focus
 * est dans un champ de saisie.
 */
@Component({
  selector: 'fil-reader-page',
  imports: [MaterialsList, PatternImport, ReaderCounters, StepView],
  host: {
    class: 'wrap',
    '(document:keydown)': 'onKeydown($event)',
    '(document:paste)': 'onPaste($event)',
  },
  template: `
    <fil-pattern-import />

    <section class="reader">
      <div>
        <fil-step-view />
      </div>
    </section>

    <hr class="hr" />

    <fil-reader-counters />

    @if (store.materials().length) {
      <fil-materials-list />
    }
  `,
})
export class ReaderPage {
  protected readonly store = inject(ReaderStore);
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    const locale = (this.route.snapshot.data['locale'] as Locale) ?? 'fr';
    this.i18n.setLocale(locale);
    this.seo.apply({
      ...SEO[locale],
      path: ROUTE_PATHS.reader,
      locale,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: SITE_NAME,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web',
        description: SEO[locale].description,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        featureList: [
          'Découpage automatique en étapes',
          'Compteur de rangs et de répétitions',
          'Glossaire crochet et tricot FR/EN',
          'Chronomètre de session',
        ],
      },
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT' || event.metaKey || event.ctrlKey || event.altKey)
      return;

    switch (event.key) {
      case 'ArrowRight':
      case ' ':
      case 'PageDown':
        event.preventDefault();
        this.store.move(1);
        break;
      case 'ArrowLeft':
      case 'PageUp':
        event.preventDefault();
        this.store.move(-1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.store.addRepeat(1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.store.addRepeat(-1);
        break;
      default:
    }
  }

  /** Coller une image ou un patron entier n'importe où sur la page l'importe. */
  protected onPaste(event: ClipboardEvent): void {
    const file = event.clipboardData?.files?.[0];
    if (file?.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => this.store.setImage(String(reader.result));
      reader.readAsDataURL(file);
      event.preventDefault();
      return;
    }
    if ((event.target as HTMLElement | null)?.tagName === 'TEXTAREA') return;
    const text = event.clipboardData?.getData('text') ?? '';
    if (text.trim().length > 20) {
      this.store.load(text);
      event.preventDefault();
    }
  }
}

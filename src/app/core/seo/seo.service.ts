import { DOCUMENT } from '@angular/common';
import { Service, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DEFAULT_LOCALE, LOCALES, Locale, localePrefix } from '../i18n/locale';
import { LocalizedPath } from '../i18n/route-paths';
import { SITE_NAME, SITE_ORIGIN } from './site';

export interface PageSeo {
  title: string;
  description: string;
  /** Chemin de la page dans chaque langue, sans préfixe de langue. */
  path: LocalizedPath;
  locale: Locale;
  /** Données structurées schema.org injectées dans un <script type="application/ld+json">. */
  jsonLd?: Record<string, unknown>;
  noIndex?: boolean;
}

/**
 * Métadonnées de référencement d'une page : titre, description, canonique,
 * alternates hreflang, Open Graph et JSON-LD. Appelé depuis chaque page ; le
 * pré-rendu fige le résultat dans le HTML servi aux robots.
 */
@Service()
export class SeoService {
  private readonly doc = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly origin = inject(SITE_ORIGIN);

  apply(seo: PageSeo): void {
    const canonical = this.absolute(seo.locale, seo.path);

    this.title.setTitle(seo.title);
    this.doc.documentElement.lang = seo.locale;

    this.meta.updateTag({ name: 'description', content: seo.description });
    this.meta.updateTag({
      name: 'robots',
      content: seo.noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    });

    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:title', content: seo.title });
    this.meta.updateTag({ property: 'og:description', content: seo.description });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({
      property: 'og:locale',
      content: seo.locale === 'fr' ? 'fr_FR' : 'en_US',
    });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

    this.setLink('canonical', canonical);

    for (const locale of LOCALES) {
      this.setLink('alternate', this.absolute(locale, seo.path), locale);
    }
    this.setLink('alternate', this.absolute(DEFAULT_LOCALE, seo.path), 'x-default');

    this.setJsonLd(seo.jsonLd);
  }

  /** URL absolue d'une page dans une langue donnée. */
  private absolute(locale: Locale, path: LocalizedPath): string {
    const segment = path[locale];
    return `${this.origin}${localePrefix(locale)}${segment === '/' ? '' : segment}` || this.origin;
  }

  private setLink(rel: string, href: string, hreflang?: string): void {
    const selector = hreflang
      ? `link[rel="${rel}"][hreflang="${hreflang}"]`
      : `link[rel="${rel}"]:not([hreflang])`;
    let link = this.doc.head.querySelector<HTMLLinkElement>(selector);
    if (!link) {
      link = this.doc.createElement('link');
      link.rel = rel;
      if (hreflang) link.hreflang = hreflang;
      this.doc.head.appendChild(link);
    }
    link.href = href;
  }

  private setJsonLd(data: Record<string, unknown> | undefined): void {
    const id = 'fil-json-ld';
    this.doc.getElementById(id)?.remove();
    if (!data) return;
    const script = this.doc.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    this.doc.head.appendChild(script);
  }
}

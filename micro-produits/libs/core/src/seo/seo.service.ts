import { DOCUMENT } from '@angular/common';
import { InjectionToken, Service, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { PRODUIT } from '../produit/produit';

/** Origine publique, surchargeable (préproduction, tests). */
export const SITE_ORIGIN = new InjectionToken<string>('SITE_ORIGIN', {
  providedIn: 'root',
  factory: () => `https://${inject(PRODUIT).domaine}`,
});

export interface PageSeo {
  title: string;
  description: string;
  /** Chemin absolu de la page, `/` pour l'accueil. */
  path: string;
  /** Données structurées schema.org. */
  jsonLd?: Record<string, unknown>;
  noIndex?: boolean;
}

/**
 * Métadonnées d'une page : titre, description, canonique, Open Graph,
 * JSON-LD, vérification Search Console. Appelé dans le constructeur de chaque
 * page : le pré-rendu fige le résultat dans le HTML servi aux robots.
 */
@Service()
export class SeoService {
  private readonly doc = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly produit = inject(PRODUIT);

  apply(seo: PageSeo): void {
    const canonical = `${this.origin}${seo.path}`;
    this.title.setTitle(seo.title);
    this.meta.updateTag({ name: 'description', content: seo.description });
    this.meta.updateTag({
      name: 'robots',
      content: seo.noIndex ? 'noindex, follow' : 'index, follow, max-image-preview:large',
    });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: this.produit.nom });
    this.meta.updateTag({ property: 'og:title', content: seo.title });
    this.meta.updateTag({ property: 'og:description', content: seo.description });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ property: 'og:locale', content: 'fr_FR' });
    if (this.produit.mesure.googleVerification) {
      this.meta.updateTag({
        name: 'google-site-verification',
        content: this.produit.mesure.googleVerification,
      });
    }
    this.setCanonical(canonical);
    this.setJsonLd(seo.jsonLd);
  }

  private setCanonical(href: string): void {
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.rel = 'canonical';
      this.doc.head.appendChild(link);
    }
    link.href = href;
  }

  private setJsonLd(data: Record<string, unknown> | undefined): void {
    const id = 'mp-json-ld';
    this.doc.getElementById(id)?.remove();
    if (!data) return;
    const script = this.doc.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    this.doc.head.appendChild(script);
  }
}

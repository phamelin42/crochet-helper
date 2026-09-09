import { InjectionToken } from '@angular/core';

/**
 * Origine publique du site, utilisée pour les URL canoniques, les alternates
 * hreflang, Open Graph et le sitemap. Surchargeable au bootstrap (déploiement
 * de préproduction, domaine personnalisé).
 */
export const SITE_ORIGIN = new InjectionToken<string>('SITE_ORIGIN', {
  providedIn: 'root',
  factory: () => 'https://crochet-helper.phamelin.fr',
});

export const SITE_NAME = 'Crochet helper';

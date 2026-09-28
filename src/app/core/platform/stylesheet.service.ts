import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Service, inject } from '@angular/core';

/**
 * Charge une feuille de style à la demande, une seule fois. Le budget du
 * bundle initial ne laisse pas la place des règles d'un panneau que seule une
 * lectrice ayant chargé un diagramme verra : elles vivent dans leur propre
 * feuille (`angular.json`, `inject: false`) et arrivent avec le panneau.
 * Côté serveur, rien n'est fait.
 */
@Service()
export class StylesheetService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  private readonly requested = new Map<string, Promise<void>>();

  /** Se résout quand la feuille est appliquée — ou en échec : l'interface reste utilisable sans. */
  load(href: string): Promise<void> {
    if (!this.isBrowser) return Promise.resolve();
    let pending = this.requested.get(href);
    if (!pending) {
      pending = new Promise<void>((resolve) => {
        const link = this.document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => resolve();
        this.document.head.appendChild(link);
      });
      this.requested.set(href, pending);
    }
    return pending;
  }
}

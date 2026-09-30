import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Service, inject } from '@angular/core';

/**
 * Charge une feuille de style à la demande, une seule fois. Le budget du
 * bundle initial ne laisse pas la place des règles d'un panneau que seule une
 * lectrice ayant chargé un diagramme verra, ni de celles d'une page
 * paresseuse : elles vivent dans leur propre feuille (`angular.json`,
 * `inject: false`) et arrivent avec le panneau ou la page.
 *
 * Côté serveur, la balise `<link>` est posée dans le `<head>` du document
 * rendu : une page pré-rendue arrive donc avec sa feuille, bloquante comme
 * `styles.css`, sans décalage de mise en page. Côté navigateur, une feuille
 * déjà présente dans le HTML reçu est considérée comme appliquée.
 */
@Service()
export class StylesheetService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  private readonly requested = new Map<string, Promise<void>>();

  /** Se résout quand la feuille est appliquée — ou en échec : l'interface reste utilisable sans. */
  load(href: string): Promise<void> {
    let pending = this.requested.get(href);
    if (!pending) {
      const head = this.document.head;
      const present = Array.from(head.querySelectorAll('link[rel="stylesheet"]')).some(
        (link) => link.getAttribute('href') === href,
      );
      pending = Promise.resolve();
      if (!present) {
        const link = this.document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        if (this.isBrowser) {
          pending = new Promise<void>((resolve) => (link.onload = link.onerror = () => resolve()));
        }
        head.appendChild(link);
      }
      this.requested.set(href, pending);
    }
    return pending;
  }
}

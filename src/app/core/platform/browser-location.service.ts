import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Service, inject } from '@angular/core';

/**
 * Seul point de contact avec l'adresse de la page (`location`, `history`) : une
 * fonctionnalité ne touche jamais à `window` elle-même. Hors navigateur
 * (pré-rendu), rien n'existe : l'origine est vide et les actions ne font rien.
 */
@Service()
export class BrowserLocation {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly win = inject(DOCUMENT).defaultView;

  origin(): string {
    return this.isBrowser && this.win ? this.win.location.origin : '';
  }

  /** `?clé=valeur…` de l'adresse courante, ou `''`. */
  search(): string {
    return this.isBrowser && this.win ? this.win.location.search : '';
  }

  /** Quitte la page pour `url` (redirection vers un service d'authentification). */
  redirect(url: string): void {
    if (this.isBrowser && this.win) this.win.location.assign(url);
  }

  /** Remplace l'adresse affichée sans recharger ni ajouter d'entrée à l'historique. */
  replaceUrl(path: string): void {
    if (this.isBrowser && this.win) this.win.history.replaceState(this.win.history.state, '', path);
  }
}

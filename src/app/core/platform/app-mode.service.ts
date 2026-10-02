import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injector, PLATFORM_ID, Service, inject, signal } from '@angular/core';
import { SessionStorageService } from '../storage/session-storage.service';

export type AppMode = 'twa' | 'standalone';

const MODE_KEY = 'fil.appMode';
const LAUNCHED_KEY = 'fil.appLaunched';

/**
 * Dit si l'outil tourne en application (site installé ou application du Play
 * Store) et pose `data-app` sur `<html>`.
 *
 * Le masquage de la coquille du site ne dépend pas de ce service : il est écrit
 * en CSS (`@media (display-mode: standalone)` et `html[data-app]`), pour que le
 * premier affichage soit déjà le bon. Le service sert au reste : navigation,
 * mesure, redirection d'ouverture. `?mode=app` est le filet de la TWA, mémorisé
 * pour la session puisque la navigation interne perd la requête.
 */
@Service()
export class AppModeService {
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly session = inject(SessionStorageService);
  private readonly injector = inject(Injector);

  private readonly current = signal<AppMode | null>(null);
  readonly mode = this.current.asReadonly();

  private backHandler: (() => void) | null = null;
  private readonly onPopState = (): void => {
    const handler = this.backHandler;
    this.forgetBack();
    handler?.();
  };

  constructor() {
    const win = this.doc.defaultView;
    if (!this.isBrowser || !win) return;

    const param = new URLSearchParams(win.location.search).get('mode') === 'app';
    if (param) this.session.write(MODE_KEY, 'twa');
    const twa = param || this.session.read(MODE_KEY) === 'twa';
    const standalone = win.matchMedia?.('(display-mode: standalone)').matches === true;
    const mode: AppMode | null = twa ? 'twa' : standalone ? 'standalone' : null;
    if (!mode) return;

    this.current.set(mode);
    this.doc.documentElement.setAttribute('data-app', '');
  }

  active(): boolean {
    return this.current() !== null;
  }

  /**
   * Vrai une seule fois par session, à l'ouverture : c'est le moment de choisir
   * l'écran de départ et de compter l'ouverture. Faux hors mode appli.
   */
  consumeLaunch(): boolean {
    const mode = this.current();
    if (!mode || this.session.read(LAUNCHED_KEY)) return false;
    this.session.write(LAUNCHED_KEY, '1');
    // Chargée à la demande : la mesure ne pèse pas sur le premier affichage.
    void import('../analytics/analytics.service').then(({ AnalyticsService }) =>
      this.injector.get(AnalyticsService).track('app_opened', { mode }),
    );
    return true;
  }

  /**
   * Fait du bouton retour d'Android une sortie de l'écran courant plutôt que de
   * l'application : une entrée d'historique est ajoutée, et son retrait appelle
   * `handler`. Sans effet hors mode appli.
   */
  trapBack(handler: () => void): void {
    const win = this.doc.defaultView;
    if (!this.active() || !win || this.backHandler) return;
    win.history.pushState({ ...win.history.state, filTrap: true }, '');
    this.backHandler = handler;
    win.addEventListener('popstate', this.onPopState);
  }

  /**
   * Quand l'écran est quitté autrement que par le retour, l'entrée ajoutée est
   * retirée, sinon un retour de plus ne ferait rien. Seulement si elle est
   * encore au sommet : après un changement de page, c'est celle de la page.
   */
  releaseBack(): void {
    const win = this.doc.defaultView;
    if (!this.backHandler || !win) return;
    this.forgetBack();
    if (win.history.state?.filTrap) win.history.back();
  }

  private forgetBack(): void {
    this.backHandler = null;
    this.doc.defaultView?.removeEventListener('popstate', this.onPopState);
  }
}

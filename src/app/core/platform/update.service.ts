import {
  ApplicationRef,
  InjectionToken,
  PLATFORM_ID,
  Service,
  inject,
  isDevMode,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Conteneur du service worker, ou `null` quand il ne doit pas tourner
 * (pré-rendu, développement, navigateur sans support).
 */
export const SERVICE_WORKER = new InjectionToken<ServiceWorkerContainer | null>('SERVICE_WORKER', {
  factory: () =>
    isPlatformBrowser(inject(PLATFORM_ID)) && !isDevMode() && 'serviceWorker' in navigator
      ? navigator.serviceWorker
      : null,
});

/** Délai maximal avant d'enregistrer le worker si l'application tarde à se stabiliser. */
export const REGISTRATION_DELAY_MS = 30_000;

/**
 * Enregistre le service worker et signale qu'une nouvelle version est prête,
 * sans jamais recharger seul : on a peut-être les mains prises au rang 42, un
 * rechargement surprise ferait perdre le fil.
 *
 * Remplace `provideServiceWorker` et `SwUpdate` : ces deux-là coûtaient
 * ~7 ko au bundle initial pour un seul message à écouter. Le worker
 * (`ngsw-worker.js`) reste celui d'Angular ; il fonctionne seul et poste
 * `VERSION_READY` à chaque onglet quand une version est téléchargée.
 * Recharger suffit à l'activer : une nouvelle navigation reçoit toujours la
 * dernière version.
 */
@Service()
export class UpdateService {
  private readonly container = inject(SERVICE_WORKER);

  readonly updateAvailable = signal(false);

  constructor() {
    const container = this.container;
    if (!container) return;

    container.addEventListener('message', (event: MessageEvent) => {
      if ((event.data as { type?: unknown } | null)?.type === 'VERSION_READY') {
        this.updateAvailable.set(true);
      }
    });
    container.startMessages();

    // Comme `registerWhenStable:30000` : le worker télécharge tout le site à
    // l'installation, il ne doit pas disputer la bande passante au premier
    // affichage.
    const stable = inject(ApplicationRef).whenStable();
    const timeout = new Promise((resolve) => setTimeout(resolve, REGISTRATION_DELAY_MS));
    void Promise.race([stable, timeout])
      .then(() => container.register('/ngsw-worker.js'))
      .catch(() => undefined);
  }

  activateUpdate(): void {
    if (this.container) location.reload();
  }
}

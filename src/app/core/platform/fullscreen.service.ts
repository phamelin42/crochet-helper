import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Service, inject } from '@angular/core';

/**
 * Plein écran du navigateur, en complément du mode page pleine du lecteur.
 * Le navigateur l'exige d'un geste : à appeler depuis un clic, jamais au
 * chargement. Un refus (iOS, iframe…) est sans conséquence.
 */
@Service()
export class FullscreenService {
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  enter(): void {
    if (!this.isBrowser || !this.doc.fullscreenEnabled || this.doc.fullscreenElement) return;
    this.doc.documentElement.requestFullscreen().catch(() => undefined);
  }

  exit(): void {
    if (!this.isBrowser || !this.doc.fullscreenElement) return;
    this.doc.exitFullscreen().catch(() => undefined);
  }
}

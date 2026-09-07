import { PLATFORM_ID, Service, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** `navigator.wakeLock` n'existe pas partout ; la lib DOM le déclare requis. */
type WakeLockNavigator = Navigator & {
  wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinel> };
};

/**
 * Empêche l'écran de s'éteindre pendant une session de crochet — on a les mains
 * prises, on ne peut pas réveiller l'appareil toutes les trente secondes.
 * L'API n'existe pas partout : `supported` permet de masquer la commande.
 */
@Service()
export class WakeLockService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private sentinel: WakeLockSentinel | null = null;

  readonly active = signal(false);
  readonly supported = signal(false);

  constructor() {
    if (this.isBrowser) {
      this.supported.set('wakeLock' in navigator);
      document.addEventListener('visibilitychange', () => void this.reacquire());
    }
  }

  async toggle(): Promise<void> {
    if (this.active()) {
      await this.release();
      return;
    }
    await this.request();
  }

  private async request(): Promise<void> {
    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock) return;
    try {
      this.sentinel = await nav.wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
        this.active.set(false);
      });
      this.active.set(true);
    } catch {
      this.supported.set(false);
    }
  }

  private async release(): Promise<void> {
    try {
      await this.sentinel?.release();
    } catch {
      /* le verrou avait déjà été relâché par le système */
    }
    this.sentinel = null;
    this.active.set(false);
  }

  /** Le système relâche le verrou dès que l'onglet passe en arrière-plan. */
  private async reacquire(): Promise<void> {
    if (document.visibilityState === 'visible' && this.active() && !this.sentinel) {
      await this.request();
    }
  }
}

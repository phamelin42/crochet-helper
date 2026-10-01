import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Service, computed, inject, signal } from '@angular/core';
import { AnalyticsService } from '../analytics/analytics.service';

export type InstallMode = 'prompt' | 'ios' | 'installed' | 'none';

/** Événement non standard de Chromium : pas dans `lib.dom`. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Safari sur iPhone et iPad : pas d'invite native, seulement « Sur l'écran
 * d'accueil » dans le menu Partager. iPadOS se déclare Mac : l'écran tactile
 * le distingue d'un vrai Mac. Les autres navigateurs iOS sont écartés, leur
 * menu n'est pas celui que la carte décrit.
 */
function isIosSafari(nav: Navigator): boolean {
  const ua = nav.userAgent;
  const apple =
    /iPhone|iPad|iPod/.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  return apple && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

/**
 * Dit s'il faut proposer d'installer l'application, et comment. Injecté par
 * la coquille dès le démarrage : `beforeinstallprompt` peut partir avant
 * qu'une page paresseuse soit chargée, et une invite manquée ne revient pas.
 */
@Service()
export class InstallService {
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly analytics = inject(AnalyticsService);

  private readonly deferred = signal<BeforeInstallPromptEvent | null>(null);
  private readonly installed = signal(false);
  private readonly ios = signal(false);

  readonly mode = computed<InstallMode>(() => {
    if (!this.isBrowser) return 'none';
    if (this.installed()) return 'installed';
    if (this.deferred()) return 'prompt';
    return this.ios() ? 'ios' : 'none';
  });

  constructor() {
    const win = this.doc.defaultView;
    if (!this.isBrowser || !win) return;

    const standalone =
      win.matchMedia?.('(display-mode: standalone)').matches === true ||
      (win.navigator as Navigator & { standalone?: boolean }).standalone === true;
    this.installed.set(standalone);
    this.ios.set(isIosSafari(win.navigator));

    win.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferred.set(event as BeforeInstallPromptEvent);
    });
    win.addEventListener('appinstalled', () => {
      this.analytics.track('app_installee');
      this.installed.set(true);
      this.deferred.set(null);
    });
  }

  /** Une invite ne sert qu'une fois : après la réponse, l'événement est jeté. */
  async install(): Promise<'accepted' | 'dismissed'> {
    const event = this.deferred();
    if (!event) return 'dismissed';
    this.deferred.set(null);
    this.analytics.track('installation_proposee', { mode: 'prompt' });
    await event.prompt();
    return (await event.userChoice).outcome;
  }
}

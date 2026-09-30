import { Component, computed, inject, signal } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { InstallService } from '../../../core/platform/install.service';
import { LocalStorageService } from '../../../core/storage/local-storage.service';
import { Button } from '../../../shared/ui/button/button';

/** Masquage définitif de la carte (« Plus tard »), valable pour tous les projets. */
const HIDDEN_KEY = 'fil.installHidden';

const COPY = {
  fr: {
    title: 'Gardez vos patrons sous la main',
    lead: 'Installez l’application : elle s’ouvre comme une appli et marche sans connexion. Vos patrons restent sur votre appareil.',
    install: 'Installer',
    later: 'Plus tard',
    iosBefore: 'Touchez',
    iosShare: 'Partager',
    iosAfter: 'puis « Sur l’écran d’accueil ».',
  },
  en: {
    title: 'Keep your patterns at hand',
    lead: 'Install the app: it opens like any app and works without a connection. Your patterns stay on your device.',
    install: 'Install',
    later: 'Later',
    iosBefore: 'Tap',
    iosShare: 'Share',
    iosAfter: 'then “Add to Home Screen”.',
  },
} as const;

/**
 * Carte d'installation de l'accueil et de « Mes projets ». Chargée par
 * `import()` depuis `InstallSlot` : le bundle initial n'en porte ni le texte
 * ni le service. Rien ne s'affiche quand l'appli est déjà installée ou que le
 * navigateur n'offre aucun moyen de le faire.
 */
@Component({
  selector: 'fil-install-card',
  imports: [Button],
  template: `
    @if (visible()) {
      <section class="card install-card" aria-labelledby="install-card-title">
        <h2 id="install-card-title" class="card-title">{{ copy().title }}</h2>
        <p>{{ copy().lead }}</p>
        @if (install.mode() === 'ios') {
          <p>
            {{ copy().iosBefore }}
            <strong>{{ copy().iosShare }}</strong>
            <svg class="install-share" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path
                d="M216 112v96a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16v-96a16 16 0 0 1 16-16h24a8 8 0 0 1 0 16H56v96h144v-96h-24a8 8 0 0 1 0-16h24a16 16 0 0 1 16 16ZM93.7 69.7 120 43.3V136a8 8 0 0 0 16 0V43.3l26.3 26.4a8 8 0 0 0 11.4-11.4l-40-40a8 8 0 0 0-11.4 0l-40 40a8 8 0 0 0 11.4 11.4Z"
              />
            </svg>
            {{ copy().iosAfter }}
          </p>
        }
        <div class="cta-row">
          @if (install.mode() === 'prompt') {
            <button type="button" filButton="primary" (click)="onInstall()">
              {{ copy().install }}
            </button>
          }
          <button type="button" filButton="ghost" (click)="onLater()">{{ copy().later }}</button>
        </div>
      </section>
    }
  `,
})
export class InstallCard {
  protected readonly install = inject(InstallService);
  private readonly storage = inject(LocalStorageService);
  private readonly i18n = inject(I18nService);

  protected readonly copy = computed(() => COPY[this.i18n.locale()]);
  private readonly hidden = signal(this.storage.read<boolean>(HIDDEN_KEY) === true);

  protected readonly visible = computed(
    () => !this.hidden() && (this.install.mode() === 'prompt' || this.install.mode() === 'ios'),
  );

  protected async onInstall(): Promise<void> {
    await this.install.install();
  }

  protected onLater(): void {
    this.hidden.set(true);
    this.storage.write(HIDDEN_KEY, true);
  }
}

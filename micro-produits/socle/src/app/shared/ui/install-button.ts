import { Component, inject, signal } from '@angular/core';
import { InstallService } from '../../core/platform/install.service';

/**
 * Invite d'installation visible dans l'en-tête : bouton natif quand le
 * navigateur le permet, mode d'emploi court sur iPhone et iPad (Safari n'a
 * pas d'invite). Rien côté serveur ni une fois l'application installée.
 */
@Component({
  selector: 'app-install-button',
  template: `
    @switch (install.mode()) {
      @case ('prompt') {
        <button type="button" class="btn btn-secondary" (click)="installer()">
          Installer l'application
        </button>
      }
      @case ('ios') {
        <button
          type="button"
          class="btn btn-secondary"
          [attr.aria-expanded]="aideOuverte()"
          aria-controls="aide-installation"
          (click)="aideOuverte.set(!aideOuverte())"
        >
          Installer l'application
        </button>
        @if (aideOuverte()) {
          <p id="aide-installation" class="install-help">
            Touchez le bouton Partager, puis «&nbsp;Sur l'écran d'accueil&nbsp;».
          </p>
        }
      }
    }
  `,
})
export class InstallButton {
  protected readonly install = inject(InstallService);
  protected readonly aideOuverte = signal(false);

  protected installer(): void {
    void this.install.install();
  }
}

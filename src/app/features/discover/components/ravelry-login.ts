import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { RAVELRY_CLIENT_ID_TOKEN } from '../../../core/ravelry/ravelry-connection-config';
import { RavelrySession } from '../../../core/ravelry/ravelry-session.service';
import { RavelryConnection } from '../../../shared/ui/ravelry-connection/ravelry-connection';
import { CONNECT_COPY, RAVELRY_JOIN_URL } from '../data/connect-copy';

/**
 * Écran « Se connecter avec Ravelry » : pourquoi (règle de Ravelry), ce que
 * Pattern Reader voit, ce qu'il ne fait pas, et un lien pour créer un compte.
 * Affiché à la place de la recherche et de la fiche tant que l'accès est réservé
 * aux lectrices connectées (mode `compte`, ADR-004).
 */
@Component({
  selector: 'fil-ravelry-login',
  imports: [RavelryConnection],
  template: `
    <section class="connect-panel" aria-labelledby="connect-title">
      <h2 id="connect-title">{{ c.loginTitle }}</h2>
      <p>{{ c.loginWhy }}</p>
      <h3>{{ c.seesTitle }}</h3>
      <p>{{ c.sees }}</p>
      <h3>{{ c.neverTitle }}</h3>
      <p>{{ c.never }}</p>

      @if (available) {
        <fil-ravelry-connection
          [connectLabel]="expired() ? c.reconnect : c.connect"
          [busyLabel]="c.connecting"
          [connectedLabel]="c.connected"
          [disconnectLabel]="c.disconnect"
          [busy]="busy()"
          [message]="message()"
          (connect)="connect()"
        />
      } @else {
        <p role="status">{{ c.unavailable }}</p>
      }
      @if (failed()) {
        <p role="alert" class="discover-alert">{{ c.unavailable }}</p>
      }
      <p>
        <a [href]="joinUrl" target="_blank" rel="noopener noreferrer">
          {{ c.createAccount }}
          <span class="visually-hidden">{{ c.newTab }}</span>
        </a>
      </p>
    </section>
  `,
})
export class RavelryLogin {
  private readonly session = inject(RavelrySession);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  protected readonly c = CONNECT_COPY[this.i18n.locale()];
  protected readonly joinUrl = RAVELRY_JOIN_URL;
  protected readonly available = inject(RAVELRY_CLIENT_ID_TOKEN) !== '';
  protected readonly expired = this.session.expired;
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  /** « Votre connexion a expiré » ou « Vous êtes déconnectée » : dit une fois, en haut de l'écran. */
  protected readonly message = computed(() =>
    this.session.expired() ? this.c.expired : this.session.farewell() ? this.c.disconnected : '',
  );

  protected async connect(): Promise<void> {
    this.busy.set(true);
    this.failed.set(false);
    // Le retour ramène à la page d'où l'on part (langue comprise).
    const started = await this.session.begin(this.router.url);
    if (!started) {
      this.busy.set(false);
      this.failed.set(true);
    }
  }
}

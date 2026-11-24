import { Component, input, output } from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';

/**
 * État de la connexion à Ravelry : « Connectée à Ravelry » avec « Se déconnecter »,
 * ou « Se connecter avec Ravelry ». Sans logique : l'appelant connecte et déconnecte,
 * et passe les libellés. L'état se dit en mots (coche et texte), jamais par la
 * couleur seule ; une région `role="status"` annonce le message qui suit un changement.
 */
@Component({
  selector: 'fil-ravelry-connection',
  imports: [Button, Icon],
  template: `
    <div class="ravelry-connection">
      @if (connected()) {
        <p class="ravelry-connection-state">
          <fil-icon name="check" />
          {{ connectedLabel() }}
        </p>
        <button type="button" filButton="secondary" (click)="disconnect.emit()">
          {{ disconnectLabel() }}
        </button>
      } @else {
        <button type="button" filButton="primary" [disabled]="busy()" (click)="connect.emit()">
          {{ busy() ? busyLabel() : connectLabel() }}
        </button>
      }
    </div>
    <div role="status">
      @if (message()) {
        <p class="ravelry-connection-message">{{ message() }}</p>
      }
    </div>
  `,
})
export class RavelryConnection {
  readonly connected = input(false);
  /** Redirection en cours : le bouton se désactive et le dit. */
  readonly busy = input(false);
  readonly connectLabel = input.required<string>();
  readonly busyLabel = input('');
  readonly connectedLabel = input.required<string>();
  readonly disconnectLabel = input.required<string>();
  /** Annonce visible et vocale : « Vous êtes déconnectée… », « Votre connexion a expiré. » */
  readonly message = input('');

  readonly connect = output<void>();
  readonly disconnect = output<void>();
}

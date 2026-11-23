import { Component, computed, input, output, signal } from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';

/**
 * Bouton « Ajouter à mes favoris » / « Retirer de mes favoris ». Le libellé
 * visible dit l'action et change avec l'état (jamais le cœur seul, jamais la
 * couleur seule) ; une région `role="status"` annonce le résultat.
 */
@Component({
  selector: 'fil-favorite-button',
  imports: [Button, Icon],
  template: `
    <button type="button" filButton="secondary" (click)="toggle()">
      <fil-icon [name]="active() ? 'heartFill' : 'heart'" />
      {{ active() ? removeLabel() : addLabel() }}
    </button>
    <span class="visually-hidden" role="status">{{ message() }}</span>
  `,
})
export class FavoriteButton {
  /** Le patron est-il déjà un favori ? */
  readonly active = input(false);
  readonly addLabel = input.required<string>();
  readonly removeLabel = input.required<string>();
  /** Annonce après l'ajout, après le retrait. */
  readonly addedMessage = input('');
  readonly removedMessage = input('');
  /** La personne a cliqué : l'appelant enregistre et change `active`. */
  readonly toggled = output<boolean>();

  private readonly announced = signal<'added' | 'removed' | null>(null);
  protected readonly message = computed(() =>
    this.announced() === 'added'
      ? this.addedMessage()
      : this.announced() === 'removed'
        ? this.removedMessage()
        : '',
  );

  protected toggle(): void {
    const next = !this.active();
    this.announced.set(next ? 'added' : 'removed');
    this.toggled.emit(next);
  }
}

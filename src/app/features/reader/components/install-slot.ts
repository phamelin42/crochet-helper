import { NgComponentOutlet } from '@angular/common';
import { Component, Type, afterNextRender, signal } from '@angular/core';

/**
 * Emplacement de la carte d'installation. Le navigateur seul sait s'il offre
 * l'installation : rien n'existe au pré-rendu, et la carte (texte et service)
 * arrive par `import()` après le premier affichage, hors du bundle initial.
 */
@Component({
  selector: 'fil-install-slot',
  imports: [NgComponentOutlet],
  template: `
    @if (card(); as component) {
      <ng-container *ngComponentOutlet="component" />
    }
  `,
})
export class InstallSlot {
  protected readonly card = signal<Type<unknown> | null>(null);

  constructor() {
    afterNextRender(() => {
      void import('./install-card').then((m) => this.card.set(m.InstallCard));
    });
  }
}

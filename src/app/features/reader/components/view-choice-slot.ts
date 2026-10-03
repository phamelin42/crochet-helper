import { NgComponentOutlet } from '@angular/common';
import { Component, Type, effect, inject, signal } from '@angular/core';
import { ReaderStore } from '../state/reader-store';

/**
 * Emplacement de la question « étapes écrites ou diagramme ? ». Rien n'existe
 * tant qu'aucun import n'a posé la question : la boîte (texte et composants)
 * arrive alors par `import()`, hors du bundle initial.
 */
@Component({
  selector: 'fil-view-choice-slot',
  imports: [NgComponentOutlet],
  template: `
    @if (dialog(); as component) {
      <ng-container *ngComponentOutlet="component" />
    }
  `,
})
export class ViewChoiceSlot {
  private readonly store = inject(ReaderStore);
  protected readonly dialog = signal<Type<unknown> | null>(null);

  constructor() {
    effect(() => {
      if (this.store.viewChoice() && !this.dialog()) {
        void import('./view-choice-dialog').then((m) => this.dialog.set(m.ViewChoiceDialog));
      }
    });
  }
}

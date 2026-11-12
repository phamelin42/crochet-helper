import { NgComponentOutlet } from '@angular/common';
import { Component, Type, effect, inject, output, signal } from '@angular/core';
import { ReaderStore } from '../state/reader-store';
import { StepView } from './step-view';

/**
 * L'étape en cours, ou l'écran de fin quand le patron est terminé. L'écran
 * (composant, textes, feuille `fin.css`) arrive par `import()`, hors du bundle
 * initial : on le charge dès la dernière étape, pour qu'il soit prêt quand la
 * lectrice la coche — et l'étape reste affichée tant qu'il ne l'est pas.
 */
@Component({
  selector: 'fil-finish-slot',
  imports: [NgComponentOutlet, StepView],
  template: `
    @if (store.endScreenVisible() && screen(); as component) {
      <ng-container *ngComponentOutlet="component" />
    } @else {
      <fil-step-view (changePattern)="changePattern.emit()" />
    }
  `,
})
export class FinishSlot {
  protected readonly store = inject(ReaderStore);
  protected readonly screen = signal<Type<unknown> | null>(null);

  readonly changePattern = output<void>();

  constructor() {
    effect(() => {
      const nearEnd =
        this.store.endScreenVisible() || (!!this.store.step() && !this.store.hasNext());
      if (nearEnd && !this.screen()) {
        void import('./finish-view').then((m) => this.screen.set(m.FinishView));
      }
    });
  }
}

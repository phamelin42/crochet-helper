import {
  Component,
  ElementRef,
  afterNextRender,
  effect,
  input,
  model,
  viewChild,
} from '@angular/core';

/**
 * Boîte de dialogue modale bâtie sur `<dialog>` natif : le piège de focus, la
 * fermeture à Échap, l'inertie du fond et le retour du focus à l'ouvrant sont
 * fournis par le navigateur — rien à réimplémenter.
 *
 * La fermeture au clic sur le fond est posée à la main sur l'élément plutôt que
 * dans le gabarit : c'est un raccourci souris dont l'équivalent clavier est
 * Échap, il n'a donc pas à rendre le fond focalisable.
 */
@Component({
  selector: 'fil-dialog',
  template: `
    <dialog #root [attr.aria-label]="label()" (close)="open.set(false)">
      <div class="dialog" [class.zoom]="wide()">
        <ng-content />
      </div>
    </dialog>
  `,
  styles: `
    dialog {
      border: 0;
      padding: var(--space-4);
      background: transparent;
      max-width: 100vw;
      max-height: 100vh;
      color: inherit;
    }
    dialog::backdrop {
      background: color-mix(in srgb, #292b31 60%, transparent);
    }
  `,
})
export class Dialog {
  readonly open = model.required<boolean>();
  readonly label = input('');
  readonly wide = input(false);

  private readonly root = viewChild.required<ElementRef<HTMLDialogElement>>('root');

  constructor() {
    afterNextRender(() => {
      const element = this.root().nativeElement;
      element.addEventListener('click', (event) => {
        if (event.target === element) this.open.set(false);
      });
    });

    effect(() => {
      const element = this.root().nativeElement;
      if (this.open()) {
        if (!element.open) element.showModal();
      } else if (element.open) {
        element.close();
      }
    });
  }
}

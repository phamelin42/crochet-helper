import { Component, ElementRef, afterRenderEffect, inject, signal, viewChild } from '@angular/core';
import { TooltipService } from './tooltip.service';

/**
 * Rend l'infobulle unique de l'application. Placée une fois dans la coquille ;
 * `aria-live` la fait annoncer aux lecteurs d'écran sans voler le focus.
 */
@Component({
  selector: 'fil-tooltip-host',
  host: {
    '(document:pointerdown)': 'tooltips.notePress($event)',
    '(document:keydown.escape)': 'dismiss($event)',
  },
  template: `
    <div
      #box
      class="tip"
      [class.on]="!!state()"
      role="status"
      aria-live="polite"
      [attr.aria-hidden]="state()?.labelled ? 'true' : null"
      [style.left.px]="position().left"
      [style.top.px]="position().top"
    >
      @if (state(); as tip) {
        <b>{{ tip.term }}</b> — {{ tip.definition }}
      }
    </div>
  `,
})
export class TooltipHost {
  protected readonly tooltips = inject(TooltipService);
  private readonly box = viewChild<ElementRef<HTMLDivElement>>('box');

  protected readonly state = this.tooltips.state;

  protected readonly position = signal({ left: 0, top: 0 });

  /** Échap ferme l'infobulle ouverte et s'arrête là (WCAG 1.4.13) : le geste est
   *  consommé, la page pleine ou le dialogue ne le reçoivent pas. */
  protected dismiss(event: Event): void {
    if (!this.state()) return;
    event.preventDefault();
    this.tooltips.hide();
  }

  constructor() {
    // Après le rendu : la taille de l'infobulle dépend du terme qu'elle vient
    // d'afficher. La mesurer avant la décalait du mot, du côté de l'ancienne.
    afterRenderEffect(() => {
      const tip = this.state();
      const box = this.box()?.nativeElement;
      if (!tip || !box) return;
      const { offsetWidth: width, offsetHeight: height } = box;
      this.position.set({
        left: Math.max(8, Math.min(window.innerWidth - width - 8, tip.x - width / 2)),
        top: tip.above ? tip.y - height - 8 : tip.y + 28,
      });
    });
  }
}

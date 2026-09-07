import { Component, ElementRef, computed, inject, viewChild } from '@angular/core';
import { TooltipService } from './tooltip.service';

/**
 * Rend l'infobulle unique de l'application. Placée une fois dans la coquille ;
 * `aria-live` la fait annoncer aux lecteurs d'écran sans voler le focus.
 */
@Component({
  selector: 'fil-tooltip-host',
  template: `
    <div
      #box
      class="tip"
      [class.on]="!!state()"
      role="status"
      aria-live="polite"
      [style.left.px]="left()"
      [style.top.px]="top()"
    >
      @if (state(); as tip) {
        <b>{{ tip.term }}</b> — {{ tip.definition }}
      }
    </div>
  `,
})
export class TooltipHost {
  private readonly tooltips = inject(TooltipService);
  private readonly box = viewChild<ElementRef<HTMLDivElement>>('box');

  protected readonly state = this.tooltips.state;

  protected readonly left = computed(() => {
    const tip = this.state();
    if (!tip) return 0;
    const width = this.box()?.nativeElement.offsetWidth ?? 0;
    return Math.max(8, Math.min(window.innerWidth - width - 8, tip.x - width / 2));
  });

  protected readonly top = computed(() => {
    const tip = this.state();
    if (!tip) return 0;
    const height = this.box()?.nativeElement.offsetHeight ?? 0;
    return tip.above ? tip.y - height - 8 : tip.y + 28;
  });
}

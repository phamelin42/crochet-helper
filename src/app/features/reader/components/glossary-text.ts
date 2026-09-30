import { Component, computed, inject, input } from '@angular/core';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TooltipService } from '../../../shared/ui/tooltip/tooltip.service';
import { annotate } from '../data/glossary';

/**
 * Affiche un texte de patron en soulignant les abréviations connues, chacune
 * porteuse de sa définition.
 *
 * Le texte vient de l'utilisateur : il est rendu en segments par `@for`, jamais
 * via `innerHTML`, donc rien de ce qui est collé ne peut être interprété comme
 * du balisage.
 *
 * Chaque segment neutre est enveloppé d'un `ng-container` : sans lui, les
 * retours à la ligne du gabarit deviennent des espaces autour du texte, et
 * « st, inc » s'affiche « st , inc ».
 */
@Component({
  selector: 'fil-glossary-text',
  template: `@for (segment of segments(); track $index) {
    @if (segment.definition) {
      <span
        class="abbr"
        tabindex="0"
        role="button"
        [attr.aria-label]="segment.text + ' : ' + segment.definition"
        (pointerenter)="show($event, segment.text, segment.definition)"
        (pointerleave)="tooltips.hide()"
        (focus)="show($event, segment.text, segment.definition)"
        (blur)="tooltips.hide()"
        (click)="show($event, segment.text, segment.definition)"
        >{{ segment.text }}</span
      >
    } @else {
      <ng-container>{{ segment.text }}</ng-container>
    }
  }`,
})
export class GlossaryText {
  protected readonly tooltips = inject(TooltipService);
  private readonly i18n = inject(I18nService);
  private readonly analytics = inject(AnalyticsService);

  readonly text = input.required<string>();

  protected readonly segments = computed(() => annotate(this.text(), this.i18n.locale()));

  protected show(event: Event, term: string, definition: string): void {
    if (this.tooltips.isStationaryHover(event)) return;
    this.analytics.track('glossary_hover');
    this.tooltips.showFor(event.target as HTMLElement, term, definition);
  }
}

import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TooltipService } from '../../../shared/ui/tooltip/tooltip.service';
import { annotate, expand } from '../data/glossary';
import { ReaderStore } from '../state/reader-store';

/**
 * Affiche un texte de patron en soulignant les abréviations connues, chacune
 * porteuse de sa définition.
 *
 * Le texte vient de l'utilisateur : il est rendu en segments par `@for`, jamais
 * via `innerHTML`, donc rien de ce qui est collé ne peut être interprété comme
 * du balisage.
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
      {{ segment.text }}
    }
  }`,
})
export class GlossaryText {
  protected readonly tooltips = inject(TooltipService);
  private readonly i18n = inject(I18nService);

  private readonly store = inject(ReaderStore);

  readonly text = input.required<string>();

  /**
   * En mode « abréviations développées », le texte est réécrit avant d'être
   * segmenté : plus rien n'est alors souligné, puisque plus rien n'est abrégé.
   */
  protected readonly segments = computed(() => {
    const locale = this.i18n.locale();
    return this.store.expandAbbreviations()
      ? [{ text: expand(this.text(), locale) }]
      : annotate(this.text(), locale);
  });

  protected show(event: Event, term: string, definition: string): void {
    this.tooltips.showFor(event.target as HTMLElement, term, definition);
  }
}

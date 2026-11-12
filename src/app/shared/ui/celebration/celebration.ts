import { Component, ElementRef, afterNextRender, inject, input, viewChild } from '@angular/core';
import { StylesheetService } from '../../../core/platform/stylesheet.service';

/**
 * Écran de célébration : un titre chaleureux, un sous-titre, quelques faits,
 * une image (projetée avec `celebrationVisual`) et des actions (contenu
 * projeté). Présentation seule : rien ne sait ce qu'on célèbre.
 *
 * Le titre reçoit le focus à l'apparition — la lectrice au clavier ou au
 * lecteur d'écran arrive sur la bonne nouvelle, pas sur le bouton « Suivante »
 * qui vient de disparaître — et l'en-tête est une région `status`. Ses règles
 * vivent dans `fin.css`, hors du bundle initial : seule une lectrice qui
 * termine un patron en a besoin.
 */
@Component({
  selector: 'fil-celebration',
  template: `
    <section class="celebration" [attr.aria-label]="title()">
      <div class="celebration-head" role="status">
        <h2 #heading class="celebration-title" tabindex="-1">{{ title() }}</h2>
        @if (subtitle()) {
          <p class="celebration-subtitle">{{ subtitle() }}</p>
        }
        @if (facts().length) {
          <ul class="celebration-facts">
            @for (fact of facts(); track fact) {
              <li>{{ fact }}</li>
            }
          </ul>
        }
      </div>
      <div class="celebration-visual">
        <ng-content select="[celebrationVisual]" />
      </div>
      <ng-content select="[celebrationNote]" />
      <div class="celebration-actions">
        <ng-content />
      </div>
    </section>
  `,
})
export class Celebration {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly facts = input<readonly string[]>([]);
  /** Pose le focus sur le titre à l'apparition (la vitrine le coupe, pour ne pas voler la page). */
  readonly takeFocus = input(true);

  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  constructor() {
    void inject(StylesheetService).load('fin.css');
    afterNextRender(() => {
      if (this.takeFocus()) this.heading().nativeElement.focus();
    });
  }
}

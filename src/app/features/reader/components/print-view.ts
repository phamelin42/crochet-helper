import { Component, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ReaderStore } from '../state/reader-store';
import { GlossaryText } from './glossary-text';

/**
 * Rendu complet du patron pour l'impression : toutes les pièces, toutes les
 * étapes. Toujours présent dans le DOM, masqué à l'écran par `print.css` — le
 * livret imprimé ne se fabrique pas au moment d'imprimer, il existe déjà.
 */
@Component({
  selector: 'fil-print-view',
  imports: [GlossaryText],
  host: { class: 'print-only' },
  template: `
    @if (store.total()) {
      @if (store.materials().length) {
        <section class="print-materials">
          <h2>{{ t('ui.mats') }}</h2>
          <ul>
            @for (item of store.materials(); track $index) {
              <li><fil-glossary-text [text]="item" /></li>
            }
          </ul>
        </section>
      }

      @for (piece of store.pieces(); track $index) {
        <section class="print-piece">
          @if (piece.name) {
            <h2>{{ piece.name }}</h2>
          }
          <ol>
            @for (step of piece.steps; track $index) {
              <li>
                @if (step.label) {
                  <strong>{{ step.label }}</strong
                  >{{ ' ' }}
                }
                <fil-glossary-text [text]="step.body" />
              </li>
            }
          </ol>
        </section>
      }

      <footer class="print-footer">
        {{ store.pattern().title || store.currentName() }} — {{ store.total() }}
        {{ t('ui.allSteps') }}
      </footer>
    }
  `,
})
export class PrintView {
  protected readonly store = inject(ReaderStore);
  private readonly i18n = inject(I18nService);

  protected t = (key: Parameters<I18nService['t']>[0]) => this.i18n.t(key);
}

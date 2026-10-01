import { Component, inject } from '@angular/core';
import { ThemeService } from '@mp/core';

/** Bouton explicite du thème sombre, affiché seulement si le produit le propose. */
@Component({
  selector: 'mp-theme-toggle',
  template: `
    @if (theme.disponible) {
      <button
        type="button"
        class="btn btn-secondary"
        [attr.aria-pressed]="theme.sombre()"
        (click)="theme.basculer()"
      >
        Fond sombre
      </button>
    }
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
}

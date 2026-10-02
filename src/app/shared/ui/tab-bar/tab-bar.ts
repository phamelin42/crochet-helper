import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon, IconName } from '../icon/icon';

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  readonly href: string;
}

/**
 * Barre d'onglets d'application : icône **et** libellé toujours visibles (le
 * public a de 50 à 70 ans, jamais d'icône seule). Chaque onglet est un vrai
 * lien, donc une entrée d'historique : le bouton retour d'Android revient à
 * l'onglet précédent. L'ancrage en bas d'écran est l'affaire de l'appelant.
 */
@Component({
  selector: 'fil-tab-bar',
  imports: [Icon, RouterLink],
  template: `
    <nav class="tab-bar" [attr.aria-label]="label()">
      @for (tab of tabs(); track tab.id) {
        <a
          class="tab"
          [routerLink]="tab.href"
          [attr.aria-current]="tab.id === current() ? 'page' : null"
          (click)="selected.emit(tab.id)"
        >
          <fil-icon [name]="tab.icon" />
          <span>{{ tab.label }}</span>
        </a>
      }
    </nav>
  `,
})
export class TabBar {
  readonly tabs = input.required<readonly TabItem[]>();
  /** Identifiant de l'onglet affiché, `null` quand l'écran n'est dans aucun onglet. */
  readonly current = input<string | null>(null);
  readonly label = input('');
  readonly selected = output<string>();
}

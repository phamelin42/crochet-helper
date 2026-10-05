import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Un niveau du fil d'Ariane ; le dernier, la page courante, n'a pas de lien. */
export interface Crumb {
  readonly label: string;
  readonly href: string;
}

/**
 * Fil d'Ariane visible, au-dessus du titre d'une page de contenu. Il double
 * la `BreadcrumbList` des données structurées (`core/seo/breadcrumbs.ts`),
 * construite à partir des mêmes niveaux : le balisage ne décrit que ce que la
 * page montre.
 */
@Component({
  selector: 'fil-breadcrumb',
  imports: [RouterLink],
  template: `
    <nav class="breadcrumb" [attr.aria-label]="label()">
      <ol>
        @for (crumb of items(); track crumb.href; let last = $last) {
          <li>
            @if (last) {
              <span aria-current="page">{{ crumb.label }}</span>
            } @else {
              <a [routerLink]="crumb.href">{{ crumb.label }}</a>
            }
          </li>
        }
      </ol>
    </nav>
  `,
})
export class Breadcrumb {
  readonly items = input.required<readonly Crumb[]>();
  /** Nom accessible du repère de navigation, dans la langue de la page. */
  readonly label = input.required<string>();
}

import { Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';

/**
 * Carte d'un patron : vignette, nom (lien vers sa fiche), créatrice, pastille.
 * La vignette est une `<img>` native à dimensions fixes (pas de décalage) ; elle
 * cède la place à un espace réservé quand elle manque ou ne se charge pas
 * (hors ligne, adresse périmée) : la carte garde sa forme, sans trou.
 * Le contenu projeté (bouton favori, mentions) vient sous la carte.
 */
@Component({
  selector: 'fil-pattern-card',
  imports: [Icon, RouterLink],
  template: `
    <article class="card pattern-card">
      <div class="pattern-card-media">
        @if (thumbnail() && !failed()) {
          <img
            [src]="thumbnail()"
            [alt]="name()"
            width="240"
            height="180"
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
            (error)="failed.set(true)"
          />
        } @else {
          <span class="pattern-card-placeholder" aria-hidden="true">
            <fil-icon name="image" />
          </span>
        }
      </div>
      <h3 class="card-title">
        <a [routerLink]="link()" [queryParams]="queryParams()">{{ name() }}</a>
      </h3>
      <p class="card-meta">
        @if (designer()) {
          <span>{{ designer() }}</span>
        }
        @if (tag()) {
          <span class="tag tag-wakaba">{{ tag() }}</span>
        }
      </p>
      <ng-content />
    </article>
  `,
})
export class PatternCard {
  readonly name = input.required<string>();
  /** Déjà mise en forme (« par Camille ») ; vide, la ligne n'affiche pas de créatrice. */
  readonly designer = input('');
  readonly thumbnail = input<string | null>(null);
  readonly link = input.required<string>();
  readonly queryParams = input<Record<string, string>>({});
  /** Pastille (« Gratuit ») ; vide, rien. */
  readonly tag = input('');

  protected readonly failed = signal(false);
}

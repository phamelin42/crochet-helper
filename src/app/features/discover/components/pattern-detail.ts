import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SessionStorageService } from '../../../core/storage/session-storage.service';
import { Button } from '../../../shared/ui/button/button';
import { FavoriteButton } from '../../../shared/ui/favorite-button/favorite-button';
import { DISCOVER_COPY } from '../data/discover-copy';
import { PatternOrigin, RAVELRY_START_KEY } from '../data/favorite.model';
import { DiscoverStore } from '../state/discover-store';
import { FavoritesStore } from '../state/favorites-store';
import { PatternGallery } from './pattern-gallery';
import { PatternProjects } from './pattern-projects';

/**
 * Fiche d'un patron gratuit : photos, texte brut de description (rendu par
 * paragraphes, jamais comme HTML), attribution, favori et « Commencer ce
 * patron ». Ravelry ne donne pas le texte des instructions : la lectrice dépose
 * le PDF ou colle le texte dans le lecteur (import guidé, ADR-004).
 */
@Component({
  selector: 'fil-pattern-detail',
  imports: [Button, FavoriteButton, PatternGallery, PatternProjects, RouterLink],
  template: `
    <p>
      <a [routerLink]="backLink()" [queryParams]="backParams()">← {{ backLabel() }}</a>
    </p>

    @switch (store.detailStatus()) {
      @case ('loading') {
        <p role="status">{{ c.detailLoading }}</p>
      }
      @case ('error') {
        <div role="alert" class="discover-alert">
          <p>{{ c.detailRefusal(store.detailError() ?? 'indisponible') }}</p>
          <button type="button" filButton="secondary" (click)="load()">{{ c.retry }}</button>
        </div>
      }
      @case ('ok') {
        @if (store.detail(); as d) {
          <article class="discover-detail">
            <p class="discover-by">
              @if (d.designer) {
                {{ c.by(d.designer) }}
              }
              <span class="tag tag-wakaba">{{ c.free }}</span>
            </p>

            <fil-pattern-gallery
              [photos]="d.photos"
              [name]="d.nom"
              [groupLabel]="c.photosOf(d.nom)"
              [photoLabel]="photoLabel"
            />

            <dl class="discover-facts">
              @if (d.craft) {
                <dt>{{ c.craft }}</dt>
                <dd>{{ d.craft }}</dd>
              }
              @if (d.poidsFil) {
                <dt>{{ c.yarnWeight }}</dt>
                <dd>{{ d.poidsFil }}</dd>
              }
              @if (difficulty(); as value) {
                <dt>{{ c.difficulty }}</dt>
                <dd>{{ value }}</dd>
              }
            </dl>

            <div class="discover-actions">
              <fil-favorite-button
                [active]="favorites.has(idText())"
                [addLabel]="c.addFavorite"
                [removeLabel]="c.removeFavorite"
                [addedMessage]="c.added"
                [removedMessage]="c.removed"
                (toggled)="toggleFavorite($event)"
              />
              <a
                filButton="primary"
                [href]="startUrl()"
                target="_blank"
                rel="noopener noreferrer"
                (click)="start()"
              >
                {{ c.start }}
                <span class="visually-hidden">{{ c.newTab }}</span>
              </a>
            </div>
            @if (favorites.failed()) {
              <p role="alert" class="discover-alert">{{ c.saveFailed }}</p>
            }

            <h2>{{ c.descriptionTitle }}</h2>
            @for (paragraph of paragraphs(); track $index) {
              <p class="discover-text">{{ paragraph }}</p>
            } @empty {
              <p>{{ c.noDescription }}</p>
            }

            <h2>{{ c.howTitle }}</h2>
            <p>{{ c.how }}</p>
            <p>
              <a [href]="d.lien" target="_blank" rel="noopener noreferrer">
                {{ c.seeOnRavelry }} {{ c.newTab }}
              </a>
            </p>

            <fil-pattern-projects [id]="id()" />
          </article>
        }
      }
    }
  `,
})
export class PatternDetail {
  protected readonly store = inject(DiscoverStore);
  protected readonly favorites = inject(FavoritesStore);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly session = inject(SessionStorageService);
  private readonly analytics = inject(AnalyticsService);

  readonly id = input.required<number>();
  /** Adresse des résultats d'où l'on vient (ou de la recherche vide). */
  readonly backParams = input<Record<string, string>>({});

  protected readonly c = DISCOVER_COPY[this.i18n.locale()];
  protected readonly idText = computed(() => String(this.id()));
  protected readonly backLink = computed(() => this.i18n.link('findPattern'));
  protected readonly backLabel = computed(() =>
    this.backParams()['q'] ? this.c.back : this.c.backToSearch,
  );
  protected readonly paragraphs = computed(() =>
    (this.store.detail()?.description ?? '')
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean),
  );
  protected readonly difficulty = computed(() => {
    const value = this.store.detail()?.difficulte;
    return value == null
      ? ''
      : value.toLocaleString(this.i18n.locale(), { maximumFractionDigits: 1 });
  });
  /** Le PDF de Ravelry s'il existe, sinon la page de la créatrice, sinon la page Ravelry. */
  protected readonly startUrl = computed(() => {
    const d = this.store.detail();
    return d ? (d.telechargement ?? d.source ?? d.lien) : '';
  });
  protected readonly photoLabel = (i: number, n: number) =>
    this.c.photo(i, n, this.store.detail()?.nom ?? '');

  constructor() {
    effect(() => {
      const id = this.id();
      // Sans `untracked`, l'effet suit les signaux d'état que `openPattern` lit et se relance
      // à chaque changement : un refus rechargeait la fiche sans fin.
      untracked(() => void this.store.openPattern(id));
    });
    void this.favorites.load();
  }

  protected load(): void {
    void this.store.openPattern(this.id());
  }

  protected toggleFavorite(wanted: boolean): void {
    const d = this.store.detail();
    if (!d) return;
    if (!wanted) {
      void this.favorites.remove(String(d.id));
      return;
    }
    void this.favorites
      .add({
        id: String(d.id),
        name: d.nom,
        designer: d.designer,
        thumbnail: d.photos[0] ?? null,
        permalink: d.lien,
      })
      .then((written) => {
        if (written) this.analytics.track('favorite_added');
      });
  }

  /**
   * Le lien s'ouvre dans un nouvel onglet (comportement natif) ; cet onglet-ci
   * passe au lecteur, qui attend le PDF ou le texte et sait de quel patron il vient.
   */
  protected start(): void {
    const d = this.store.detail();
    if (!d) return;
    const origin: PatternOrigin = {
      source: 'ravelry',
      id: String(d.id),
      name: d.nom,
      designer: d.designer,
      permalink: d.lien,
      photoUrl: d.photos[0] ?? null,
    };
    this.session.write(RAVELRY_START_KEY, JSON.stringify(origin));
    this.analytics.track('pattern_started');
    void this.router.navigateByUrl(this.i18n.link('reader'));
  }
}

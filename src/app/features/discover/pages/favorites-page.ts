import { Component, afterNextRender, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale } from '../../../core/i18n/locale';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { RavelryAccess } from '../../../core/ravelry/ravelry-access';
import { SeoService } from '../../../core/seo/seo.service';
import { Button } from '../../../shared/ui/button/button';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { PatternCard } from '../../../shared/ui/pattern-card/pattern-card';
import { RavelryNote } from '../components/ravelry-note';
import { DISCOVER_COPY } from '../data/discover-copy';
import { Favorite } from '../data/favorite.model';
import { FavoritesStore } from '../state/favorites-store';

/**
 * « Mes favoris » : les patrons mis de côté sur l'appareil. La liste vient
 * d'IndexedDB, donc s'affiche sans réseau ; une vignette absente laisse un
 * espace réservé. Toute suppression passe par une confirmation. Cachée, comme
 * la recherche, tant que l'interrupteur est éteint.
 */
@Component({
  selector: 'fil-favorites-page',
  imports: [Button, Dialog, PatternCard, RavelryNote, RouterLink],
  host: { class: 'wrap' },
  template: `
    <article class="discover">
      <h1>{{ c.favH1 }}</h1>

      @if (!enabled) {
        <p class="discover-lead">{{ c.soon }}</p>
        <p>
          <a filButton="secondary" [routerLink]="i18n.link('reader')">{{ c.soonHome }}</a>
        </p>
      } @else {
        <p class="discover-lead">{{ c.favIntro }}</p>

        <div class="discover-status" role="status">
          @if (!store.loaded()) {
            {{ c.favLoading }}
          } @else if (store.items().length) {
            {{ c.favCount(store.items().length) }}
          }
        </div>

        @if (store.loaded()) {
          @if (store.items().length) {
            <ul class="discover-grid">
              @for (favorite of store.sorted(); track favorite.id) {
                <li>
                  <fil-pattern-card
                    [name]="favorite.name"
                    [designer]="favorite.designer ? c.by(favorite.designer) : ''"
                    [thumbnail]="favorite.thumbnail"
                    [link]="i18n.link('findPattern')"
                    [queryParams]="{ id: favorite.id }"
                  >
                    <button
                      type="button"
                      filButton="secondary"
                      [attr.aria-label]="c.removeOne(favorite.name)"
                      (click)="askRemove(favorite)"
                    >
                      {{ c.remove }}
                    </button>
                  </fil-pattern-card>
                </li>
              }
            </ul>
            <p>
              <button type="button" filButton="ghost" (click)="removeAllOpen.set(true)">
                {{ c.removeAll }}
              </button>
            </p>
          } @else {
            <p>{{ c.favEmpty }}</p>
            <p>
              <a filButton="primary" [routerLink]="i18n.link('findPattern')">{{ c.favSearch }}</a>
            </p>
          }
        }
        @if (store.failed()) {
          <p role="alert" class="discover-alert">{{ c.saveFailed }}</p>
        }
        <fil-ravelry-note [text]="c.note" />
      }

      <fil-dialog [(open)]="removeOpen" [label]="c.removeTitle">
        <h2 class="dialog-title">{{ c.removeTitle }}</h2>
        <p class="dialog-body">{{ c.removeBody(pending()?.name ?? '') }}</p>
        <div class="dialog-actions">
          <button type="button" filButton="secondary" (click)="removeOpen.set(false)">
            {{ c.cancel }}
          </button>
          <button type="button" filButton="primary" (click)="confirmRemove()">
            {{ c.remove }}
          </button>
        </div>
      </fil-dialog>

      <fil-dialog [(open)]="removeAllOpen" [label]="c.removeAllTitle">
        <h2 class="dialog-title">{{ c.removeAllTitle }}</h2>
        <p class="dialog-body">{{ c.removeAllBody(store.items().length) }}</p>
        <div class="dialog-actions">
          <button type="button" filButton="secondary" (click)="removeAllOpen.set(false)">
            {{ c.cancel }}
          </button>
          <button type="button" filButton="primary" (click)="confirmRemoveAll()">
            {{ c.removeAll }}
          </button>
        </div>
      </fil-dialog>
    </article>
  `,
})
export default class FavoritesPage {
  protected readonly i18n = inject(I18nService);
  protected readonly store = inject(FavoritesStore);
  protected readonly enabled = inject(RavelryAccess).enabled;
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  private readonly locale: Locale =
    (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = DISCOVER_COPY[this.locale];

  protected readonly pending = signal<Favorite | null>(null);
  protected readonly removeOpen = signal(false);
  protected readonly removeAllOpen = signal(false);

  constructor() {
    this.i18n.setLocale(this.locale);
    this.seo.apply({
      title: this.c.favTitle,
      description: this.c.favDescription,
      path: ROUTE_PATHS.myFavorites,
      locale: this.locale,
      noIndex: true,
    });
    // IndexedDB n'existe pas au pré-rendu : la liste est un îlot du navigateur.
    afterNextRender(() => void this.store.load());
  }

  protected askRemove(favorite: Favorite): void {
    this.pending.set(favorite);
    this.removeOpen.set(true);
  }

  protected async confirmRemove(): Promise<void> {
    const favorite = this.pending();
    this.removeOpen.set(false);
    if (favorite) await this.store.remove(favorite.id);
    this.pending.set(null);
  }

  protected async confirmRemoveAll(): Promise<void> {
    this.removeAllOpen.set(false);
    await this.store.clear();
  }
}

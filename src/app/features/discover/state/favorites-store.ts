import { Service, computed, inject, signal } from '@angular/core';
import {
  clearFavorites,
  deleteFavorites,
  readFavorites,
  writeFavorites,
} from '../../../core/storage/favorites-db';
import { ProjectStoreService } from '../../../core/storage/project-store.service';
import { Favorite, validFavorite } from '../data/favorite.model';

/**
 * Les patrons mis de côté, sur l'appareil (IndexedDB), sans compte. Un favori
 * n'apparaît ou ne disparaît à l'écran qu'une fois l'écriture **confirmée** :
 * jamais une coche qui promet ce que le stockage n'a pas retenu.
 */
@Service()
export class FavoritesStore {
  private readonly base = inject(ProjectStoreService);
  private readonly db = () => this.base.db();
  private loading: Promise<void> | null = null;

  readonly items = signal<readonly Favorite[]>([]);
  /** Faux au pré-rendu et jusqu'à la lecture du stockage : la page n'affiche pas de liste vide trop tôt. */
  readonly loaded = signal(false);
  /** La dernière écriture n'a pas été confirmée (quota, stockage refusé). */
  readonly failed = signal(false);
  /** Les plus récents d'abord. */
  readonly sorted = computed(() => [...this.items()].sort((a, b) => b.addedAt - a.addedAt));
  private readonly ids = computed(() => new Set(this.items().map((f) => f.id)));

  has(id: string): boolean {
    return this.ids().has(id);
  }

  /** Lit le stockage une fois ; `force` le relit. */
  load(force = false): Promise<void> {
    if (force) this.loading = null;
    return (this.loading ??= this.db()
      .then((db) => readFavorites<unknown>(db))
      .then((stored) => {
        // Une base abîmée ou modifiée à la main n'est jamais affichée telle quelle.
        this.items.set(stored.filter(validFavorite));
        this.loaded.set(true);
      }));
  }

  async add(favorite: Omit<Favorite, 'addedAt'>): Promise<boolean> {
    if (this.has(favorite.id)) return true;
    const item: Favorite = { ...favorite, addedAt: Date.now() };
    return this.confirm(await writeFavorites(await this.db(), [item]), () =>
      this.items.update((list) => [...list, item]),
    );
  }

  async remove(id: string): Promise<boolean> {
    return this.confirm(await deleteFavorites(await this.db(), [id]), () =>
      this.items.update((list) => list.filter((f) => f.id !== id)),
    );
  }

  /** « Retirer tous mes favoris » : à n'appeler qu'après confirmation. */
  async clear(): Promise<boolean> {
    return this.confirm(await clearFavorites(await this.db()), () => this.items.set([]));
  }

  private confirm(written: boolean, apply: () => void): boolean {
    this.failed.set(!written);
    if (written) apply();
    return written;
  }
}

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Service, afterNextRender, computed, inject, signal } from '@angular/core';
import { PRODUIT } from '../produit/produit';
import { LocalStorageService } from '../storage/local-storage.service';

export type Theme = 'clair' | 'sombre';
const CLE = 'mp.theme';

/**
 * Thème clair par défaut. Le sombre est un choix explicite de la personne
 * (bouton), proposé seulement si le produit l'active
 * (`theme.sombre`) — jamais déduit de `prefers-color-scheme`. Il se pose sur
 * <html> (`data-theme`), où tokens.css redéfinit les neutres.
 */
@Service()
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly storage = inject(LocalStorageService);
  readonly disponible = inject(PRODUIT).theme.sombre;
  readonly theme = signal<Theme>('clair');
  readonly sombre = computed(() => this.theme() === 'sombre');

  constructor() {
    if (!this.disponible || !isPlatformBrowser(inject(PLATFORM_ID))) return;
    afterNextRender(() => {
      if (this.storage.read<Theme>(CLE) === 'sombre') this.appliquer('sombre');
    });
  }

  basculer(): void {
    this.appliquer(this.sombre() ? 'clair' : 'sombre');
    this.storage.write(CLE, this.theme());
  }

  private appliquer(theme: Theme): void {
    this.theme.set(theme);
    if (theme === 'sombre') this.doc.documentElement.dataset['theme'] = 'sombre';
    else delete this.doc.documentElement.dataset['theme'];
  }
}

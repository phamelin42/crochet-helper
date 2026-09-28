import { PLATFORM_ID, Service, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Adresses `blob:` pour afficher un fichier local (photo d'un projet) dans une
 * balise `<img>`, sans le recopier en `data:`. Chaque adresse retient son
 * fichier en mémoire jusqu'à `revoke` : l'appelant la libère dès qu'il n'en a
 * plus besoin. Côté serveur, et sans l'API, rien n'est créé : `create` rend ''.
 */
@Service()
export class ObjectUrlService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  create(blob: Blob): string {
    if (!this.isBrowser || typeof URL.createObjectURL !== 'function') return '';
    return URL.createObjectURL(blob);
  }

  revoke(url: string): void {
    if (url && this.isBrowser && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(url);
    }
  }
}

import { PLATFORM_ID, Service, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Accès à `sessionStorage`, sûr côté serveur et quand le stockage est refusé :
 * toute erreur dégrade en « pas de valeur ». Sert aux marques qui ne doivent
 * vivre que le temps d'une ouverture de l'application.
 */
@Service()
export class SessionStorageService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  read(key: string): string | null {
    if (!this.isBrowser) return null;
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  write(key: string, value: string): void {
    if (!this.isBrowser) return;
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* stockage refusé : la marque est simplement perdue. */
    }
  }
}

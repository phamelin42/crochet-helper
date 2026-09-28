import { PLATFORM_ID, Service, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Seul point de contact avec `window.print()` — jamais appelé directement
 *  depuis une fonctionnalité (règle d'API navigateur du dépôt). */
@Service()
export class PrintService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  print(): void {
    if (!this.isBrowser) return;
    window.print();
  }
}

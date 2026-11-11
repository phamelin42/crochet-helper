import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injector, PLATFORM_ID, Service, afterNextRender, inject } from '@angular/core';

/**
 * Évite que le focus tombe sur `<body>` : un dialogue qui se ferme sur un
 * ouvrant disparu (« Voir un exemple »), un patron chargé qui masque le panneau
 * d'import en page pleine. La lectrice au clavier ou au lecteur d'écran
 * repartirait du haut de la page. Le focus revient au corps de l'étape, à
 * défaut à `<main>`.
 */
@Service()
export class FocusService {
  private readonly doc = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Après le prochain rendu (l'ouvrant a eu le temps de disparaître), ne
   *  déplace le focus que s'il est perdu ; un contrôle visible le garde. */
  restoreIfLost(): void {
    if (!this.isBrowser) return;
    afterNextRender(
      () => {
        if (!this.isLost(this.doc.activeElement)) return;
        const target =
          this.doc.querySelector<HTMLElement>('.step-body') ?? this.doc.getElementById('main');
        target?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }

  private isLost(active: Element | null): boolean {
    if (!active || active === this.doc.body || active === this.doc.documentElement) return true;
    if (!active.isConnected) return true;
    // Masqué par la mise en page (panneau replié en page pleine) : le
    // navigateur le garde comme `activeElement` jusqu'au prochain calcul.
    return 'checkVisibility' in active && !(active as HTMLElement).checkVisibility();
  }
}

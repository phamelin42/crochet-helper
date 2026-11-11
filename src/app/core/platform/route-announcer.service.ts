import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injector, PLATFORM_ID, Service, afterNextRender, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Dit à qui ne voit pas l'écran que la page a changé : le titre de la nouvelle
 * page passe dans une région `aria-live` polie (rendue par la coquille), et le
 * focus va sur `<main>`, comme le lien d'évitement. Sans cela, le focus reste
 * sur le lien cliqué de l'en-tête et rien n'annonce la page suivante.
 *
 * Ni le premier chargement (la page s'annonce d'elle-même) ni un simple
 * changement de fragment ou de paramètre (même page) ne déclenchent rien. Le
 * titre est lu après le rendu suivant : les pages le posent à leur création.
 */
@Service()
export class RouteAnnouncer {
  /** Texte de la région vivante ; vide tant qu'aucune navigation n'a eu lieu. */
  readonly message = signal('');

  private readonly doc = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private lastPath: string | null = null;

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    inject(Router)
      .events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        const path = event.urlAfterRedirects.split(/[?#]/)[0];
        const previous = this.lastPath;
        this.lastPath = path;
        if (previous === null || previous === path) return;
        afterNextRender(() => this.announce(), { injector: this.injector });
      });
  }

  private announce(): void {
    this.message.set(this.doc.title);
    this.doc.getElementById('main')?.focus({ preventScroll: true });
  }
}

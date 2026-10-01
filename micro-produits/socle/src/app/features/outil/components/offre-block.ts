import { Component, ElementRef, afterNextRender, inject, signal } from '@angular/core';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { PRODUIT } from '../../../core/produit';

/**
 * L'offre complète n'existe pas encore (« gratuit d'abord », README des
 * micro-produits). Ce bloc mesure l'intérêt : `offre_vue` quand il entre à
 * l'écran, `offre_cliquee` au clic. Le lien ouvre un courriel prérempli —
 * aucun formulaire, aucun serveur.
 */
@Component({
  selector: 'app-offre-block',
  template: `
    <aside class="card offre" aria-labelledby="offre-titre">
      <h2 id="offre-titre">Bientôt : la version complète</h2>
      <p>{{ offre }}</p>
      @if (!clique()) {
        <a class="btn btn-secondary" [href]="mailto" (click)="cliquer()">Être prévenu</a>
      } @else {
        <p role="status">
          Merci, votre messagerie s'ouvre&nbsp;: envoyez le message pour être prévenu.
        </p>
      }
    </aside>
  `,
})
export class OffreBlock {
  private readonly analytics = inject(AnalyticsService);
  protected readonly clique = signal(false);
  protected readonly offre = `L'outil reste gratuit. Une version complète est à l'étude.`;
  protected readonly mailto = `mailto:${PRODUIT.editeur.contact}?subject=${encodeURIComponent(
    `${PRODUIT.nom} — me prévenir de la version complète`,
  )}`;

  constructor() {
    const el = inject(ElementRef<HTMLElement>);
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') return;
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this.analytics.track('offre_vue');
          observer.disconnect();
        }
      });
      observer.observe(el.nativeElement);
    });
  }

  protected cliquer(): void {
    this.analytics.track('offre_cliquee');
    this.clique.set(true);
  }
}

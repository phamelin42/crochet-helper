import { Component, inject, signal } from '@angular/core';
import { AnalyticsService } from '@mp/core';

/**
 * Le module métier : seule partie du code propre à ce produit. À remplacer
 * par la fiche `prompts/devis-artisan/01-module-metier.md`. Il montre déjà
 * l'événement d'activation que le module réel devra émettre.
 */
@Component({
  selector: 'app-metier',
  template: `
    <section class="card" aria-labelledby="metier-titre">
      <h2 id="metier-titre">Commencer</h2>
      @if (!commence()) {
        <button type="button" class="btn btn-primary" (click)="commencer()">Commencer</button>
      } @else {
        <p role="status">L'outil arrive ici.</p>
      }
    </section>
  `,
})
export class Metier {
  private readonly analytics = inject(AnalyticsService);
  protected readonly commence = signal(false);

  protected commencer(): void {
    this.commence.set(true);
    this.analytics.track('outil_commence');
  }
}

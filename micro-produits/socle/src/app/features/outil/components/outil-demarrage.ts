import { Component, inject, signal } from '@angular/core';
import { AnalyticsService } from '../../../core/analytics/analytics.service';

/**
 * Emplacement de la fonction principale, à remplacer par la fiche
 * `prompts/01-fonction-principale.md`. Il montre déjà les deux événements
 * d'activation que la fonction réelle devra émettre.
 */
@Component({
  selector: 'app-outil-demarrage',
  template: `
    <section class="card" aria-labelledby="outil-titre">
      <h2 id="outil-titre">Commencer</h2>
      @if (!commence()) {
        <button type="button" class="btn btn-primary" (click)="commencer()">Commencer</button>
      } @else {
        <p role="status">L'outil arrive ici.</p>
      }
    </section>
  `,
})
export class OutilDemarrage {
  private readonly analytics = inject(AnalyticsService);
  protected readonly commence = signal(false);

  protected commencer(): void {
    this.commence.set(true);
    this.analytics.track('outil_commence');
  }
}

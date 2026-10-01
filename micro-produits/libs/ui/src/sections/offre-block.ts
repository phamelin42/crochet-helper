import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { AnalyticsService, Bloc, PRODUIT } from '@mp/core';
import { Paragraphes } from './paragraphes';

/**
 * Offre complète en préparation : on mesure l'intérêt (`offre_vue` quand le
 * bloc entre à l'écran, `offre_cliquee` au clic). Le lien ouvre un courriel
 * prérempli — ni formulaire ni serveur. Le texte vient du contenu du produit.
 */
@Component({
  selector: 'mp-offre-block',
  imports: [Paragraphes],
  template: `
    <aside class="card offre" aria-labelledby="offre-titre">
      <h2 id="offre-titre">{{ offre().titre }}</h2>
      <mp-paragraphes [texte]="offre().texte" />
      @if (!clique()) {
        <a class="btn btn-secondary" [href]="mailto()" (click)="cliquer()">Être prévenu</a>
      } @else {
        <p role="status">Votre messagerie s'ouvre&nbsp;: envoyez le message pour être prévenu.</p>
      }
    </aside>
  `,
})
export class OffreBlock {
  readonly offre = input.required<Bloc>();
  private readonly analytics = inject(AnalyticsService);
  private readonly produit = inject(PRODUIT);
  protected readonly clique = signal(false);
  protected readonly mailto = computed(
    () =>
      `mailto:${this.produit.editeur.contact}?subject=${encodeURIComponent(
        `${this.produit.nom} — me prévenir`,
      )}`,
  );

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

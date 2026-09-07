import { Service, signal } from '@angular/core';

export interface TooltipState {
  readonly term: string;
  readonly definition: string;
  readonly x: number;
  readonly y: number;
  readonly above: boolean;
}

/**
 * Une seule infobulle pour toute l'application : les définitions du glossaire
 * apparaissent en survol, au focus clavier et au clic tactile, sur le même
 * élément flottant plutôt qu'un par terme.
 */
@Service()
export class TooltipService {
  readonly state = signal<TooltipState | null>(null);

  showFor(element: HTMLElement, term: string, definition: string): void {
    const rect = element.getBoundingClientRect();
    this.state.set({
      term,
      definition,
      x: rect.left + rect.width / 2,
      y: rect.top,
      above: rect.top > 120,
    });
  }

  hide(): void {
    this.state.set(null);
  }
}

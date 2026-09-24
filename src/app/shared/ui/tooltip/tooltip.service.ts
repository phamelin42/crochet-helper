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

  /** Position du dernier appui (clic, toucher) sur la page. */
  private lastPress: { x: number; y: number } | null = null;

  /** Noté par `TooltipHost`, qui écoute les appuis sur tout le document. */
  notePress(event: PointerEvent): void {
    this.lastPress = { x: event.clientX, y: event.clientY };
  }

  /**
   * Vrai si un `pointerenter` vient de la page qui a bougé sous un curseur
   * immobile, pas de la personne : après un clic sur « Exemple » ou
   * « Suivante », l'étape s'affiche sous le pointeur resté au même endroit, et
   * le navigateur signale un survol. Ce n'en est pas un — ni infobulle, ni
   * mesure.
   */
  isStationaryHover(event: Event): boolean {
    if (event.type !== 'pointerenter' || !this.lastPress) return false;
    const { clientX, clientY } = event as PointerEvent;
    return clientX === this.lastPress.x && clientY === this.lastPress.y;
  }

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

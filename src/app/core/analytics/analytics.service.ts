import { InjectionToken, PLATFORM_ID, Service, afterNextRender, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ANALYTICS_ORIGIN, ANALYTICS_SITE_ID } from './analytics.config';

/** Les seuls événements mesurés — une faute de frappe casse le build plutôt que de créer un événement fantôme. */
export type AnalyticsEvent =
  | 'pattern_pasted'
  | 'pattern_parsed'
  | 'step_advanced'
  | 'glossary_hover'
  | 'session_resumed'
  | 'pdf_imported'
  | 'pdf_failed'
  /** Première modification du rang d'essai d'une page d'abréviation. */
  | 'term_tried'
  /** Conversion d'un patron entier d'une convention US/UK à l'autre. */
  | 'conversion_run'
  /** Un patron collé, tapé ou importé ouvre un nouveau projet. */
  | 'project_created'
  /** Reprise d'un projet depuis l'écran de liste. */
  | 'project_resumed'
  /** Téléchargement du fichier de sauvegarde de tous les projets. */
  | 'backup_exported'
  /** Réimport réussi d'un fichier de sauvegarde. */
  | 'backup_imported';

interface Umami {
  track(event: string, props?: Record<string, string | number>): void;
}

type UmamiWindow = Window & { umami?: Umami };

/** Arrondit à la centaine : une longueur de texte n'est jamais transmise telle quelle. */
export function roundToHundred(value: number): number {
  return Math.round(value / 100) * 100;
}

/**
 * Origine du collecteur, injectable. La valeur de production vient de
 * `ANALYTICS_ORIGIN` ; ce seul indirect permet de la remplacer en test sans
 * toucher à la constante ni au reste du code.
 */
export const ANALYTICS_ORIGIN_TOKEN = new InjectionToken<string>('fil.analyticsOrigin', {
  providedIn: 'root',
  factory: () => ANALYTICS_ORIGIN,
});

/**
 * Mesure d'audience minimale : quelques événements nommés, aucun contenu de
 * patron, aucun identifiant persistant. Inerte tant que `ANALYTICS_ORIGIN`
 * est vide. Voir `docs/adr-001-mesure-audience.md`.
 */
@Service()
export class AnalyticsService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly origin = inject(ANALYTICS_ORIGIN_TOKEN);

  constructor() {
    if (this.isBrowser && this.origin) {
      afterNextRender(() => this.loadScript());
    }
  }

  track(event: AnalyticsEvent, props?: Record<string, string | number>): void {
    if (!this.isBrowser || !this.origin) return;
    try {
      (window as UmamiWindow).umami?.track(event, props);
    } catch {
      /* une erreur de mesure ne doit jamais interrompre l'action de la personne */
    }
  }

  private loadScript(): void {
    try {
      const script = document.createElement('script');
      script.defer = true;
      script.src = `${this.origin}/script.js`;
      script.dataset['websiteId'] = ANALYTICS_SITE_ID;
      document.head.appendChild(script);
    } catch {
      /* origine injoignable ou bloquée par le navigateur : pas de mesure, pas d'erreur visible */
    }
  }
}

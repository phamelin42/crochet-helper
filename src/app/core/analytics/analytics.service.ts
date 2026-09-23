import {
  InjectionToken,
  PLATFORM_ID,
  Service,
  afterNextRender,
  inject,
  isDevMode,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ANALYTICS_HOSTNAMES, ANALYTICS_ORIGIN, ANALYTICS_SITE_ID } from './analytics.config';

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

/** Hôtes où le traceur se charge, injectables pour les tests. */
export const ANALYTICS_HOSTNAMES_TOKEN = new InjectionToken<readonly string[]>(
  'fil.analyticsHostnames',
  { providedIn: 'root', factory: () => ANALYTICS_HOSTNAMES },
);

/**
 * Événements émis avant que le traceur ait fini de charger (`session_resumed`
 * au démarrage, patron ouvert par un lien) : sans file, `window.umami` est
 * encore absent et ils sont perdus en silence. Borne haute, par prudence.
 */
const MAX_PENDING = 20;

type Pending = [AnalyticsEvent, Record<string, string | number> | undefined];

/**
 * Mesure d'audience minimale : quelques événements nommés, aucun contenu de
 * patron, aucun identifiant persistant. Inerte tant que `ANALYTICS_ORIGIN`
 * est vide. Voir `docs/adr-001-mesure-audience.md`.
 */
@Service()
export class AnalyticsService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly origin = inject(ANALYTICS_ORIGIN_TOKEN);
  private readonly hostnames = inject(ANALYTICS_HOSTNAMES_TOKEN);
  /** File d'attente tant que le traceur charge ; `null` sinon. */
  private pending: Pending[] | null = null;

  constructor() {
    if (this.isBrowser && this.origin) {
      afterNextRender(() => this.loadScript());
    }
  }

  track(event: AnalyticsEvent, props?: Record<string, string | number>): void {
    if (!this.isBrowser || !this.origin) return;
    const umami = (window as UmamiWindow).umami;
    if (!umami) {
      if (this.pending && this.pending.length < MAX_PENDING) this.pending.push([event, props]);
      return;
    }
    try {
      umami.track(event, props);
    } catch {
      /* une erreur de mesure ne doit jamais interrompre l'action de la personne */
      trace(`événement « ${event} » non transmis : le traceur a levé une erreur`);
    }
  }

  private loadScript(): void {
    if (!this.hostnames.includes(location.hostname)) {
      trace(
        `traceur non chargé sur ${location.hostname} (hôtes mesurés : ${this.hostnames.join(', ')})`,
      );
      return;
    }
    this.pending = [];
    try {
      const script = document.createElement('script');
      script.defer = true;
      script.src = `${this.origin}/script.js`;
      script.dataset['websiteId'] = ANALYTICS_SITE_ID;
      script.addEventListener('load', () => this.flush());
      script.addEventListener('error', () => {
        this.pending = null;
        trace(`traceur injoignable : ${script.src}`);
      });
      document.head.appendChild(script);
    } catch {
      /* origine injoignable ou bloquée par le navigateur : pas de mesure, pas d'erreur visible */
      this.pending = null;
    }
  }

  private flush(): void {
    const queued = this.pending ?? [];
    this.pending = null;
    for (const [event, props] of queued) this.track(event, props);
  }
}

/**
 * Trace de développement : jamais en production, et seulement des noms
 * d'événements ou d'hôtes, jamais de propriété ni de texte de patron.
 */
function trace(message: string): void {
  if (isDevMode()) console.warn(`[mesure] ${message}`);
}

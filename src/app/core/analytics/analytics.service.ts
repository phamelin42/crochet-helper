import {
  InjectionToken,
  PLATFORM_ID,
  Service,
  afterNextRender,
  inject,
  isDevMode,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LocalStorageService } from '../storage/local-storage.service';
import { ANALYTICS_HOSTNAMES, ANALYTICS_ORIGIN, ANALYTICS_SITE_ID } from './analytics.config';
import { daysSinceCivil, visitBucket } from './visit-age';

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
  /** Lien de projet (patron et progression) copié — ancien « Envoyer ce projet »,
   *  retiré : gardé pour lire l'historique des rapports. */
  | 'project_shared'
  /** Lien du patron copié — « Partager le patron ». */
  | 'pattern_shared'
  /** Projet créé depuis un lien de projet reçu (`#j=`). */
  | 'project_received'
  /** Téléchargement du fichier de sauvegarde de tous les projets. */
  | 'backup_exported'
  /** Réimport réussi d'un fichier de sauvegarde. */
  | 'backup_imported'
  /** Visite avec une première visite locale vieille de 1 jour. */
  | 'returning_visit_1d'
  /** Visite avec une première visite locale vieille de 2 à 7 jours. */
  | 'returning_visit_2_7d'
  /** Visite avec une première visite locale vieille de 8 à 30 jours. */
  | 'returning_visit_8_30d'
  /** Visite avec une première visite locale vieille de plus de 30 jours. */
  | 'returning_visit_31d'
  /** Position absolue de 5 dans le patron atteinte pour la première fois. */
  | 'reading_depth_5'
  /** Position absolue de 20 dans le patron atteinte pour la première fois. */
  | 'reading_depth_20'
  /** Position absolue de 50 dans le patron atteinte pour la première fois. */
  | 'reading_depth_50'
  /** Ligne de liste d'attente affichée, une fois par projet. */
  | 'waitlist_shown'
  /** Clic sur le lien externe de la liste d'attente. */
  | 'waitlist_clicked'
  /** Taille du texte ou fond sombre changés dans le mode lecture. */
  | 'reading_pref_changed'
  /** Entrée ou sortie du mode page pleine du lecteur (propriété `value`, `on` ou `off`). */
  | 'focus_mode_toggled'
  /** Clic sur l'un des deux boutons du bandeau d'accueil (propriété `cta`, exemple ou collage). */
  | 'home_cta'
  /** Saut direct à une étape depuis la liste ou le champ « Aller à l'étape n° » (propriété `origin`). */
  | 'step_jumped'
  /** Ouverture de la mise en page d'impression du navigateur depuis le lecteur. */
  | 'print_opened'
  /** Compteur de rangs en ligne : palier de dix atteint (propriété `value`), pas chaque clic. */
  | 'row_counted'
  /** Photo d'un patron PDF agrandie depuis sa vignette, dans le lecteur. */
  | 'image_opened'
  /** Diagramme chargé dans un projet (propriété `source`, image ou PDF). */
  | 'chart_added'
  /** Diagramme affiché dans le panneau ou en plein écran, une fois par session et par diagramme. */
  | 'chart_viewed'
  /** Transcription d'un diagramme ajoutée au patron (propriétés `rounds` et `convention`). */
  | 'chart_transcribed'
  /** Diagramme ouvert comme patron et lu automatiquement (propriétés `rounds` et `symbols`, à la dizaine). */
  | 'chart_recognized'
  /** Échantillon comparé à celui du patron (propriétés `unit` et `advice`), une fois par combinaison. */
  | 'gauge_calculated'
  /** Filtre du glossaire changé (propriétés `craft` et `lang`, jamais la recherche). */
  | 'glossary_filtered'
  /** Première saisie sur la page « lire un patron dans l'autre langue » (propriétés `locale` et `length`). */
  | 'foreign_pattern_tried'
  /** Invite d'installation native affichée (propriété `mode`). */
  | 'install_prompted'
  /** Application installée, événement `appinstalled` (propriété `mode`). */
  | 'app_installed'
  /** Application ouverte en mode appli, une fois par session (propriété `mode`, `twa` ou `standalone`). */
  | 'app_opened'
  /** Onglet de la barre du mode appli touché (propriété `tab` : `read`, `projects`, `glossary` ou `settings`). */
  | 'app_tab_selected';

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

const FIRST_VISIT_KEY = 'fil.firstVisit';
const LAST_VISIT_DAY_KEY = 'fil.lastVisitDay';
/** 13 mois — durée maximale admise par l'exemption CNIL de mesure d'audience. */
const VISIT_TTL_DAYS = 396;

/** Date civile du jour, heure locale du navigateur. */
function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

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
  private readonly storage = inject(LocalStorageService);
  /** File d'attente tant que le traceur charge ; `null` sinon. */
  private pending: Pending[] | null = null;

  constructor() {
    if (this.isBrowser) {
      afterNextRender(() => {
        this.trackReturningVisit();
        if (this.origin) this.loadScript();
      });
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

  /**
   * Une date de première visite en `localStorage`, jamais transmise : seule
   * une tranche d'ancienneté part au collecteur, au plus une fois par jour.
   */
  private trackReturningVisit(): void {
    const today = todayLocal();
    let firstVisit = this.storage.read<string>(FIRST_VISIT_KEY);
    const age = firstVisit ? daysSinceCivil(firstVisit, today) : null;
    if (firstVisit === null || age === null || age > VISIT_TTL_DAYS) {
      firstVisit = today;
      this.storage.write(FIRST_VISIT_KEY, today);
    }
    const bucket = visitBucket(firstVisit, today);
    const lastVisitDay = this.storage.read<string>(LAST_VISIT_DAY_KEY);
    if (bucket && lastVisitDay !== today) {
      this.track(`returning_visit_${bucket}`);
    }
    this.storage.write(LAST_VISIT_DAY_KEY, today);
  }
}

/**
 * Trace de développement : jamais en production, et seulement des noms
 * d'événements ou d'hôtes, jamais de propriété ni de texte de patron.
 */
function trace(message: string): void {
  if (isDevMode()) console.warn(`[mesure] ${message}`);
}

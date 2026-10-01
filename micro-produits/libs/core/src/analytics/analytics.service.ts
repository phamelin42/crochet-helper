import {
  InjectionToken,
  PLATFORM_ID,
  Service,
  afterNextRender,
  inject,
  isDevMode,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PRODUIT } from '../produit/produit';
import { LocalStorageService } from '../storage/local-storage.service';
import { AnalyticsEvent } from './evenements';
import { daysSinceCivil, visitBucket } from './visit-age';

export interface AnalyticsConfig {
  /** Origine du collecteur Umami. Vide = mesure éteinte. */
  origin: string;
  siteId: string;
  /** Seuls hôtes où le traceur se charge (jamais `localhost` ni la CI). */
  hostnames: readonly string[];
}

export const ANALYTICS_CONFIG = new InjectionToken<AnalyticsConfig>('mp.analyticsConfig', {
  providedIn: 'root',
  factory: () => {
    const { domaine, mesure } = inject(PRODUIT);
    return {
      origin: mesure.siteId ? mesure.origine : '',
      siteId: mesure.siteId,
      hostnames: [domaine, `www.${domaine}`],
    };
  },
});

interface Umami {
  track(event: string, props?: Record<string, string | number>): void;
}

const MAX_PENDING = 20;
const FIRST_VISIT_KEY = 'mp.premiereVisite';
const LAST_VISIT_DAY_KEY = 'mp.derniereVisite';
/** 13 mois — durée maximale de l'exemption CNIL de mesure d'audience. */
const VISIT_TTL_DAYS = 396;

function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Mesure d'audience sans cookie ni identifiant (Umami) : des noms
 * d'événements et des propriétés courtes, jamais une saisie de la personne.
 * Inerte tant que le `produit.json` du produit n'a pas de `mesure.siteId`. Voir
 * `docs/adr-001-mesure-audience.md`.
 */
@Service()
export class AnalyticsService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly config = inject(ANALYTICS_CONFIG);
  private readonly storage = inject(LocalStorageService);
  private pending: [AnalyticsEvent, Record<string, string | number> | undefined][] | null = null;

  constructor() {
    if (!this.isBrowser) return;
    afterNextRender(() => {
      this.trackReturningVisit();
      if (this.config.origin) this.loadScript();
    });
  }

  track(event: AnalyticsEvent, props?: Record<string, string | number>): void {
    if (!this.isBrowser || !this.config.origin) return;
    const umami = (window as Window & { umami?: Umami }).umami;
    if (!umami) {
      if (this.pending && this.pending.length < MAX_PENDING) this.pending.push([event, props]);
      return;
    }
    try {
      umami.track(event, props);
    } catch {
      /* une erreur de mesure n'interrompt jamais l'action de la personne */
    }
  }

  private loadScript(): void {
    if (!this.config.hostnames.includes(location.hostname)) {
      if (isDevMode()) console.warn(`[mesure] traceur non chargé sur ${location.hostname}`);
      return;
    }
    this.pending = [];
    const script = document.createElement('script');
    script.defer = true;
    script.src = `${this.config.origin}/script.js`;
    script.dataset['websiteId'] = this.config.siteId;
    script.addEventListener('load', () => this.flush());
    script.addEventListener('error', () => (this.pending = null));
    document.head.appendChild(script);
  }

  private flush(): void {
    const queued = this.pending ?? [];
    this.pending = null;
    for (const [event, props] of queued) this.track(event, props);
  }

  /** La date de première visite reste locale ; seule une tranche part, au plus une fois par jour. */
  private trackReturningVisit(): void {
    const today = todayLocal();
    let first = this.storage.read<string>(FIRST_VISIT_KEY);
    const age = first ? daysSinceCivil(first, today) : null;
    if (first === null || age === null || age > VISIT_TTL_DAYS) {
      first = today;
      this.storage.write(FIRST_VISIT_KEY, today);
    }
    const bucket = visitBucket(first, today);
    if (bucket && this.storage.read<string>(LAST_VISIT_DAY_KEY) !== today) {
      this.track(`retour_${bucket}`);
    }
    this.storage.write(LAST_VISIT_DAY_KEY, today);
  }
}

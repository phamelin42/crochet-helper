import { Service, computed, inject, signal } from '@angular/core';
import { AnalyticsService } from '../analytics/analytics.service';
import { I18nService } from '../i18n/i18n.service';
import { LOCALES, Locale } from '../i18n/locale';
import { BrowserLocation } from '../platform/browser-location.service';
import { WebCrypto } from '../platform/web-crypto.service';
import { ProjectStoreService } from '../storage/project-store.service';
import { clearSession, readSession, writeSession } from '../storage/ravelry-session-db';
import { SessionStorageService } from '../storage/session-storage.service';
import { challengeFrom, VERIFIER_BYTES, verifierFrom, base64Url } from './pkce';
import { RAVELRY_CALLBACK_PATH, RAVELRY_CLIENT_ID_TOKEN } from './ravelry-connection-config';
import { RAVELRY_URL_TOKEN } from './ravelry-access';
import { RAVELRY_CLIENT } from './ravelry-client.token';
import type { RavelryTokens } from './ravelry.model';

const AUTH_URL = 'https://auth.ravelry.com/oauth2/auth';
/** Seul scope demandé : le jeton de rafraîchissement. Aucun scope d'écriture, aucun scope de lecture inventé. */
const SCOPE = 'offline_access';
const FLOW_KEY = 'fil.ravelry.flow';
/** L'aller-retour chez Ravelry ne dure que quelques instants : au-delà, le départ est oublié. */
const FLOW_TTL_MS = 10 * 60_000;
/** On renouvelle le jeton d'accès cinq minutes avant son expiration. */
const REFRESH_MARGIN_MS = 5 * 60_000;
const MAX_CODE = 512;
const MAX_RETURN = 300;

/** Ce que l'on garde le temps de l'aller-retour (sessionStorage, effacé au retour). */
interface Flow {
  readonly state: string;
  readonly verifier: string;
  readonly locale: Locale;
  readonly returnTo: string;
  readonly at: number;
}

export interface RavelryConnection {
  readonly accessToken: string;
  readonly refreshToken: string | null;
  /** Millisecondes depuis 1970. */
  readonly expiresAt: number;
}

export type CompleteOutcome =
  | { readonly ok: true; readonly returnTo: string | null; readonly locale: Locale }
  | {
      readonly ok: false;
      /**
       * `state` : l'aller-retour ne se vérifie pas (absent, expiré, falsifié) ;
       * `denied` : la lectrice a refusé ; `failed` : Ravelry a refusé l'échange ;
       * `unavailable` : le Worker ou le réseau n'a pas répondu.
       */
      readonly reason: 'state' | 'denied' | 'failed' | 'unavailable';
      readonly locale: Locale | null;
    };

/** Un chemin du site, jamais une autre adresse : le retour ne mène pas ailleurs que chez nous. */
function safeReturn(v: unknown): string | null {
  if (typeof v !== 'string' || v.length === 0 || v.length > MAX_RETURN) return null;
  if (!/^\/(?![/\\])[\w\-./?=&%~+]*$/.test(v)) return null;
  return v;
}

function parseFlow(raw: string | null): Flow | null {
  if (raw === null || raw.length > 2000) return null;
  try {
    const f = JSON.parse(raw) as Partial<Record<keyof Flow, unknown>>;
    if (
      typeof f.state !== 'string' ||
      typeof f.verifier !== 'string' ||
      typeof f.returnTo !== 'string' ||
      typeof f.at !== 'number' ||
      !LOCALES.includes(f.locale as Locale)
    ) {
      return null;
    }
    return f as unknown as Flow;
  } catch {
    return null;
  }
}

/**
 * Connexion de la lectrice à **son** compte Ravelry (OAuth 2.1 avec PKCE, fiche
 * 62, ADR-004). Le secret client n'existe que dans le Worker, qui échange le code
 * et renouvelle le jeton sans rien conserver. Les jetons restent sur l'appareil
 * (IndexedDB), ne vont jamais dans une adresse, une sauvegarde, la mesure ni un journal.
 */
@Service()
export class RavelrySession {
  private readonly client = inject(RAVELRY_CLIENT);
  private readonly base = inject(RAVELRY_URL_TOKEN);
  private readonly clientId = inject(RAVELRY_CLIENT_ID_TOKEN);
  private readonly store = inject(ProjectStoreService);
  private readonly flowStorage = inject(SessionStorageService);
  private readonly location = inject(BrowserLocation);
  private readonly webCrypto = inject(WebCrypto);
  private readonly analytics = inject(AnalyticsService);
  private readonly i18n = inject(I18nService);

  private readonly current = signal<RavelryConnection | null>(null);
  readonly connected = computed(() => this.current() !== null);
  /** Faux au pré-rendu et jusqu'à la lecture du stockage : pas d'écran de connexion trop tôt. */
  readonly loaded = signal(false);
  /** La connexion a été perdue (jeton refusé et non renouvelable) : à dire à la lectrice. */
  readonly expired = signal(false);

  private loading: Promise<void> | null = null;
  private erasures = 0;
  private refreshing: Promise<boolean> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** Lit la connexion enregistrée, une fois. */
  load(): Promise<void> {
    return (this.loading ??= this.restore());
  }

  private async restore(): Promise<void> {
    const generation = this.erasures;
    const stored = await readSession(await this.store.db());
    // Une déconnexion pendant la lecture l'emporte : on ne ressuscite pas ce qu'on vient d'effacer.
    if (stored !== null && this.current() === null && generation === this.erasures) {
      this.setCurrent({
        accessToken: stored.accessToken,
        refreshToken: stored.refreshToken,
        expiresAt: stored.expiresAt,
      });
    }
    this.loaded.set(true);
  }

  /** Redirige vers Ravelry. `false` : connexion indisponible (identifiant, hasard ou hachage manquants). */
  async begin(returnTo: string): Promise<boolean> {
    if (this.clientId === '') return false;
    const random = this.webCrypto.randomBytes(VERIFIER_BYTES);
    const stateBytes = this.webCrypto.randomBytes(16);
    if (random === null || stateBytes === null) return false;
    const verifier = verifierFrom(random);
    const hash = await this.webCrypto.sha256(verifier);
    if (hash === null) return false;
    const state = base64Url(stateBytes);

    const flow: Flow = {
      state,
      verifier,
      locale: this.i18n.locale(),
      returnTo: safeReturn(returnTo) ?? '/',
      at: Date.now(),
    };
    this.flowStorage.write(FLOW_KEY, JSON.stringify(flow));

    const url = new URL(AUTH_URL);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri());
    url.searchParams.set('scope', SCOPE);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', challengeFrom(hash));
    url.searchParams.set('code_challenge_method', 'S256');
    this.location.redirect(url.toString());
    return true;
  }

  private redirectUri(): string {
    return `${this.location.origin()}${RAVELRY_CALLBACK_PATH}`;
  }

  /** Retour de Ravelry : vérifie `state`, échange le code, enregistre les jetons. */
  async complete(search: string): Promise<CompleteOutcome> {
    // Le départ ne sert qu'une fois : effacé avant toute vérification.
    const flow = parseFlow(this.flowStorage.read(FLOW_KEY));
    this.flowStorage.remove(FLOW_KEY);
    const params = new URLSearchParams(search);
    const state = params.get('state');
    if (
      flow === null ||
      Date.now() - flow.at > FLOW_TTL_MS ||
      state === null ||
      state !== flow.state
    ) {
      return { ok: false, reason: 'state', locale: flow?.locale ?? null };
    }
    const error = params.get('error');
    if (error !== null) {
      return {
        ok: false,
        reason: error === 'access_denied' ? 'denied' : 'failed',
        locale: flow.locale,
      };
    }
    const code = params.get('code');
    if (code === null || code.length === 0 || code.length > MAX_CODE) {
      return { ok: false, reason: 'failed', locale: flow.locale };
    }

    const result = await this.client.exchangeCode(this.base, {
      code,
      verifier: flow.verifier,
      redirectUri: this.redirectUri(),
    });
    if (!result.ok) {
      const refused = ['session-expiree', 'requete', 'connexion-requise'].includes(result.raison);
      return { ok: false, reason: refused ? 'failed' : 'unavailable', locale: flow.locale };
    }
    await this.save(result.data, null);
    this.expired.set(false);
    this.analytics.track('ravelry_connected');
    return { ok: true, returnTo: safeReturn(flow.returnTo), locale: flow.locale };
  }

  /** Enregistre des jetons : en mémoire d'abord, puis sur l'appareil (confirmé à la fin de la transaction). */
  private async save(tokens: RavelryTokens, previousRefresh: string | null): Promise<void> {
    const connection: RavelryConnection = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? previousRefresh,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
    };
    this.setCurrent(connection);
    await writeSession(await this.store.db(), {
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      expiresAt: connection.expiresAt,
    });
  }

  private setCurrent(connection: RavelryConnection | null): void {
    this.current.set(connection);
    this.schedule();
  }

  /** Renouvellement automatique, cinq minutes avant l'expiration. */
  private schedule(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    const c = this.current();
    if (c === null || c.refreshToken === null) return;
    const delay = Math.min(Math.max(0, c.expiresAt - REFRESH_MARGIN_MS - Date.now()), 2 ** 31 - 1);
    this.timer = setTimeout(() => void this.refresh(false), delay);
  }

  /** Un jeton d'accès valable pour un appel, renouvelé s'il est proche de l'expiration ; `null` sans connexion. */
  async accessToken(): Promise<string | null> {
    await this.load();
    const c = this.current();
    if (c === null) return null;
    if (c.expiresAt - Date.now() <= REFRESH_MARGIN_MS) await this.refresh(false);
    return this.current()?.accessToken ?? null;
  }

  /**
   * Ravelry a répondu 401 au jeton `rejected` : un seul renouvellement, jamais de
   * boucle. `null` si la connexion est perdue (elle est alors effacée et dite).
   */
  async refreshAfterRejection(rejected: string): Promise<string | null> {
    const c = this.current();
    if (c === null) return null;
    // Un autre appel l'a déjà renouvelé : on rend le nouveau jeton, sans second renouvellement.
    if (c.accessToken !== rejected) return c.accessToken;
    await this.refresh(true);
    return this.current()?.accessToken ?? null;
  }

  /**
   * Renouvelle le jeton (un seul appel à la fois). `strict` : le jeton a été refusé,
   * tout échec perd la connexion. Sinon, un réseau coupé tant que le jeton vaut
   * encore ne déconnecte personne.
   */
  private refresh(strict: boolean): Promise<boolean> {
    return (this.refreshing ??= this.doRefresh(strict).finally(() => (this.refreshing = null)));
  }

  private async doRefresh(strict: boolean): Promise<boolean> {
    const c = this.current();
    if (c === null) return false;
    if (c.refreshToken === null) {
      await this.expire();
      return false;
    }
    const result = await this.client.refresh(this.base, c.refreshToken);
    if (result.ok) {
      await this.save(result.data, c.refreshToken);
      return true;
    }
    const transient = [
      'reseau',
      'delai',
      'indisponible',
      'trop-de-demandes',
      'quota-jour',
    ].includes(result.raison);
    const stillValid = c.expiresAt > Date.now();
    if (transient && stillValid && !strict) return false;
    await this.expire();
    return false;
  }

  /** La connexion est perdue : tout est effacé, et la lectrice en est informée. */
  private async expire(): Promise<void> {
    this.expired.set(true);
    await this.erase();
  }

  /** Efface la connexion de cet appareil. L'état est vidé *avant* d'attendre le stockage. */
  private async erase(): Promise<boolean> {
    this.erasures++;
    this.setCurrent(null);
    this.flowStorage.remove(FLOW_KEY);
    return clearSession(await this.store.db());
  }

  /** « Se déconnecter de Ravelry » : efface tout localement. `true` une fois l'effacement confirmé. */
  async disconnect(): Promise<boolean> {
    this.expired.set(false);
    const done = await this.erase();
    this.loaded.set(true);
    this.analytics.track('ravelry_disconnected');
    return done;
  }
}

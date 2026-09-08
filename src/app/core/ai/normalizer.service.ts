import { DestroyRef, Service, computed, inject, signal } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { ByokService } from './byok.service';
import {
  BlockedReason,
  ErrorReason,
  MAX_INPUT_CHARS,
  NormalizeResponse,
} from './normalize.contract';
import { readReply, requestBody, requestHeaders } from './providers';
import { SYSTEM_PROMPT } from './prompt';

/**
 * Client de `/api/normalize`.
 *
 * La normalisation est facultative : toute panne, tout quota épuisé, toute
 * absence de réseau ramène l'application à son comportement d'origine, où
 * l'utilisateur colle son texte et le découpe tel quel. Ce service ne touche
 * jamais au patron courant — il rend du texte, la décision de le charger
 * appartient à l'utilisateur.
 */

export type NormalizerState = 'idle' | 'running' | 'blocked' | 'error';

@Service()
export class NormalizerService {
  private readonly i18n = inject(I18nService);
  private readonly byok = inject(ByokService);
  private readonly destroyRef = inject(DestroyRef);

  /** Horloge de secondes, active uniquement pendant un blocage. */
  private readonly now = signal(Date.now());
  private ticker: ReturnType<typeof setInterval> | null = null;

  readonly state = signal<NormalizerState>('idle');
  readonly blockedReason = signal<BlockedReason | null>(null);
  readonly errorReason = signal<ErrorReason | null>(null);
  private readonly resumesAt = signal<number | null>(null);

  readonly running = computed(() => this.state() === 'running');

  /** Secondes restantes avant reprise, `null` si l'échéance est inconnue. */
  readonly secondsUntilResume = computed(() => {
    const at = this.resumesAt();
    if (at === null) return null;
    return Math.max(0, Math.ceil((at - this.now()) / 1000));
  });

  /** « 42 s », « 8 min », « 3 j » — l'échelle va de la seconde à la semaine. */
  readonly countdown = computed(() => {
    const seconds = this.secondsUntilResume();
    if (seconds === null) return null;
    if (seconds < 60) return `${seconds} s`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)} min`;
    if (seconds < 86_400) return `${Math.ceil(seconds / 3600)} h`;
    return `${Math.ceil(seconds / 86_400)} j`;
  });

  readonly available = computed(
    () => this.state() !== 'blocked' || this.secondsUntilResume() === 0,
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.stopTicking());
  }

  /**
   * Envoie le texte au proxy. Rend le texte normalisé, ou `null` si la
   * normalisation a échoué — l'appelant garde alors son texte d'origine.
   */
  async normalize(text: string): Promise<string | null> {
    const source = text.trim();
    if (!source) {
      this.fail('empty');
      return null;
    }
    if (source.length > MAX_INPUT_CHARS) {
      this.fail('too_large');
      return null;
    }

    this.state.set('running');
    this.errorReason.set(null);

    // Clé personnelle : on parle au fournisseur directement, le site n'est ni
    // sur le chemin ni sur la facture.
    if (this.byok.configured()) return this.viaOwnKey(source);

    let payload: NormalizeResponse;
    try {
      const response = await fetch('/api/normalize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: source, locale: this.i18n.locale() }),
      });
      payload = (await response.json()) as NormalizeResponse;
    } catch {
      this.fail('upstream');
      return null;
    }

    if (payload.status === 'ok') {
      this.reset();
      return payload.text;
    }

    if (payload.status === 'blocked') {
      this.blockedReason.set(payload.reason);
      this.resumesAt.set(payload.resumesAt ? Date.parse(payload.resumesAt) : null);
      this.state.set('blocked');
      this.startTicking();
      return null;
    }

    this.fail(payload.reason);
    return null;
  }

  /**
   * Appel direct au fournisseur choisi, avec la clé de la personne.
   *
   * Aucun compte à rebours ici : les quotas d'une clé personnelle ne sont pas
   * ceux du site, et le fournisseur ne les expose pas de façon uniforme. En cas
   * de refus on le dit, sans prétendre savoir quand ça repartira.
   */
  private async viaOwnKey(text: string): Promise<string | null> {
    const provider = this.byok.provider();
    if (!provider) {
      this.fail('misconfigured');
      return null;
    }

    try {
      const response = await fetch(provider.endpoint, {
        method: 'POST',
        headers: requestHeaders(provider, this.byok.key()),
        body: JSON.stringify(requestBody(provider, SYSTEM_PROMPT(this.i18n.locale()), text)),
      });

      if (response.status === 401 || response.status === 403) {
        this.fail('misconfigured');
        return null;
      }
      if (!response.ok) {
        this.blockedReason.set('rate_limit');
        this.resumesAt.set(null);
        this.state.set('blocked');
        return null;
      }

      const reply = readReply(provider, await response.json());
      if (!reply) {
        this.fail('upstream');
        return null;
      }
      this.reset();
      return reply;
    } catch {
      this.fail('upstream');
      return null;
    }
  }

  reset(): void {
    this.stopTicking();
    this.state.set('idle');
    this.blockedReason.set(null);
    this.errorReason.set(null);
    this.resumesAt.set(null);
  }

  private fail(reason: ErrorReason): void {
    this.errorReason.set(reason);
    this.state.set('error');
  }

  private startTicking(): void {
    if (this.ticker) return;
    this.now.set(Date.now());
    this.ticker = setInterval(() => {
      this.now.set(Date.now());
      if (this.secondsUntilResume() === 0) this.reset();
    }, 1000);
  }

  private stopTicking(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
  }
}

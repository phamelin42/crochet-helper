import { Service, computed, inject, signal } from '@angular/core';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { RavelryAccess } from '../../../core/ravelry/ravelry-access';
import { RAVELRY_CLIENT } from '../../../core/ravelry/ravelry-client.token';
import type {
  RavelryCard,
  RavelryCraft,
  RavelryDetail,
  RavelryRefusal,
} from '../../../core/ravelry/ravelry.model';

export type LoadStatus = 'idle' | 'loading' | 'ok' | 'error';

/** Tranche du nombre de résultats : la mesure ne reçoit jamais le terme ni un compte exact. */
function bucket(n: number): string {
  return n === 0 ? '0' : n < 10 ? '1-9' : n < 20 ? '10-19' : '20+';
}

/**
 * État de la recherche et de la fiche. Vit à la racine : en revenant d'une fiche
 * (« Retour »), les résultats déjà chargés, « Voir plus » compris, sont encore là.
 */
@Service()
export class DiscoverStore {
  private readonly client = inject(RAVELRY_CLIENT);
  private readonly base = inject(RavelryAccess).baseUrl;
  private readonly analytics = inject(AnalyticsService);

  readonly q = signal('');
  readonly craft = signal<RavelryCraft>('crochet');
  readonly patrons = signal<readonly RavelryCard[]>([]);
  readonly status = signal<LoadStatus>('idle');
  readonly error = signal<RavelryRefusal | null>(null);
  /** Secondes à attendre, quand Ravelry limite le débit. */
  readonly wait = signal<number | null>(null);
  readonly moreBusy = signal(false);
  readonly moreError = signal<RavelryRefusal | null>(null);
  private readonly page = signal(0);
  private readonly pages = signal(0);
  readonly hasMore = computed(() => this.status() === 'ok' && this.page() < this.pages());

  readonly detail = signal<RavelryDetail | null>(null);
  readonly detailStatus = signal<LoadStatus>('idle');
  readonly detailError = signal<RavelryRefusal | null>(null);

  /** Numéro de la dernière demande : une réponse plus ancienne est ignorée. */
  private ticket = 0;
  private detailTicket = 0;

  async search(q: string, craft: RavelryCraft): Promise<void> {
    const mine = ++this.ticket;
    this.q.set(q);
    this.craft.set(craft);
    this.patrons.set([]);
    this.page.set(0);
    this.pages.set(0);
    this.error.set(null);
    this.wait.set(null);
    this.moreError.set(null);
    this.moreBusy.set(false);
    this.status.set('loading');

    const result = await this.client.search(this.base, { q, craft, page: 1 });
    if (mine !== this.ticket) return;
    if (!result.ok) {
      this.status.set('error');
      this.error.set(result.raison);
      this.wait.set(result.attente ?? null);
      return;
    }
    this.patrons.set(result.data.patrons);
    this.page.set(result.data.page);
    this.pages.set(result.data.pages);
    this.status.set('ok');
    this.analytics.track('pattern_searched', {
      craft,
      resultats: bucket(result.data.patrons.length),
    });
  }

  /** Relance seulement si la demande diffère de celle déjà affichée (retour de fiche, rechargement). */
  async ensure(q: string, craft: RavelryCraft): Promise<void> {
    const same = q === this.q() && craft === this.craft();
    if (same && (this.status() === 'ok' || this.status() === 'loading')) return;
    await this.search(q, craft);
  }

  retry(): Promise<void> {
    return this.search(this.q(), this.craft());
  }

  async more(): Promise<void> {
    if (!this.hasMore() || this.moreBusy()) return;
    const mine = this.ticket;
    this.moreBusy.set(true);
    this.moreError.set(null);
    const result = await this.client.search(this.base, {
      q: this.q(),
      craft: this.craft(),
      page: this.page() + 1,
    });
    if (mine !== this.ticket) return;
    this.moreBusy.set(false);
    if (!result.ok) {
      this.moreError.set(result.raison);
      return;
    }
    const known = new Set(this.patrons().map((p) => p.id));
    this.patrons.update((list) => [
      ...list,
      ...result.data.patrons.filter((p) => !known.has(p.id)),
    ]);
    this.page.set(result.data.page);
    this.pages.set(result.data.pages);
  }

  async openPattern(id: number): Promise<void> {
    if (this.detailStatus() === 'ok' && this.detail()?.id === id) return;
    const mine = ++this.detailTicket;
    this.detail.set(null);
    this.detailError.set(null);
    this.detailStatus.set('loading');
    const result = await this.client.pattern(this.base, id);
    if (mine !== this.detailTicket) return;
    if (!result.ok) {
      this.detailStatus.set('error');
      this.detailError.set(result.raison);
      return;
    }
    this.detail.set(result.data);
    this.detailStatus.set('ok');
    this.analytics.track('pattern_viewed');
  }
}

import { Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { RavelryAccess } from '../../../core/ravelry/ravelry-access';
import { RAVELRY_CLIENT } from '../../../core/ravelry/ravelry-client.token';
import { RAVELRY_MODE_TOKEN } from '../../../core/ravelry/ravelry-connection-config';
import { RavelrySession } from '../../../core/ravelry/ravelry-session.service';
import type {
  RavelryCard,
  RavelryCraft,
  RavelryDetail,
  RavelryProject,
  RavelryRefusal,
  RavelryResult,
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
  private readonly session = inject(RavelrySession);
  private readonly mode = inject(RAVELRY_MODE_TOKEN);

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

  /** Ouvrages réalisés avec le patron ouvert (fiche 62) : jamais demandés sans connexion. */
  readonly projects = signal<readonly RavelryProject[]>([]);
  readonly projectsStatus = signal<LoadStatus>('idle');
  readonly projectsError = signal<RavelryRefusal | null>(null);
  readonly projectsMoreBusy = signal(false);
  private readonly projectsPage = signal(0);
  private readonly projectsPages = signal(0);
  private projectsFor: number | null = null;
  private projectsTicket = 0;
  readonly hasMoreProjects = computed(
    () => this.projectsStatus() === 'ok' && this.projectsPage() < this.projectsPages(),
  );

  constructor() {
    // Une lectrice qui se déconnecte (ou dont la connexion expire) ne laisse rien derrière elle :
    // résultats, fiche et ouvrages venaient de son compte.
    let wasConnected = false;
    effect(() => {
      const connected = this.session.connected();
      if (wasConnected && !connected) untracked(() => this.reset());
      wasConnected = connected;
    });
  }

  private reset(): void {
    this.ticket++;
    this.detailTicket++;
    this.projectsTicket++;
    this.q.set('');
    this.patrons.set([]);
    this.status.set('idle');
    this.error.set(null);
    this.wait.set(null);
    this.moreBusy.set(false);
    this.moreError.set(null);
    this.page.set(0);
    this.pages.set(0);
    this.detail.set(null);
    this.detailStatus.set('idle');
    this.detailError.set(null);
    this.projects.set([]);
    this.projectsStatus.set('idle');
    this.projectsError.set(null);
    this.projectsMoreBusy.set(false);
    this.projectsPage.set(0);
    this.projectsPages.set(0);
    this.projectsFor = null;
  }

  /**
   * Un appel au Worker au nom de la lectrice. En mode `compte`, sans connexion, rien ne
   * part (le Worker refuserait de toute façon). Un 401 : un seul renouvellement, une seule
   * relance ; un jeton neuf refusé aussi perd la connexion, jamais de boucle.
   */
  private async call<T>(
    run: (token: string | null) => Promise<RavelryResult<T>>,
    needsToken = false,
  ): Promise<RavelryResult<T>> {
    const token = await this.session.accessToken();
    if (token === null && (needsToken || this.mode === 'compte')) {
      return { ok: false, raison: 'connexion-requise' };
    }
    const first = await run(token);
    if (token === null || first.ok || first.raison !== 'session-expiree') return first;
    const fresh = await this.session.refreshAfterRejection(token);
    if (fresh === null) return first;
    const second = await run(fresh);
    if (!second.ok && second.raison === 'session-expiree') await this.session.expire();
    return second;
  }

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

    const result = await this.call((t) => this.client.search(this.base, { q, craft, page: 1 }, t));
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
    const result = await this.call((t) =>
      this.client.search(this.base, { q: this.q(), craft: this.craft(), page: this.page() + 1 }, t),
    );
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
    const result = await this.call((t) => this.client.pattern(this.base, id, t));
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

  /** Ouvrages réalisés avec ce patron : seulement connectée, jamais demandés sinon. */
  async openProjects(id: number): Promise<void> {
    if (this.projectsFor === id && this.projectsStatus() !== 'error') return;
    if ((await this.session.accessToken()) === null) {
      this.projectsFor = null;
      this.projects.set([]);
      this.projectsStatus.set('idle');
      return;
    }
    const mine = ++this.projectsTicket;
    this.projectsFor = id;
    this.projects.set([]);
    this.projectsError.set(null);
    this.projectsMoreBusy.set(false);
    this.projectsPage.set(0);
    this.projectsPages.set(0);
    this.projectsStatus.set('loading');
    const result = await this.call(
      (t) => this.client.projects(this.base, id, 1, t as string),
      true,
    );
    if (mine !== this.projectsTicket) return;
    if (!result.ok) {
      this.projectsStatus.set('error');
      this.projectsError.set(result.raison);
      return;
    }
    this.projects.set(result.data.projets);
    this.projectsPage.set(result.data.page);
    this.projectsPages.set(result.data.pages);
    this.projectsStatus.set('ok');
  }

  async moreProjects(): Promise<void> {
    const id = this.projectsFor;
    if (id === null || !this.hasMoreProjects() || this.projectsMoreBusy()) return;
    const mine = this.projectsTicket;
    this.projectsMoreBusy.set(true);
    const result = await this.call(
      (t) => this.client.projects(this.base, id, this.projectsPage() + 1, t as string),
      true,
    );
    if (mine !== this.projectsTicket) return;
    this.projectsMoreBusy.set(false);
    if (!result.ok) {
      this.projectsError.set(result.raison);
      return;
    }
    const known = new Set(this.projects().map((p) => p.lien));
    this.projects.update((list) => [
      ...list,
      ...result.data.projets.filter((p) => !known.has(p.lien)),
    ]);
    this.projectsPage.set(result.data.page);
    this.projectsPages.set(result.data.pages);
  }
}

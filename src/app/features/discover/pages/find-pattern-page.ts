import {
  Component,
  afterNextRender,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale } from '../../../core/i18n/locale';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { RavelryAccess } from '../../../core/ravelry/ravelry-access';
import type { RavelryCraft } from '../../../core/ravelry/ravelry.model';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME } from '../../../core/seo/site';
import { Button } from '../../../shared/ui/button/button';
import { PatternCard } from '../../../shared/ui/pattern-card/pattern-card';
import { SearchField } from '../../../shared/ui/search-field/search-field';
import { Segmented, SegmentedOption } from '../../../shared/ui/segmented/segmented';
import { PatternDetail } from '../components/pattern-detail';
import { RavelryNote } from '../components/ravelry-note';
import { DISCOVER_COPY } from '../data/discover-copy';
import { DiscoverStore } from '../state/discover-store';

const CRAFTS: readonly RavelryCraft[] = ['crochet', 'knitting'];
const ID = /^[1-9]\d{0,9}$/;

/**
 * « Rechercher un patron » : la recherche de patrons gratuits (ADR-004) et, sur
 * la même page (`?id=`), la fiche d'un patron. Pré-rendue sans résultats ; les
 * résultats sont un îlot du navigateur. Tant que l'interrupteur est éteint
 * (`RAVELRY_URL` vide), la page dit « bientôt disponible » et n'est liée nulle part.
 */
@Component({
  selector: 'fil-find-pattern-page',
  imports: [Button, PatternCard, PatternDetail, RavelryNote, RouterLink, SearchField, Segmented],
  host: { class: 'wrap' },
  template: `
    <article class="discover">
      <h1>{{ heading() }}</h1>

      @if (!enabled) {
        <p class="discover-lead">{{ c.soon }}</p>
        <p>
          <a filButton="secondary" [routerLink]="i18n.link('reader')">{{ c.soonHome }}</a>
        </p>
      } @else {
        @if (patternId(); as id) {
          <fil-pattern-detail [id]="id" [backParams]="backParams()" />
        } @else {
          <p class="discover-lead">{{ c.intro }}</p>

          <p class="discover-label" id="discover-craft-label">{{ c.craftLabel }}</p>
          <fil-segmented
            name="discover-craft"
            labelledBy="discover-craft-label"
            [options]="craftOptions"
            [(selected)]="craftIndex"
          />

          <fil-search-field
            [label]="c.fieldLabel"
            [buttonLabel]="c.search"
            [placeholder]="c.placeholder"
            [busy]="store.status() === 'loading'"
            [(value)]="text"
            (submitted)="onSearch($event)"
          />
          <p class="hint">{{ c.tip }}</p>
          @if (needTerm()) {
            <p role="alert" class="discover-alert">{{ c.needTerm }}</p>
          }

          <div class="discover-status" role="status">
            @switch (store.status()) {
              @case ('loading') {
                {{ c.loading }}
              }
              @case ('ok') {
                {{ store.patrons().length ? c.found(store.patrons().length) : c.none(store.q()) }}
              }
            }
          </div>

          @if (store.status() === 'error') {
            <div role="alert" class="discover-alert">
              <p>{{ c.refusal(store.error() ?? 'indisponible', store.wait()) }}</p>
              <button type="button" filButton="secondary" (click)="retry()">{{ c.retry }}</button>
            </div>
          }

          @if (store.status() === 'ok' && store.patrons().length) {
            <h2>{{ c.resultsFor(store.q()) }}</h2>
            <ul class="discover-grid">
              @for (patron of store.patrons(); track patron.id) {
                <li>
                  <fil-pattern-card
                    [name]="patron.nom"
                    [designer]="patron.designer ? c.by(patron.designer) : ''"
                    [thumbnail]="patron.vignette"
                    [tag]="c.free"
                    [link]="i18n.link('findPattern')"
                    [queryParams]="cardParams(patron.id)"
                  />
                </li>
              }
            </ul>
            @if (store.moreError(); as raison) {
              <p role="alert" class="discover-alert">{{ c.refusal(raison, null) }}</p>
            }
            @if (store.hasMore()) {
              <p>
                <button
                  type="button"
                  filButton="secondary"
                  [disabled]="store.moreBusy()"
                  (click)="store.more()"
                >
                  {{ store.moreBusy() ? c.moreLoading : c.more }}
                </button>
              </p>
            }
          }

          <p>
            <a [routerLink]="i18n.link('myFavorites')">{{ c.favoritesLink }}</a>
          </p>
        }
        <fil-ravelry-note [text]="c.note" />
      }
    </article>
  `,
})
export default class FindPatternPage {
  protected readonly i18n = inject(I18nService);
  protected readonly store = inject(DiscoverStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly title = inject(Title);
  protected readonly enabled = inject(RavelryAccess).enabled;

  private readonly locale: Locale =
    (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = DISCOVER_COPY[this.locale];

  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private readonly qParam = computed(() => (this.params().get('q') ?? '').trim().slice(0, 100));
  private readonly craftParam = computed<RavelryCraft>(() =>
    this.params().get('craft') === 'knitting' ? 'knitting' : 'crochet',
  );
  protected readonly patternId = computed(() => {
    const id = this.params().get('id');
    return id !== null && ID.test(id) ? Number(id) : null;
  });
  /** Adresse des résultats, pour « Retour aux résultats » depuis la fiche. */
  protected readonly backParams = computed((): Record<string, string> => {
    const q = this.qParam();
    return q ? { q, craft: this.craftParam() } : {};
  });
  protected readonly heading = computed(() =>
    this.patternId() ? (this.store.detail()?.nom ?? this.c.h1) : this.c.h1,
  );

  protected readonly craftOptions: SegmentedOption[] = [
    { value: 0, label: this.c.crochet },
    { value: 1, label: this.c.knitting },
  ];
  protected readonly craftIndex = linkedSignal(() => (this.craftParam() === 'knitting' ? 1 : 0));
  protected readonly text = linkedSignal(() => this.qParam());
  protected readonly needTerm = signal(false);
  /** Vrai une fois dans le navigateur : rien ne part au pré-rendu. */
  private readonly ready = signal(false);

  constructor() {
    this.i18n.setLocale(this.locale);
    this.seo.apply({
      title: this.c.title,
      description: this.c.description,
      path: ROUTE_PATHS.findPattern,
      locale: this.locale,
      noIndex: true,
    });
    afterNextRender(() => this.ready.set(true));

    // La requête de l'adresse (`?q=&craft=`) fait foi : « Retour » retrouve les résultats.
    effect(() => {
      const q = this.qParam();
      const craft = this.craftParam();
      if (!this.ready() || !this.enabled || !q || this.patternId()) return;
      untracked(() => void this.store.ensure(q, craft));
    });
    effect(() => {
      const nom = this.patternId() ? this.store.detail()?.nom : null;
      this.title.setTitle(nom ? `${nom} — ${SITE_NAME}` : this.c.title);
    });
  }

  protected onSearch(q: string): void {
    if (!q) {
      this.needTerm.set(true);
      return;
    }
    this.needTerm.set(false);
    const craft = CRAFTS[this.craftIndex()] ?? 'crochet';
    if (q === this.qParam() && craft === this.craftParam() && !this.patternId()) {
      void this.store.search(q, craft);
    } else {
      void this.router.navigate([], { relativeTo: this.route, queryParams: { q, craft } });
    }
  }

  protected retry(): void {
    void this.store.retry();
  }

  protected cardParams(id: number): Record<string, string> {
    return { q: this.store.q(), craft: this.store.craft(), id: String(id) };
  }
}

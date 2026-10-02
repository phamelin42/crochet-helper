import {
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LocalStorageService } from '../../../core/storage/local-storage.service';
import { Button } from '../../../shared/ui/button/button';
import { InputField } from '../../../shared/ui/field/input';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { Segmented, SegmentedOption } from '../../../shared/ui/segmented/segmented';
import {
  ChartWarning,
  Convention,
  Group,
  Round,
  Token,
  findSymbol,
  renderPattern,
  renderRound,
  stitchCount,
  warnings,
} from '../data/chart-composer';
import type { Recognition } from '../data/chart-recognition';
import { CHART_SYMBOLS, symbolName, symbolUrl } from '../data/chart-symbols';
import { appendTranscription, defaultPieceName } from '../data/chart-transcription';
import { COMPOSER_COPY, ComposerKey } from '../data/chart-composer-copy';
import { READER_COPY } from '../data/reader-copy';
import { ReaderStore } from '../state/reader-store';
import type { ShownPhoto } from '../state/reader-store';
import { ChartViewer } from './chart-viewer';

const DRAFT_KEY = 'fil.chartDraft';
const CONVENTIONS: readonly Convention[] = ['US', 'UK', 'FR'];
/** Bornes d'un brouillon relu : un stockage altéré ne doit rien pouvoir faire grossir. */
const MAX_ROUNDS = 200;
const MAX_TOKENS = 60;
const MAX_COUNT = 99;
const MAX_NAME = 60;

interface Draft {
  rounds: readonly Round[];
  groups: readonly Group[];
  pending: readonly Token[];
  convention: number;
  kind: number;
  into: number;
  name: string;
}

const EMPTY_DRAFT: Draft = {
  rounds: [],
  groups: [],
  pending: [],
  convention: -1,
  kind: 0,
  into: 0,
  name: '',
};

const int = (value: unknown, min: number, max: number, fallback: number): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;

function readTokens(value: unknown): Token[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_TOKENS)
    .filter((t): t is Token => !!t && typeof t === 'object' && !!findSymbol((t as Token).symbol))
    .map((t) => ({ symbol: t.symbol, count: int(t.count, 1, MAX_COUNT, 1) }));
}

function readGroups(value: unknown): Group[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_TOKENS).flatMap((g) => {
    if (!g || typeof g !== 'object') return [];
    const tokens = readTokens((g as Group).tokens);
    return tokens.length ? [{ tokens, repeat: int((g as Group).repeat, 1, MAX_COUNT, 1) }] : [];
  });
}

/** Relit le brouillon du stockage en le revalidant : toute forme inattendue devient « pas de brouillon ». */
function readDraft(raw: unknown): Draft {
  if (!raw || typeof raw !== 'object') return EMPTY_DRAFT;
  const draft = raw as Partial<Draft>;
  const rounds = Array.isArray(draft.rounds)
    ? draft.rounds.slice(0, MAX_ROUNDS).flatMap((r): Round[] => {
        if (!r || typeof r !== 'object') return [];
        const groups = readGroups((r as Round).groups);
        if (!groups.length) return [];
        const into = (r as Round).into;
        return [
          {
            kind: (r as Round).kind === 'row' ? 'row' : 'round',
            groups,
            ...(into === 'magic-ring' || into === 'chain' ? { into } : {}),
          },
        ];
      })
    : [];
  return {
    rounds,
    groups: readGroups(draft.groups),
    pending: readTokens(draft.pending),
    convention: int(draft.convention, -1, 2, -1),
    kind: int(draft.kind, 0, 1, 0),
    into: int(draft.into, 0, 2, 0),
    name: typeof draft.name === 'string' ? draft.name.slice(0, MAX_NAME) : '',
  };
}

/**
 * Composeur de transcription : la lectrice touche les symboles qu'elle voit
 * sur le diagramme, l'outil écrit le tour, compte les mailles et signale les
 * incohérences. « Ajouter au patron » écrit le résultat en nouvelle pièce ;
 * le brouillon survit à un rechargement tant qu'il n'est pas ajouté.
 *
 * Mode `open` (« Ouvrir un diagramme ») : les tours arrivent pré-remplis par
 * la lecture automatique (`seed`), la lectrice les relit et les corrige, et
 * « Découper en étapes » émet le patron écrit (`composed`) au lieu de
 * l'ajouter au projet actif. Ce mode ne touche pas au brouillon enregistré.
 */
@Component({
  selector: 'fil-chart-composer',
  imports: [Button, ChartViewer, Dialog, InputField, Segmented],
  template: `
    <fil-dialog [(open)]="open" [label]="title()" [wide]="true">
      @if (open()) {
        <h2 class="dialog-title">{{ title() }}</h2>
        @if (mode() === 'open') {
          <p class="dialog-body">{{ t('ui.composeOpenIntro') }}</p>
          @if (readingNote(); as note) {
            <p class="hint" role="status">{{ note }}</p>
          }
        }
        <div class="compose">
          @if (chart(); as chart) {
            <div class="compose-chart">
              <fil-chart-viewer [chart]="chart" [label]="label()" />
            </div>
          }

          <div class="compose-options">
            <div class="compose-field">
              <span>{{ t('ui.composeConvention') }}</span>
              <fil-segmented
                name="compose-convention"
                [label]="t('ui.composeConvention')"
                [options]="conventionOptions"
                [(selected)]="convention"
              />
            </div>
            <div class="compose-field">
              <span>{{ t('ui.composeKind') }}</span>
              <fil-segmented
                name="compose-kind"
                [label]="t('ui.composeKind')"
                [options]="kindOptions()"
                [(selected)]="kind"
              />
            </div>
            @if (!rounds().length) {
              <div class="compose-field">
                <span>{{ t('ui.composeInto') }}</span>
                <fil-segmented
                  name="compose-into"
                  [label]="t('ui.composeInto')"
                  [options]="intoOptions()"
                  [(selected)]="into"
                />
              </div>
            }
          </div>

          <!-- En relecture, la palette ne sert qu'à corriger ou ajouter un tour :
               les tours lus viennent juste sous le diagramme. -->
          @if (palette()) {
            <div class="compose-palette" role="group" [attr.aria-label]="t('ui.composePalette')">
              @for (symbol of symbols; track symbol.id) {
                <button
                  type="button"
                  filButton="secondary"
                  class="compose-symbol"
                  [attr.aria-label]="symbolLabel(symbol.id)"
                  (click)="tap(symbol.id)"
                >
                  <img class="symbol-img" [src]="url(symbol.id)" alt="" width="32" height="32" />
                  <span>{{ abbr(symbol.id) }}</span>
                </button>
              }
            </div>

            <section class="compose-current" [attr.aria-label]="t('ui.composeCurrent')">
              <h3 class="compose-heading">
                {{ currentHeading() }}
                <span class="compose-count" data-testid="current-count"
                  >{{ currentCount() }} {{ t('ui.composeStitches') }}</span
                >
              </h3>
              @if (groups().length || pending().length) {
                <ul class="compose-chips">
                  @for (group of groups(); track $index) {
                    <li class="compose-chip">
                      <span>{{ groupText(group) }}</span>
                      <button type="button" filButton="ghost" (click)="removeGroup($index)">
                        {{ t('ui.composeRemoveToken') }}
                        <span class="visually-hidden">{{ groupText(group) }}</span>
                      </button>
                    </li>
                  }
                  @for (token of pending(); track $index) {
                    <li class="compose-chip">
                      <span>{{ tokenText(token) }}</span>
                      <button type="button" filButton="ghost" (click)="removeToken($index)">
                        {{ t('ui.composeRemoveToken') }}
                        <span class="visually-hidden">{{ tokenText(token) }}</span>
                      </button>
                    </li>
                  }
                </ul>
              } @else {
                <p class="hint">{{ t('ui.composeHint') }}</p>
              }
              <div class="compose-actions">
                <label class="compose-repeat">
                  <span>{{ t('ui.composeRepeat') }}</span>
                  <input
                    filInput
                    type="number"
                    inputmode="numeric"
                    min="2"
                    [max]="MAX_COUNT"
                    [value]="repeatN()"
                    (input)="setRepeat($event)"
                  />
                </label>
                <button
                  type="button"
                  filButton="secondary"
                  [disabled]="!pending().length || repeatN() < 2"
                  (click)="repeatSelection()"
                >
                  {{ t('ui.composeRepeatDo') }}
                </button>
                <button
                  type="button"
                  filButton="primary"
                  [disabled]="!groups().length && !pending().length"
                  (click)="finishRound()"
                >
                  {{ t('ui.composeFinish') }}
                </button>
              </div>
            </section>
          }

          <section class="compose-rounds" [attr.aria-label]="t('ui.composeRounds')">
            <h3 class="compose-heading">{{ t('ui.composeRounds') }}</h3>
            @if (rounds().length) {
              <ol class="compose-list">
                @for (round of rounds(); track $index) {
                  <li [attr.aria-current]="editing() === $index ? 'step' : null">
                    <span data-testid="written-round">{{ line(round, $index + 1) }}</span>
                    <button
                      type="button"
                      filButton="ghost"
                      [disabled]="busy()"
                      (click)="editRound($index)"
                    >
                      {{ t('ui.composeEditRound') }}
                      <span class="visually-hidden">{{ $index + 1 }}</span>
                    </button>
                    <button type="button" filButton="ghost" (click)="removeRound($index)">
                      {{ t('ui.composeRemoveRound') }}
                      <span class="visually-hidden">{{ $index + 1 }}</span>
                    </button>
                  </li>
                }
              </ol>
            } @else {
              <p class="hint">{{ t('ui.composeNoRounds') }}</p>
            }
            @if (!palette()) {
              <button type="button" filButton="secondary" (click)="adding.set(true)">
                {{ t('ui.composeAddRound') }}
              </button>
            }
            @if (messages().length) {
              <ul class="compose-warnings" role="status">
                @for (message of messages(); track message) {
                  <li>{{ message }}</li>
                }
              </ul>
            }
          </section>

          <label class="compose-field">
            <span>{{ t('ui.composeName') }}</span>
            <input
              filInput
              type="text"
              autocomplete="off"
              [maxLength]="MAX_NAME"
              [value]="name()"
              [placeholder]="defaultName()"
              (input)="name.set($any($event.target).value)"
            />
          </label>
        </div>
        <div class="dialog-actions">
          <button type="button" filButton="ghost" (click)="open.set(false)">
            {{ closeLabel() }}
          </button>
          <button type="button" filButton="primary" [disabled]="!canAdd()" (click)="add()">
            {{ mode() === 'open' ? t('ui.composeOpenAdd') : t('ui.composeAdd') }}
          </button>
        </div>
      }
    </fil-dialog>
  `,
})
export class ChartComposer {
  readonly open = model(false);
  readonly chart = input<ShownPhoto | null>(null);
  readonly label = input('');
  /** `transcribe` : ajoute une pièce au patron actif. `open` : relit une lecture automatique. */
  readonly mode = input<'transcribe' | 'open'>('transcribe');
  /** Lecture automatique du diagramme, en mode `open`. */
  readonly seed = input<Recognition | null>(null);
  /** Mode `open` : le patron écrit, relu par la lectrice. */
  readonly composed = output<string>();

  private readonly store = inject(ReaderStore);
  private readonly i18n = inject(I18nService);
  private readonly storage = inject(LocalStorageService);

  private readonly analytics = inject(AnalyticsService);

  protected t = (key: ComposerKey) => COMPOSER_COPY[this.i18n.locale()][key];
  protected readonly closeLabel = computed(() => READER_COPY[this.i18n.locale()]['ui.photoClose']);

  protected readonly symbols = CHART_SYMBOLS;
  protected readonly url = symbolUrl;
  protected readonly MAX_COUNT = MAX_COUNT;
  protected readonly MAX_NAME = MAX_NAME;
  protected readonly conventionOptions: readonly SegmentedOption[] = CONVENTIONS.map(
    (label, value) => ({ value, label }),
  );

  private readonly draft = readDraft(this.storage.read<unknown>(DRAFT_KEY));

  /** Convention de la page (FR sous /fr, US ailleurs) tant que la lectrice n'en a pas choisi une. */
  protected readonly convention = linkedSignal(() =>
    this.draft.convention >= 0 ? this.draft.convention : this.i18n.locale() === 'fr' ? 2 : 0,
  );
  protected readonly kind = signal(this.draft.kind);
  protected readonly into = signal(this.draft.into);
  protected readonly rounds = signal<readonly Round[]>(this.draft.rounds);
  protected readonly groups = signal<readonly Group[]>(this.draft.groups);
  protected readonly pending = signal<readonly Token[]>(this.draft.pending);
  protected readonly repeatN = signal(6);
  protected readonly name = signal(this.draft.name);
  /** Tour repris pour correction : « Terminer le tour » le remplace à sa place. */
  protected readonly editing = signal<number | null>(null);
  /** Relecture : la lectrice a demandé à ajouter un tour que la lecture a manqué. */
  protected readonly adding = signal(false);
  /** Un tour en cours de composition : on ne peut pas en reprendre un autre sans le perdre. */
  protected readonly busy = computed(() => this.groups().length > 0 || this.pending().length > 0);

  protected readonly palette = computed(
    () =>
      this.mode() !== 'open' ||
      this.editing() !== null ||
      this.adding() ||
      this.busy() ||
      !this.rounds().length,
  );

  protected readonly title = computed(() =>
    this.t(this.mode() === 'open' ? 'ui.composeOpenTitle' : 'ui.composeTitle'),
  );
  protected readonly currentHeading = computed(() => {
    const editing = this.editing();
    return editing === null
      ? this.t('ui.composeCurrent')
      : this.t('ui.composeEditing').replace('{n}', String(editing + 1));
  });
  protected readonly readingNote = computed(() => {
    const seed = this.seed();
    if (!seed) return '';
    if (!seed.rounds.length) return this.t('ui.composeOpenNothing');
    if (seed.uncertain) {
      return this.t('ui.composeOpenUncertain').replace('{n}', String(seed.uncertain));
    }
    return '';
  });

  private readonly conv = computed(() => CONVENTIONS[this.convention()]);

  protected readonly kindOptions = computed<SegmentedOption[]>(() => [
    { value: 0, label: this.t('ui.composeKindRound') },
    { value: 1, label: this.t('ui.composeKindRow') },
  ]);
  protected readonly intoOptions = computed<SegmentedOption[]>(() => [
    { value: 0, label: this.t('ui.composeIntoNone') },
    { value: 1, label: this.t('ui.composeIntoRing') },
    { value: 2, label: this.t('ui.composeIntoChain') },
  ]);

  /** Le tour en cours de composition, tel qu'il serait écrit maintenant. */
  private readonly current = computed<Round | null>(() => {
    const groups = [
      ...this.groups(),
      ...(this.pending().length ? [{ tokens: this.pending(), repeat: 1 }] : []),
    ];
    if (!groups.length) return null;
    const editing = this.editing();
    const chosen = this.into() === 1 ? 'magic-ring' : this.into() === 2 ? 'chain' : undefined;
    // Un tour repris garde son début ; sinon le début ne vaut que pour le premier tour.
    const into = editing !== null ? this.rounds()[editing]?.into : !this.rounds().length && chosen;
    return {
      kind: this.kind() === 1 ? 'row' : 'round',
      groups,
      ...(into ? { into } : {}),
    };
  });
  protected readonly currentCount = computed(() => {
    const current = this.current();
    return current ? stitchCount(current) : 0;
  });

  private readonly all = computed(() => {
    const current = this.current();
    const editing = this.editing();
    if (!current) return this.rounds();
    if (editing === null) return [...this.rounds(), current];
    return this.rounds().map((round, i) => (i === editing ? current : round));
  });
  protected readonly canAdd = computed(() => this.all().length > 0);

  /** En mode `open`, le patron est neuf : aucune pièce existante à éviter. */
  protected readonly defaultName = computed(() =>
    defaultPieceName(
      this.mode() === 'open' ? [] : this.store.pieces().map((piece) => piece.name),
      this.t('ui.composeDefaultName'),
    ),
  );

  protected readonly messages = computed(() =>
    warnings(this.all()).map((warning) => this.warningText(warning)),
  );

  constructor() {
    // Une nouvelle lecture remplace le contenu du composeur de relecture.
    effect(() => {
      const seed = this.seed();
      if (this.mode() !== 'open') return;
      untracked(() => {
        const rounds = (seed?.rounds ?? []).slice(0, MAX_ROUNDS);
        this.rounds.set(rounds);
        this.groups.set([]);
        this.pending.set([]);
        this.editing.set(null);
        this.adding.set(false);
        this.name.set('');
        this.kind.set(rounds[0]?.kind === 'row' ? 1 : 0);
        this.into.set(0);
      });
    });

    // Le brouillon suit chaque geste : il n'attend ni la fermeture ni « Ajouter ».
    // La relecture d'une lecture automatique n'y touche pas : elle écraserait
    // une transcription en cours.
    effect(() => {
      if (this.mode() === 'open') return;
      const draft: Draft = {
        rounds: this.rounds(),
        groups: this.groups(),
        pending: this.pending(),
        convention: this.convention(),
        kind: this.kind(),
        into: this.into(),
        name: this.name(),
      };
      const blank = !draft.rounds.length && !draft.groups.length && !draft.pending.length;
      if (blank && !draft.name) this.storage.remove(DRAFT_KEY);
      else this.storage.write(DRAFT_KEY, draft);
    });
  }

  protected abbr(id: string): string {
    const symbol = findSymbol(id);
    if (!symbol) return '';
    const conv = this.conv();
    return conv === 'FR' ? symbol.fr : conv === 'UK' ? symbol.uk : symbol.us;
  }

  protected symbolLabel(id: string): string {
    const symbol = findSymbol(id);
    return symbol ? `${this.abbr(id)} — ${symbolName(symbol, this.i18n.locale())}` : '';
  }

  protected tokenText(token: Token): string {
    return `${token.count} × ${this.abbr(token.symbol)}`;
  }

  protected groupText(group: Group): string {
    return `${group.tokens.map((token) => this.tokenText(token)).join(', ')} × ${group.repeat}`;
  }

  protected line(round: Round, index: number): string {
    return renderRound(round, index, this.conv());
  }

  private warningText(warning: ChartWarning): string {
    const key: ComposerKey =
      warning.kind === 'empty'
        ? 'ui.composeWarnEmpty'
        : warning.kind === 'jump'
          ? 'ui.composeWarnJump'
          : 'ui.composeWarnRepeat';
    return this.t(key).replace('{n}', String(warning.round));
  }

  /** Toucher le même symbole que le précédent en ajoute un au jeton, sinon ouvre un nouveau jeton. */
  protected tap(symbol: string): void {
    this.pending.update((tokens) => {
      const last = tokens[tokens.length - 1];
      if (last?.symbol === symbol) {
        if (last.count >= MAX_COUNT) return tokens;
        return [...tokens.slice(0, -1), { symbol, count: last.count + 1 }];
      }
      return tokens.length >= MAX_TOKENS ? tokens : [...tokens, { symbol, count: 1 }];
    });
  }

  protected setRepeat(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    this.repeatN.set(Number.isFinite(value) ? Math.min(MAX_COUNT, Math.max(0, value)) : 0);
  }

  protected repeatSelection(): void {
    if (!this.pending().length || this.repeatN() < 2) return;
    this.groups.update((groups) => [...groups, { tokens: this.pending(), repeat: this.repeatN() }]);
    this.pending.set([]);
  }

  protected removeToken(index: number): void {
    this.pending.update((tokens) => tokens.filter((_, i) => i !== index));
  }

  protected removeGroup(index: number): void {
    this.groups.update((groups) => groups.filter((_, i) => i !== index));
  }

  protected removeRound(index: number): void {
    const editing = this.editing();
    if (editing === index) {
      this.editing.set(null);
      this.groups.set([]);
      this.pending.set([]);
    } else if (editing !== null && index < editing) this.editing.set(editing - 1);
    this.rounds.update((rounds) => rounds.filter((_, i) => i !== index));
  }

  /**
   * Reprend un tour écrit pour le corriger. Un tour sans répétition revient
   * maille par maille, chacune retirable ; un tour à répétitions garde ses groupes.
   */
  protected editRound(index: number): void {
    const round = this.rounds()[index];
    if (!round || this.busy()) return;
    const plain = round.groups.every((group) => group.repeat === 1);
    this.groups.set(plain ? [] : round.groups);
    this.pending.set(plain ? round.groups.flatMap((group) => group.tokens) : []);
    this.kind.set(round.kind === 'row' ? 1 : 0);
    this.editing.set(index);
  }

  protected finishRound(): void {
    const current = this.current();
    if (!current) return;
    const editing = this.editing();
    this.rounds.update((rounds) =>
      editing !== null
        ? rounds.map((round, i) => (i === editing ? current : round))
        : rounds.length >= MAX_ROUNDS
          ? rounds
          : [...rounds, current],
    );
    this.editing.set(null);
    this.adding.set(false);
    this.groups.set([]);
    this.pending.set([]);
  }

  protected add(): void {
    const rounds = this.all();
    if (!rounds.length) return;
    const open = this.mode() === 'open';
    // La nouvelle pièce vient après toutes les autres : la position de lecture ne bouge pas.
    const text = appendTranscription(
      open ? '' : this.store.source(),
      this.name(),
      renderPattern(rounds, this.conv()),
      this.defaultName(),
    );
    if (open) this.composed.emit(text);
    else this.store.source.set(text);
    this.analytics.track('chart_transcribed', {
      rounds: rounds.length,
      convention: this.conv(),
      origine: open ? 'lecture' : 'composeur',
    });
    this.editing.set(null);
    this.rounds.set([]);
    this.groups.set([]);
    this.pending.set([]);
    this.name.set('');
    this.open.set(false);
  }
}

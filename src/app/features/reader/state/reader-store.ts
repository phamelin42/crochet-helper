import {
  DestroyRef,
  Service,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { AnalyticsService, roundToHundred } from '../../../core/analytics/analytics.service';
import { LocalStorageService } from '../../../core/storage/local-storage.service';
import { DEMO_PATTERN } from '../data/demo-pattern';
import { parsePattern } from '../data/pattern-parser';
import { PdfEmptyTextError, normalizePdfPages } from '../data/pdf-normalize';
import { EMPTY_PATTERN, PatternPiece, PatternStep } from '../data/pattern.model';

const KEY = 'fil.reader.v1';
/** Au-delà, l'image n'est pas persistée : le quota localStorage est ~5 Mo. */
const MAX_PERSISTED_IMAGE = 1_500_000;

interface PersistedState {
  source: string;
  image: string;
  pieceIndex: number;
  stepIndex: number;
  done: Record<string, boolean>;
  reps: Record<string, number>;
  elapsed: number;
  expandAbbreviations: boolean;
}

/**
 * État du lecteur : le patron courant, la position dans les étapes, les
 * compteurs de répétition, l'avancement et le chronomètre de session.
 *
 * Tout est dérivé de `source` : le patron n'est jamais stocké sous forme
 * découpée, il est reparsé, ce qui garantit qu'une amélioration du parseur
 * profite aux patrons déjà enregistrés. La restauration se fait après le
 * premier rendu pour ne pas casser l'hydratation du HTML pré-rendu.
 */
@Service()
export class ReaderStore {
  private readonly storage = inject(LocalStorageService);
  private readonly analytics = inject(AnalyticsService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly restored = signal(false);
  private ticker: ReturnType<typeof setInterval> | null = null;
  private ticks = 0;

  readonly source = signal('');
  readonly image = signal('');
  readonly pieceIndex = signal(0);
  readonly stepIndex = signal(0);
  readonly done = signal<Record<string, boolean>>({});
  readonly reps = signal<Record<string, number>>({});
  readonly elapsed = signal(0);
  readonly running = signal(false);
  /** Affiche « maille serrée » au lieu de « ms ». Confort de lecture, pas un
   *  réglage de découpage : le texte source reste intact. */
  readonly expandAbbreviations = signal(false);

  readonly pdfImporting = signal(false);
  readonly pdfError = signal<'vide' | 'erreur' | null>(null);

  readonly pattern = computed(() => (this.source() ? parsePattern(this.source()) : EMPTY_PATTERN));
  readonly pieces = computed<readonly PatternPiece[]>(() => this.pattern().pieces);
  readonly piece = computed<PatternPiece | null>(() => this.pieces()[this.pieceIndex()] ?? null);
  readonly steps = computed<readonly PatternStep[]>(() => this.piece()?.steps ?? []);
  readonly step = computed<PatternStep | null>(() => this.steps()[this.stepIndex()] ?? null);
  readonly stepCount = computed(() => this.steps().length);
  readonly total = computed(() => this.pattern().total);
  readonly materials = computed(() => this.pattern().materials);

  readonly positionKey = computed(() => `${this.pieceIndex()}:${this.stepIndex()}`);
  readonly currentReps = computed(() => this.reps()[this.positionKey()] ?? 0);
  readonly isDone = computed(() => this.done()[this.positionKey()] === true);
  readonly doneCount = computed(() => Object.values(this.done()).filter(Boolean).length);
  readonly progress = computed(() =>
    this.stepCount() ? ((this.stepIndex() + 1) / this.stepCount()) * 100 : 0,
  );
  readonly hasPrevious = computed(
    () => !!this.step() && !(this.pieceIndex() === 0 && this.stepIndex() === 0),
  );
  readonly hasNext = computed(
    () =>
      !!this.step() &&
      !(this.pieceIndex() === this.pieces().length - 1 && this.stepIndex() >= this.stepCount() - 1),
  );

  constructor() {
    afterNextRender(() => {
      this.restore();
      this.restored.set(true);
    });

    effect(() => {
      const snapshot = this.snapshot();
      if (!this.restored()) return;
      this.storage.write(KEY, snapshot);
    });

    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  private readonly snapshot = computed<PersistedState>(() => ({
    source: this.source(),
    image: this.image().length <= MAX_PERSISTED_IMAGE ? this.image() : '',
    pieceIndex: this.pieceIndex(),
    stepIndex: this.stepIndex(),
    done: this.done(),
    reps: this.reps(),
    elapsed: this.elapsed(),
    expandAbbreviations: this.expandAbbreviations(),
  }));

  private restore(): void {
    const saved = this.storage.read<Partial<PersistedState>>(KEY);
    if (!saved) return;
    if (saved.source) this.analytics.track('session_resumed');
    this.source.set(saved.source ?? '');
    this.image.set(saved.image ?? '');
    this.done.set(saved.done ?? {});
    this.reps.set(saved.reps ?? {});
    this.elapsed.set(saved.elapsed ?? 0);
    this.expandAbbreviations.set(saved.expandAbbreviations ?? false);
    this.pieceIndex.set(Math.min(saved.pieceIndex ?? 0, Math.max(0, this.pieces().length - 1)));
    this.stepIndex.set(Math.min(saved.stepIndex ?? 0, Math.max(0, this.stepCount() - 1)));
  }

  /**
   * Charge un texte de patron. `keepPosition` sert à la restauration ;
   * `origine` distingue un patron collé, un PDF importé et l'exemple : seul un
   * patron collé compte comme `pattern_pasted`.
   */
  load(text: string, keepPosition = false, origine: 'saisie' | 'pdf' | 'exemple' = 'saisie'): void {
    this.pdfError.set(null);
    this.source.set(text);
    if (!keepPosition) {
      this.pieceIndex.set(0);
      this.stepIndex.set(0);
      this.done.set({});
      this.reps.set({});
    }
    this.pieceIndex.update((i) => Math.min(i, Math.max(0, this.pieces().length - 1)));
    this.stepIndex.update((i) => Math.min(i, Math.max(0, this.stepCount() - 1)));
    if (!text) return;
    if (origine === 'saisie') {
      this.analytics.track('pattern_pasted', { length: roundToHundred(text.length) });
    }
    this.analytics.track('pattern_parsed', {
      steps: this.total(),
      pieces: this.pieces().length,
      origine,
    });
  }

  loadDemo(): void {
    this.load(DEMO_PATTERN, false, 'exemple');
  }

  /**
   * Charge un PDF : lit le fichier, extrait le texte, le normalise, puis suit
   * le même chemin que `load`. Chemin unique pour le bouton, le collage et le
   * glisser-déposer d'un PDF.
   */
  async importPdf(file: File): Promise<void> {
    this.pdfImporting.set(true);
    this.pdfError.set(null);
    try {
      const { extractPdfPages } = await import('../data/pdf-extract');
      const pages = await extractPdfPages(file);
      const text = normalizePdfPages(pages);
      this.load(text, false, 'pdf');
      this.analytics.track('pdf_imported', { pages: pages.length });
    } catch (error) {
      const raison = error instanceof PdfEmptyTextError ? 'vide' : 'erreur';
      this.pdfError.set(raison);
      this.analytics.track('pdf_failed', { raison });
    } finally {
      this.pdfImporting.set(false);
    }
  }

  clear(): void {
    this.stopTimer();
    this.elapsed.set(0);
    this.image.set('');
    this.load('');
  }

  selectPiece(index: number): void {
    this.pieceIndex.set(index);
    this.stepIndex.set(0);
  }

  /** Avance ou recule d'une étape, en franchissant les frontières de pièce. */
  move(delta: number): void {
    if (!this.total()) return;
    const pieces = this.pieces();
    let pieceIndex = this.pieceIndex();
    let stepIndex = this.stepIndex() + delta;

    while (stepIndex < 0 && pieceIndex > 0) {
      pieceIndex--;
      stepIndex = pieces[pieceIndex].steps.length - 1;
    }
    while (pieceIndex < pieces.length - 1 && stepIndex >= pieces[pieceIndex].steps.length) {
      stepIndex -= pieces[pieceIndex].steps.length;
      pieceIndex++;
    }
    stepIndex = Math.max(0, Math.min(stepIndex, pieces[pieceIndex].steps.length - 1));

    this.pieceIndex.set(pieceIndex);
    this.stepIndex.set(stepIndex);
    this.analytics.track('step_advanced');
    if (!this.running()) this.startTimer();
  }

  /** Va à la n-ième étape (1-indexée) de la pièce courante. */
  goTo(oneBased: number): void {
    if (!this.stepCount()) return;
    this.stepIndex.set(Math.max(0, Math.min(this.stepCount() - 1, oneBased - 1)));
    this.analytics.track('step_advanced');
  }

  addRepeat(delta: number): void {
    const key = this.positionKey();
    this.reps.update((reps) => ({ ...reps, [key]: Math.max(0, (reps[key] ?? 0) + delta) }));
  }

  resetRepeat(): void {
    const key = this.positionKey();
    this.reps.update((reps) => ({ ...reps, [key]: 0 }));
  }

  toggleExpandAbbreviations(): void {
    this.expandAbbreviations.update((on) => !on);
  }

  /**
   * Avance en marquant l'étape courante terminée.
   *
   * C'est le geste attendu crochet en main : on ne passe à la suite que parce
   * qu'on vient de finir. Le retour arrière, lui, ne démarque rien — revenir
   * consulter une étape n'est pas la défaire.
   */
  advance(): void {
    if (!this.step()) return;
    const key = this.positionKey();
    this.done.update((done) => ({ ...done, [key]: true }));
    if (this.hasNext()) this.move(1);
  }

  setDone(value: boolean): void {
    const key = this.positionKey();
    this.done.update((done) => ({ ...done, [key]: value }));
    if (value && this.hasNext()) this.move(1);
  }

  setImage(dataUrl: string): void {
    this.image.set(dataUrl);
  }

  startTimer(): void {
    if (this.running() || this.ticker) return;
    this.running.set(true);
    let last = Date.now();
    this.ticker = setInterval(() => {
      const now = Date.now();
      this.elapsed.update((ms) => ms + (now - last));
      last = now;
      this.ticks++;
    }, 1000);
  }

  stopTimer(): void {
    this.running.set(false);
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
  }

  toggleTimer(): void {
    if (this.running()) {
      this.stopTimer();
    } else {
      this.startTimer();
    }
  }

  resetTimer(): void {
    this.stopTimer();
    this.elapsed.set(0);
  }
}

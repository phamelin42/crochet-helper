import {
  DestroyRef,
  Service,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { AnalyticsService, roundToHundred } from '../../../core/analytics/analytics.service';
import { LocalStorageService } from '../../../core/storage/local-storage.service';
import { ProjectStoreService } from '../../../core/storage/project-store.service';
import { DEMO_PATTERN } from '../data/demo-pattern';
import { parsePattern } from '../data/pattern-parser';
import { PdfEmptyTextError, normalizePdfPages } from '../data/pdf-normalize';
import { EMPTY_PATTERN, PatternPiece, PatternStep } from '../data/pattern.model';
import {
  BACKUP_SCHEMA_VERSION,
  LegacyReaderState,
  Project,
  ProjectBackup,
  deriveProjectName,
  legacyToProject,
  mergeProjects,
  parseBackup,
} from '../data/project.model';

/** Ancien état unique, écrit avant la fiche 16 : sert de source de migration. */
const LEGACY_KEY = 'fil.reader.v1';
/** Marque la migration comme faite — évite de la rejouer, et de ressusciter
 *  un patron qu'on aurait supprimé depuis. */
const MIGRATION_FLAG = 'fil.storage.migrated';
/** Pointeur — léger — vers le projet actif ; le reste vit dans IndexedDB. */
const CURRENT_ID_KEY = 'fil.currentProjectId';

/**
 * État du lecteur : le patron courant, la position dans les étapes, les
 * compteurs de répétition, l'avancement et le chronomètre de session — ainsi
 * que la liste des projets enregistrés.
 *
 * Tout est dérivé de `source` : le patron n'est jamais stocké sous forme
 * découpée, il est reparsé, ce qui garantit qu'une amélioration du parseur
 * profite aux patrons déjà enregistrés. Chaque projet est persisté dans
 * IndexedDB (voir `ProjectStoreService`), sans quota pratique ; seul
 * l'identifiant du projet actif vit dans `localStorage`. La restauration se
 * fait après le premier rendu pour ne pas casser l'hydratation du HTML
 * pré-rendu.
 */
@Service()
export class ReaderStore {
  private readonly storage = inject(LocalStorageService);
  private readonly projectStore = inject(ProjectStoreService);
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

  /** Projet actif, `null` avant tout patron chargé. */
  readonly currentId = signal<string | null>(null);
  /** Nom choisi explicitement pour le projet actif ; `null` tant qu'il suit le titre du patron. */
  private readonly nameOverride = signal<string | null>(null);
  readonly projects = signal<readonly Project[]>([]);
  readonly sortedProjects = computed(() =>
    [...this.projects()].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt),
  );

  readonly pattern = computed(() => (this.source() ? parsePattern(this.source()) : EMPTY_PATTERN));
  readonly pieces = computed<readonly PatternPiece[]>(() => this.pattern().pieces);
  readonly piece = computed<PatternPiece | null>(() => this.pieces()[this.pieceIndex()] ?? null);
  readonly steps = computed<readonly PatternStep[]>(() => this.piece()?.steps ?? []);
  readonly step = computed<PatternStep | null>(() => this.steps()[this.stepIndex()] ?? null);
  readonly stepCount = computed(() => this.steps().length);
  readonly total = computed(() => this.pattern().total);
  readonly materials = computed(() => this.pattern().materials);
  readonly currentName = computed(
    () => this.nameOverride() ?? deriveProjectName(this.pattern().title, this.source()),
  );

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
      void this.initialize();
    });

    // Persiste le projet actif à chaque changement de contenu, de position ou
    // de compteur. `untracked` isole la lecture de `projects` : sinon l'écriture
    // qu'on y fait à la fin de `persist()` redéclencherait cet effet en boucle.
    effect(() => {
      this.source();
      this.image();
      this.pieceIndex();
      this.stepIndex();
      this.done();
      this.reps();
      this.elapsed();
      this.expandAbbreviations();
      this.currentId();
      this.nameOverride();
      if (!this.restored()) return;
      void this.persist();
    });

    // Le pointeur vers le projet actif est la seule donnée qui reste dans
    // localStorage : assez petite pour ne jamais dépasser son quota.
    effect(() => {
      const id = this.currentId();
      if (!this.restored()) return;
      if (id) this.storage.write(CURRENT_ID_KEY, id);
      else this.storage.remove(CURRENT_ID_KEY);
    });

    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  /**
   * Migre l'ancien état localStorage si besoin, charge la liste des projets
   * depuis IndexedDB et reprend le projet pointé. Appelé une fois après le
   * premier rendu ; public pour que les tests puissent l'attendre directement.
   */
  async initialize(): Promise<void> {
    const unsaved = await this.migrateLegacyState();
    const list = await this.projectStore.list<Project>();
    this.projects.set(list);
    const pointer = this.storage.read<string>(CURRENT_ID_KEY);
    // Migration impossible (IndexedDB indisponible) : le patron en cours reste
    // affiché, en mémoire, et l'ancien stockage est gardé pour la prochaine fois.
    const project = unsaved ?? (pointer ? list.find((p) => p.id === pointer) : undefined);
    if (project) {
      this.hydrate(project);
      this.analytics.track('session_resumed');
    }
    this.restored.set(true);
  }

  /** Renvoie le projet issu de l'ancien état quand il n'a pas pu être enregistré. */
  private async migrateLegacyState(): Promise<Project | undefined> {
    if (this.storage.read<boolean>(MIGRATION_FLAG)) return undefined;
    const legacy = this.storage.read<LegacyReaderState>(LEGACY_KEY);
    if (legacy?.source) {
      const project = legacyToProject(
        legacy,
        parsePattern(legacy.source).title,
        crypto.randomUUID(),
        Date.now(),
      );
      const persisted = await this.projectStore.put(project);
      // IndexedDB indisponible pour l'instant : on retente à la prochaine
      // visite plutôt que d'effacer le seul exemplaire du patron.
      if (!persisted) return project;
      this.storage.write(CURRENT_ID_KEY, project.id);
    }
    this.storage.write(MIGRATION_FLAG, true);
    this.storage.remove(LEGACY_KEY);
    return undefined;
  }

  private async persist(): Promise<void> {
    const id = this.currentId();
    if (!id) return;
    const now = Date.now();
    const existing = untracked(() => this.projects()).find((p) => p.id === id);
    const project: Project = {
      id,
      name: this.currentName(),
      source: this.source(),
      image: this.image(),
      pieceIndex: this.pieceIndex(),
      stepIndex: this.stepIndex(),
      done: this.done(),
      reps: this.reps(),
      elapsed: this.elapsed(),
      expandAbbreviations: this.expandAbbreviations(),
      createdAt: existing?.createdAt ?? now,
      lastOpenedAt: existing?.lastOpenedAt ?? now,
    };
    await this.projectStore.put(project);
    this.projects.update((list) => [...list.filter((p) => p.id !== id), project]);
  }

  private hydrate(project: Project, touch = false): void {
    this.currentId.set(project.id);
    this.nameOverride.set(project.name || null);
    this.source.set(project.source);
    this.image.set(project.image);
    this.done.set(project.done);
    this.reps.set(project.reps);
    this.elapsed.set(project.elapsed);
    this.expandAbbreviations.set(project.expandAbbreviations);
    this.pieceIndex.set(Math.min(project.pieceIndex, Math.max(0, this.pieces().length - 1)));
    this.stepIndex.set(Math.min(project.stepIndex, Math.max(0, this.stepCount() - 1)));
    if (touch) {
      const touched: Project = { ...project, lastOpenedAt: Date.now() };
      this.projects.update((list) => list.map((p) => (p.id === touched.id ? touched : p)));
    }
  }

  /** Reprend un projet enregistré : c'est le clic « Reprendre » de l'écran de liste. */
  resumeProject(id: string): void {
    const project = this.projects().find((p) => p.id === id);
    if (!project) return;
    this.stopTimer();
    this.hydrate(project, true);
    this.analytics.track('project_resumed');
  }

  async renameProject(id: string, name: string): Promise<void> {
    const trimmed = name.trim();
    const project = this.projects().find((p) => p.id === id);
    if (!project) return;
    const updated: Project = { ...project, name: trimmed };
    if (id === this.currentId()) this.nameOverride.set(trimmed || null);
    await this.projectStore.put(updated);
    this.projects.update((list) => list.map((p) => (p.id === id ? updated : p)));
  }

  async removeProject(id: string): Promise<void> {
    // Le lecteur est vidé **avant** d'attendre la suppression : sinon un tic du
    // chronomètre pendant l'attente relancerait `persist()` et réécrirait le
    // projet qu'on vient d'effacer.
    if (id === this.currentId()) this.clear();
    this.projects.update((list) => list.filter((p) => p.id !== id));
    await this.projectStore.remove(id);
  }

  /** Fichier `.json` téléchargeable, tous les projets, avec le numéro de schéma. */
  exportBackup(): Blob {
    const backup: ProjectBackup = { version: BACKUP_SCHEMA_VERSION, projects: this.projects() };
    this.analytics.track('backup_exported', { projects: this.projects().length });
    return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  }

  /**
   * Réimporte une sauvegarde : fusion, jamais écrasement — un doublon garde la
   * version la plus récemment ouverte. Refuse en bloc un fichier dont le
   * numéro de schéma est inconnu, et n'importe rien si l'écriture échoue.
   */
  async importBackup(file: File): Promise<boolean> {
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      return false;
    }
    const backup = parseBackup(raw);
    if (!backup) return false;

    const current = this.projects();
    const merged = mergeProjects(current, backup.projects);
    // Une seule transaction : si le quota lâche, rien n'est importé.
    if (!(await this.projectStore.putAll(merged))) return false;
    this.projects.set(merged);

    // Si la sauvegarde apporte une version plus récente du projet ouvert, le
    // lecteur doit l'afficher : sinon le prochain `persist()` réécrirait
    // l'ancienne progression par-dessus celle qu'on vient d'importer.
    const id = this.currentId();
    const refreshed = id ? merged.find((p) => p.id === id) : undefined;
    if (refreshed && !current.includes(refreshed)) {
      this.stopTimer();
      this.hydrate(refreshed);
    }

    this.analytics.track('backup_imported', { projects: backup.projects.length });
    return true;
  }

  /**
   * Charge un texte de patron. `origine` distingue un patron collé, un PDF
   * importé et l'exemple : seul un patron collé compte comme `pattern_pasted`.
   *
   * Un texte différent du patron actif ouvre un **nouveau** projet : le projet
   * en cours reste intact dans la liste. Recharger le même texte garde le
   * projet et remet sa progression à zéro, comme avant la fiche 16.
   */
  load(text: string, origine: 'saisie' | 'pdf' | 'exemple' = 'saisie'): void {
    this.pdfError.set(null);
    if (text && this.currentId() && text !== this.source()) this.detach();
    this.source.set(text);
    this.pieceIndex.set(0);
    this.stepIndex.set(0);
    this.done.set({});
    this.reps.set({});
    if (!text) return;
    if (!this.currentId()) {
      this.currentId.set(crypto.randomUUID());
      this.analytics.track('project_created');
    }
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
    this.load(DEMO_PATTERN, 'exemple');
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
      this.load(text, 'pdf');
      this.analytics.track('pdf_imported', { pages: pages.length });
    } catch (error) {
      const raison = error instanceof PdfEmptyTextError ? 'vide' : 'erreur';
      this.pdfError.set(raison);
      this.analytics.track('pdf_failed', { raison });
    } finally {
      this.pdfImporting.set(false);
    }
  }

  /**
   * Vide le lecteur sans supprimer le projet en cours de son historique : il
   * reste dans la liste, dans l'état où il a été laissé. Un texte collé
   * ensuite ouvre un nouveau projet.
   */
  clear(): void {
    this.detach();
    this.load('');
  }

  /** Quitte le projet actif sans le modifier : il reste tel quel dans la liste. */
  private detach(): void {
    this.stopTimer();
    this.currentId.set(null);
    this.nameOverride.set(null);
    this.elapsed.set(0);
    this.image.set('');
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

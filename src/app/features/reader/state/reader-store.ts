import {
  DestroyRef,
  InjectionToken,
  Service,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { AnalyticsService, roundToHundred } from '../../../core/analytics/analytics.service';
import { DisplayPrefsService } from '../../../core/platform/display-prefs.service';
import { ObjectUrlService } from '../../../core/platform/object-url.service';
import { LocalStorageService } from '../../../core/storage/local-storage.service';
import { ProjectStoreService } from '../../../core/storage/project-store.service';
import type { PieceChart } from '../data/text-to-chart';
import { DEMO_PATTERN } from '../data/demo-pattern';
import { parsePattern } from '../data/pattern-parser';
import { SharedProgress } from '../data/project-link';
import type { ExtractedImage, ExtractedPdf } from '../data/pdf-extract';
import { EMPTY_PATTERN, PatternPiece, PatternStep } from '../data/pattern.model';
import {
  LegacyReaderState,
  Project,
  ProjectImage,
  deriveProjectName,
  fileIds,
  imageId,
  imageIds,
  legacyToProject,
  mergeProjects,
  type ReaderView,
} from '../data/project.model';
import { ColorGrid, validGrid } from '../data/color-grid';

/** Un diagramme prêt à être enregistré : image déjà réduite et encodée. */
export interface NewChart {
  readonly blob: Blob;
  readonly width: number;
  readonly height: number;
}

/** Une photo (ou un diagramme) du projet actif, telle que l'affiche le lecteur. */
export interface ShownPhoto {
  /** Adresse `blob:` — révoquée au changement de projet. */
  readonly url: string;
  readonly width: number;
  readonly height: number;
}

/**
 * Lecture d'un PDF (texte et photos). Chargée par `import()` pour que pdf.js
 * reste hors du bundle initial ; remplaçable en test, pdf.js ne tournant pas
 * sous jsdom.
 */
export const PDF_EXTRACTOR = new InjectionToken<(file: File) => Promise<ExtractedPdf>>(
  'PDF_EXTRACTOR',
  { factory: () => async (file) => (await import('../data/pdf-extract')).extractPdfPages(file) },
);

/** Ancien état unique, écrit avant la fiche 16 : sert de source de migration. */
const LEGACY_KEY = 'fil.reader.v1';
/** Marque la migration comme faite — évite de la rejouer, et de ressusciter
 *  un patron qu'on aurait supprimé depuis. */
const MIGRATION_FLAG = 'fil.storage.migrated';
/** Pointeur — léger — vers le projet actif ; le reste vit dans IndexedDB. */
const CURRENT_ID_KEY = 'fil.currentProjectId';
/** Paliers de profondeur de lecture, en position absolue dans le patron. */
/** Nom d'un projet grille tiré du nom de fichier : 60 signes au plus. */
const MAX_GRID_NAME = 60;

const DEPTH_THRESHOLDS = [5, 20, 50] as const;

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
  private readonly prefs = inject(DisplayPrefsService);
  private readonly projectStore = inject(ProjectStoreService);
  private readonly analytics = inject(AnalyticsService);
  private readonly objectUrls = inject(ObjectUrlService);
  private readonly extractPdf = inject(PDF_EXTRACTOR);
  private readonly destroyRef = inject(DestroyRef);

  /** Devient vrai une fois la restauration initiale terminée — sert à `ReaderPage`
   *  pour savoir quand il est sûr de lire un permalien sans risquer d'écraser
   *  un projet en cours de reprise. */
  readonly restored = signal(false);
  private ticker: ReturnType<typeof setInterval> | null = null;
  private ticks = 0;

  readonly source = signal('');
  readonly image = signal('');
  readonly pieceIndex = signal(0);
  readonly stepIndex = signal(0);
  /** Maille courante de l'étape, à partir de 0 ; remise à 0 quand l'étape change. */
  readonly stitchIndex = signal(0);
  /** Affichage du lecteur, retenu par projet. */
  readonly view = signal<ReaderView>('text');
  /** Grille de couleurs du projet actif ; `null` pour un patron écrit. */
  readonly grid = signal<ColorGrid | null>(null);
  /** Projet qui vient d'être créé et attend la réponse à « étapes écrites ou diagramme ? ». */
  readonly viewChoice = signal<string | null>(null);
  /** Préférence « diagramme » sans étape dessinable : l'affichage texte s'applique, et on le dit. */
  readonly viewFallback = signal(false);
  /** Projet neuf dont l'affichage se décide dès que ses tours sont connus. */
  private readonly pendingView = signal<string | null>(null);
  /** Tours où une maille a déjà été comptée dans cette session. */
  private readonly markedRounds = new Set<string>();
  /** Paliers de profondeur déjà atteints par le projet courant — évite de réémettre. */
  private readonly depthsReached = signal<ReadonlySet<(typeof DEPTH_THRESHOLDS)[number]>>(
    new Set(),
  );
  readonly done = signal<Record<string, boolean>>({});
  readonly reps = signal<Record<string, number>>({});
  readonly elapsed = signal(0);
  readonly running = signal(false);
  /** Affiche « maille serrée » au lieu de « ms ». Confort de lecture, pas un
   *  réglage de découpage : le texte source reste intact. */
  readonly expandAbbreviations = signal(false);

  readonly pdfImporting = signal(false);
  readonly pdfError = signal<'vide' | 'erreur' | null>(null);
  /** Photos d'un PDF laissées de côté : au-delà des plafonds, ou non enregistrées (quota). */
  readonly pdfImagesNote = signal<'tronque' | 'non-enregistrees' | null>(null);

  /** Nombre de photos du projet actif, enregistrées à part dans IndexedDB. */
  readonly imageCount = signal(0);
  /** Photos du projet actif, prêtes à afficher : l'image n est à l'indice
   *  n - 1, `null` si son fichier manque. Vide tant qu'elles ne sont pas lues. */
  readonly photos = signal<readonly (ShownPhoto | null)[]>([]);
  /**
   * Diagrammes joints au projet avant le retrait de cette fonction : jamais
   * affichés, mais leur compte est réécrit tel quel pour que la suppression
   * du projet efface aussi leurs fichiers.
   */
  private legacyChartCount = 0;
  /** Suspend l'effet de persistance pendant l'écriture groupée d'un PDF et de ses photos. */
  private holdPersist = false;
  /** Numéro de la dernière lecture de photos : une lecture dépassée est ignorée. */
  private imageLoad = 0;

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
  /** La pièce en tours de diagramme ; `null` tant que le parseur de tours, chargé à la demande, n'a pas répondu. */
  readonly pieceChart = signal<PieceChart | null>(null);
  private chartParse = 0;
  /** Mailles dessinées dans l'étape courante ; 0 si elle ne se dessine pas. */
  readonly stitchTotal = computed(() => {
    const grid = this.grid();
    if (grid) return grid.width;
    return this.pieceChart()?.stitches[this.stepIndex()] ?? 0;
  });
  readonly total = computed(() => this.pattern().total);
  /** Position 1-indexée de l'étape courante dans l'ensemble des pièces —
   *  sert aussi à `WaitlistBanner` pour savoir si la troisième étape est atteinte. */
  readonly absoluteStep = computed(() => {
    const pieces = this.pieces();
    let position = this.stepIndex() + 1;
    for (let i = 0; i < this.pieceIndex(); i++) position += pieces[i]?.steps.length ?? 0;
    return position;
  });
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
      this.stitchIndex();
      this.view();
      this.done();
      this.reps();
      this.elapsed();
      this.expandAbbreviations();
      this.currentId();
      this.nameOverride();
      this.imageCount();
      if (!this.restored()) return;
      void this.persist();
    });

    // Les tours de la pièce se calculent hors du premier affichage : seule
    // une lectrice qui ouvre un patron en a besoin.
    effect(() => {
      const piece = this.piece();
      untracked(() => void this.parsePieceChart(piece));
    });

    // Déclarée après l'effet ci-dessus, donc exécutée après lui : `pieceChart`
    // est déjà remis à `null` pour le nouveau patron, jamais celui du précédent.
    // La décision attend les tours : le parseur n'est chargé que si une lectrice
    // ouvre un patron, et pas avant que le premier affichage soit passé.
    effect(() => {
      const id = this.pendingView();
      if (id && this.pieceChart()) {
        untracked(() => {
          this.pendingView.set(null);
          void this.applyDefaultView(id);
        });
      }
    });

    // Les photos suivent le projet actif : les adresses du précédent sont
    // révoquées avant de lire celles du suivant.
    effect(() => {
      const id = this.currentId();
      const count = this.imageCount();
      untracked(() => void this.loadPhotos(id, count));
    });

    // Le pointeur vers le projet actif est la seule donnée qui reste dans
    // localStorage : assez petite pour ne jamais dépasser son quota.
    effect(() => {
      const id = this.currentId();
      if (!this.restored()) return;
      if (id) this.storage.write(CURRENT_ID_KEY, id);
      else this.storage.remove(CURRENT_ID_KEY);
    });

    this.destroyRef.onDestroy(() => {
      this.stopTimer();
      this.imageLoad++;
      this.releasePhotos();
    });
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
    if (this.holdPersist) return;
    const id = this.currentId();
    if (!id) return;
    const project = this.snapshot(id);
    await this.projectStore.put(project);
    this.projects.update((list) => [...list.filter((p) => p.id !== id), project]);
  }

  /** Le projet actif tel qu'il doit être enregistré. */
  private snapshot(id: string): Project {
    const now = Date.now();
    const existing = untracked(() => this.projects()).find((p) => p.id === id);
    return {
      id,
      name: this.currentName(),
      source: this.source(),
      image: this.image(),
      pieceIndex: this.pieceIndex(),
      stepIndex: this.stepIndex(),
      stitch: this.stitchIndex(),
      view: this.view(),
      done: this.done(),
      reps: this.reps(),
      elapsed: this.elapsed(),
      expandAbbreviations: this.expandAbbreviations(),
      createdAt: existing?.createdAt ?? now,
      lastOpenedAt: existing?.lastOpenedAt ?? now,
      imageCount: this.imageCount(),
      ...(this.legacyChartCount ? { chartCount: this.legacyChartCount } : {}),
      ...(this.grid() ? { grid: this.grid()! } : {}),
    };
  }

  private async parsePieceChart(piece: PatternPiece | null): Promise<void> {
    const parse = ++this.chartParse;
    this.pieceChart.set(null);
    if (!piece) return;
    const { pieceToChart } = await import('../data/text-to-chart');
    if (parse === this.chartParse) this.pieceChart.set(pieceToChart(piece));
  }

  private async loadPhotos(id: string | null, count: number): Promise<void> {
    const load = ++this.imageLoad;
    this.releasePhotos();
    if (!id || !count) return;
    const files = await this.projectStore.getFiles<ProjectImage>(
      imageIds({ id, imageCount: count }),
    );
    // Un autre projet a été ouvert pendant la lecture : ces photos ne sont plus les siennes.
    if (load !== this.imageLoad) return;
    this.photos.set(
      files.map((file) =>
        file
          ? { url: this.objectUrls.create(file.blob), width: file.width, height: file.height }
          : null,
      ),
    );
  }

  private releasePhotos(): void {
    this.photos().forEach((photo) => photo && this.objectUrls.revoke(photo.url));
    this.photos.set([]);
  }

  /**
   * Ouvre un patron écrit à partir d'un diagramme relu par la lectrice :
   * **toujours un nouveau projet**, même si le texte est celui du projet
   * actif, qui reste intact dans la liste.
   */
  openFromChart(text: string): void {
    if (!text) return;
    if (this.currentId()) this.detach();
    this.load(text, 'diagramme');
  }

  /**
   * Ouvre une grille de couleurs : **toujours un nouveau projet**, dont le
   * texte est l'écriture de la grille, écrits dans une seule transaction. Le
   * diagramme s'affiche d'emblée : un ouvrage en couleurs se lit en grille.
   * `name` (le nom du fichier d'origine, par exemple) est borné à 60 signes.
   * Renvoie `false` si l'écriture a échoué : la grille reste ouverte à l'écran.
   */
  async openFromGrid(
    grid: ColorGrid,
    text: string,
    name = '',
    origine: 'lecteur' | 'page' = 'lecteur',
  ): Promise<boolean> {
    if (!text) return false;
    if (this.currentId()) this.detach();
    this.holdPersist = true;
    let saved: boolean;
    try {
      this.load(text, 'grille');
      const id = this.currentId();
      if (!id) return false;
      const trimmed = name.trim().slice(0, MAX_GRID_NAME);
      if (trimmed) this.nameOverride.set(trimmed);
      this.grid.set(grid);
      this.view.set('chart');
      this.pendingView.set(null);
      saved = await this.projectStore.putAll([this.snapshot(id)]);
    } finally {
      this.holdPersist = false;
    }
    await this.persist();
    if (saved) {
      this.analytics.track('grid_created', {
        width: Math.round(grid.width / 10) * 10,
        colors: grid.palette.length,
        worked: grid.worked,
        origine,
      });
    }
    return saved;
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
    this.imageCount.set(project.imageCount ?? 0);
    this.legacyChartCount = project.chartCount ?? 0;
    this.pdfImagesNote.set(null);
    this.viewChoice.set(null);
    this.viewFallback.set(false);
    this.pieceIndex.set(Math.min(project.pieceIndex, Math.max(0, this.pieces().length - 1)));
    this.stepIndex.set(Math.min(project.stepIndex, Math.max(0, this.stepCount() - 1)));
    this.stitchIndex.set(Math.max(0, Math.floor(project.stitch ?? 0)));
    this.view.set(project.view === 'chart' ? 'chart' : 'text');
    this.grid.set(validGrid(project.grid));
    this.depthsReached.set(new Set(DEPTH_THRESHOLDS.filter((t) => this.absoluteStep() >= t)));
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
    const project = this.projects().find((p) => p.id === id);
    if (id === this.currentId()) this.clear();
    this.projects.update((list) => list.filter((p) => p.id !== id));
    await this.projectStore.remove(id, project ? fileIds(project) : []);
  }

  /** Fichier `.json` téléchargeable, tous les projets et leurs photos, avec le numéro de schéma. */
  async exportBackup(): Promise<Blob> {
    const projects = this.projects();
    this.analytics.track('backup_exported', { projects: projects.length });
    const [{ encodeBackup }, files] = await Promise.all([
      import('../data/project-backup'),
      this.projectStore.getFiles<ProjectImage>(projects.flatMap(imageIds)),
    ]);
    return encodeBackup(projects, files);
  }

  /**
   * Réimporte une sauvegarde : fusion, jamais écrasement — un doublon garde la
   * version la plus récemment ouverte. Refuse en bloc un fichier dont le
   * numéro de schéma est inconnu, et n'importe rien si l'écriture échoue.
   */
  async importBackup(file: File): Promise<boolean> {
    const { MAX_BACKUP_BYTES, decodeImages, parseBackup } = await import('../data/project-backup');
    // Borné avant lecture : un fichier démesuré ne doit pas saturer la mémoire.
    if (file.size > MAX_BACKUP_BYTES) return false;
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
    // Photos des seuls projets dont la version importée l'emporte : un projet
    // déjà présent et plus récent garde les siennes.
    const imported = new Set(merged.filter((p) => !current.includes(p)).map((p) => p.id));
    const files = decodeImages(backup.images, imported);
    // Une seule transaction : si le quota lâche, rien n'est importé.
    if (!(await this.projectStore.putAll(merged, files))) return false;
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
   * importé, l'exemple et un permalien : seul un patron collé compte comme
   * `pattern_pasted`.
   *
   * Un texte différent du patron actif ouvre un **nouveau** projet : le projet
   * en cours reste intact dans la liste. Recharger le même texte garde le
   * projet et remet sa progression à zéro, comme avant la fiche 16.
   */
  load(
    text: string,
    origine: 'saisie' | 'pdf' | 'exemple' | 'lien' | 'diagramme' | 'grille' = 'saisie',
  ): void {
    this.pdfError.set(null);
    if (text && this.currentId() && text !== this.source()) this.detach();
    this.source.set(text);
    this.pieceIndex.set(0);
    this.stepIndex.set(0);
    this.stitchIndex.set(0);
    this.done.set({});
    this.reps.set({});
    this.depthsReached.set(new Set());
    if (!text) return;
    let created = false;
    if (!this.currentId()) {
      this.currentId.set(crypto.randomUUID());
      this.analytics.track('project_created');
      created = true;
    }
    if (created) {
      this.view.set('text');
      this.viewChoice.set(null);
      this.viewFallback.set(false);
    }
    if (origine === 'saisie') {
      this.analytics.track('pattern_pasted', { length: roundToHundred(text.length) });
    }
    this.analytics.track('pattern_parsed', {
      steps: this.total(),
      pieces: this.pieces().length,
      materials: this.materials().length,
      origine,
    });
    if (created) this.pendingView.set(this.currentId());
  }

  /**
   * Applique la préférence d'affichage au projet qui vient d'être créé. La
   * question ne se pose que si une étape se dessine : sinon le texte
   * s'applique sans rien demander.
   */
  private async applyDefaultView(id: string): Promise<void> {
    const pref = this.prefs.defaultView();
    if (pref === 'text') return;
    let pieceToChart: typeof import('../data/text-to-chart').pieceToChart;
    try {
      ({ pieceToChart } = await import('../data/text-to-chart'));
    } catch {
      // Hors ligne sans le morceau en cache : le texte s'applique, rien n'est demandé.
      return;
    }
    // Un autre patron a été ouvert pendant le chargement : la question n'est plus la sienne.
    if (this.currentId() !== id) return;
    const drawable = this.pieces().some((piece) => pieceToChart(piece).drawable > 0);
    if (!drawable) {
      if (pref === 'chart') this.viewFallback.set(true);
    } else if (pref === 'chart') this.view.set('chart');
    else this.viewChoice.set(id);
  }

  /** Réponse à la question : fixe l'affichage du projet qui vient d'être créé, et le retient si demandé. */
  chooseView(view: ReaderView, remember: boolean): void {
    const id = this.viewChoice();
    this.viewChoice.set(null);
    this.analytics.track('view_chosen', { view, remembered: remember ? 'yes' : 'no' });
    if (remember) this.prefs.setDefaultView(view);
    if (id && id === this.currentId()) this.view.set(view);
  }

  /** Fermer sans choisir : texte, rien de retenu. */
  dismissViewChoice(): void {
    this.viewChoice.set(null);
  }

  loadDemo(): void {
    this.load(DEMO_PATTERN, 'exemple');
  }

  /**
   * Ouvre une copie d'un projet envoyé par une autre personne (`#j=`) : un
   * identifiant neuf, systématiquement — le projet actif, s'il y en a un,
   * reste intact dans la liste. Ouvrir deux fois le même lien crée deux
   * projets distincts, plutôt que de deviner un doublon.
   */
  receiveSharedProject(progress: SharedProgress): void {
    this.pdfError.set(null);
    if (this.currentId()) this.detach();
    this.source.set(progress.source);
    this.pieceIndex.set(progress.pieceIndex);
    this.stepIndex.set(progress.stepIndex);
    this.stitchIndex.set(0);
    this.view.set('text');
    this.done.set(progress.done);
    this.reps.set(progress.reps);
    this.depthsReached.set(new Set(DEPTH_THRESHOLDS.filter((t) => this.absoluteStep() >= t)));
    this.currentId.set(crypto.randomUUID());
    this.nameOverride.set(progress.name || null);
    this.analytics.track('project_created');
    this.analytics.track('pattern_parsed', {
      steps: this.total(),
      pieces: this.pieces().length,
      materials: this.materials().length,
      origine: 'lien',
    });
    this.analytics.track('project_received');
  }

  /**
   * Charge un PDF : lit le fichier, extrait le texte, le normalise, puis suit
   * le même chemin que `load`. Chemin unique pour le bouton, le collage et le
   * glisser-déposer d'un PDF.
   */
  async importPdf(file: File): Promise<void> {
    this.pdfImporting.set(true);
    this.pdfError.set(null);
    this.pdfImagesNote.set(null);
    // Chargé avec le PDF, pas au premier affichage : seul l'import s'en sert.
    let emptyText: (new () => Error) | null = null;
    try {
      const { PdfEmptyTextError, normalizePdfPages } = await import('../data/pdf-normalize');
      emptyText = PdfEmptyTextError;
      const { pages, truncated } = await this.extractPdf(file);
      const text = normalizePdfPages(pages);
      const images = pages.flatMap((page) => page.images);
      await this.loadWithImages(text, images);
      if (truncated && !this.pdfImagesNote()) this.pdfImagesNote.set('tronque');
      this.analytics.track('pdf_imported', { pages: pages.length, images: images.length });
    } catch (error) {
      const raison = emptyText && error instanceof emptyText ? 'vide' : 'erreur';
      this.pdfError.set(raison);
      this.analytics.track('pdf_failed', { raison });
    } finally {
      this.pdfImporting.set(false);
    }
  }

  /**
   * Charge le texte d'un PDF et enregistre ses photos avec le projet, dans une
   * **seule** transaction validée. Si elle avorte (quota), le projet s'ouvre
   * sans photos et `pdfImagesNote` le dit : le patron, lui, n'est jamais perdu.
   */
  private async loadWithImages(text: string, images: readonly ExtractedImage[]): Promise<void> {
    // L'effet de persistance attend : sinon il écrirait le projet seul, dans
    // une autre transaction, et un échec des photos laisserait un projet qui
    // en annonce sans les avoir.
    this.holdPersist = true;
    try {
      this.load(text, 'pdf');
      const id = this.currentId();
      if (id && images.length) {
        const project: Project = { ...this.snapshot(id), imageCount: images.length };
        const files: ProjectImage[] = images.map(({ blob, width, height }, index) => ({
          id: imageId(id, index + 1),
          projectId: id,
          n: index + 1,
          blob,
          width,
          height,
          kind: 'pdf',
        }));
        if (await this.projectStore.putAll([project], files)) this.imageCount.set(images.length);
        else this.pdfImagesNote.set('non-enregistrees');
      }
    } finally {
      this.holdPersist = false;
    }
    await this.persist();
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
    this.imageCount.set(0);
    this.legacyChartCount = 0;
    this.grid.set(null);
    this.pdfImagesNote.set(null);
    this.viewChoice.set(null);
    this.viewFallback.set(false);
  }

  selectPiece(index: number): void {
    this.pieceIndex.set(index);
    this.stepIndex.set(0);
    this.stitchIndex.set(0);
  }

  setView(view: ReaderView): void {
    if (view === this.view()) return;
    this.view.set(view);
    this.analytics.track('view_changed', { view });
  }

  /**
   * Place la progression sur une maille du diagramme : l'étape et la maille
   * d'un coup, pour que l'effet de persistance les écrive ensemble.
   */
  markStitch(stepIndex: number, stitch: number): void {
    if (stepIndex < 0 || stepIndex >= this.stepCount() || stitch < 0) return;
    this.stepIndex.set(stepIndex);
    this.stitchIndex.set(stitch);
    const key = `${this.currentId() ?? ''}:${this.positionKey()}`;
    if (this.markedRounds.has(key)) return;
    this.markedRounds.add(key);
    this.analytics.track(this.grid() ? 'grid_stitch_marked' : 'stitch_marked');
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
    this.stitchIndex.set(0);
    this.analytics.track('step_advanced');
    this.checkDepth();
    if (!this.running()) this.startTimer();
  }

  /**
   * Va à la n-ième étape (1-indexée) de la pièce courante — une valeur hors
   * bornes est ramenée dans les bornes plutôt que refusée. `origin` distingue
   * un clic dans la liste des étapes d'une saisie dans le champ « Aller ».
   */
  goTo(oneBased: number, origin: 'list' | 'field'): void {
    if (!this.stepCount() || !Number.isFinite(oneBased)) return;
    this.stepIndex.set(Math.max(0, Math.min(this.stepCount() - 1, oneBased - 1)));
    this.stitchIndex.set(0);
    this.analytics.track('step_jumped', { origin });
    this.checkDepth();
  }

  /**
   * Émet un événement de profondeur la première fois que la position
   * absolue atteint un palier, dans le projet courant. Une reprise au-delà
   * d'un palier ne le réémet pas : `hydrate` initialise `depthsReached`.
   */
  private checkDepth(): void {
    const position = this.absoluteStep();
    const reached = this.depthsReached();
    const franchis = DEPTH_THRESHOLDS.filter((t) => position >= t && !reached.has(t));
    if (!franchis.length) return;
    this.depthsReached.set(new Set([...reached, ...franchis]));
    for (const t of franchis) this.analytics.track(`reading_depth_${t}`);
  }

  addRepeat(delta: number): void {
    const key = this.positionKey();
    this.reps.update((reps) => ({ ...reps, [key]: Math.max(0, (reps[key] ?? 0) + delta) }));
  }

  resetRepeat(): void {
    const key = this.positionKey();
    this.reps.update((reps) => ({ ...reps, [key]: 0 }));
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

import { InjectionToken, Service, inject, signal } from '@angular/core';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import type { ResizedImage } from '../../../core/platform/image-resize';
import type { Recognition } from '../data/chart-recognition';
import type { ColorGrid } from '../data/color-grid';
import type { RenderedPage } from '../data/pdf-extract';
import { NewChart, ReaderStore } from './reader-store';

/** Image d'un diagramme : au plus 10 Mo en entrée, 2400 px de côté en sortie. */
export const MAX_CHART_FILE_BYTES = 10 * 1024 * 1024;
/** Un PDF plus lourd n'est pas un patron : refusé avant d'être lu. */
export const MAX_CHART_PDF_BYTES = 30 * 1024 * 1024;
/** Pages d'un PDF qu'on peut retenir d'un coup comme diagrammes. */
export const MAX_PDF_CHART_PAGES = 10;
/** Au-delà, un PDF n'est plus un patron mais un livre : on n'en rend que le début. */
export const MAX_RENDERED_PAGES = 60;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_SIDE = 2400;
/** Un diagramme est enregistré à 0,85 ; s'il pèse plus de 6 Mo (sa limite dans une sauvegarde), 0,6. */
const QUALITIES = [0.85, 0.6];
const MAX_ENCODED_BYTES = 6 * 1024 * 1024;

/** Réduction d'une image du disque. Remplaçable en test : jsdom n'a ni `OffscreenCanvas` ni décodeur. */
export const IMAGE_RESIZER = new InjectionToken<(file: File) => Promise<ResizedImage | null>>(
  'IMAGE_RESIZER',
  {
    factory: () => async (file) =>
      (await import('../../../core/platform/image-resize')).resizeImage(
        file,
        MAX_SIDE,
        QUALITIES,
        MAX_ENCODED_BYTES,
      ),
  },
);

/** Rendu des pages d'un PDF en images. Remplaçable en test : pdf.js ne tourne pas sous jsdom. */
export const PDF_PAGE_RENDERER = new InjectionToken<
  (file: File) => Promise<{ pages: RenderedPage[]; total: number }>
>('PDF_PAGE_RENDERER', {
  factory: () => async (file) =>
    (await import('../data/pdf-extract')).renderPdfPages(file, MAX_RENDERED_PAGES),
});

/** Lecture d'un fichier en `data:` URL, pour la couverture. */
export const DATA_URL_READER = new InjectionToken<(file: File) => Promise<string>>(
  'DATA_URL_READER',
  {
    factory: () => async (file) =>
      (await import('../../../core/platform/image-resize')).readAsDataUrl(file),
  },
);

/**
 * Lecture automatique d'un diagramme (image du disque ou page de PDF rendue).
 * Remplaçable en test : jsdom n'a ni `OffscreenCanvas` ni décodeur. Chargée par
 * `import()` : ni le code de lecture ni le décodage ne pèsent au premier affichage.
 */
export const CHART_RECOGNIZER = new InjectionToken<(image: Blob) => Promise<Recognition>>(
  'CHART_RECOGNIZER',
  {
    factory: () => async (image) => {
      const [{ decodePixels, svgPixels }, recognition, { CHART_SYMBOLS, symbolUrl }] =
        await Promise.all([
          import('../../../core/platform/image-pixels'),
          import('../data/chart-recognition'),
          import('../data/chart-symbols'),
        ]);
      const { MAX_RECOGNITION_SIDE, TEMPLATE_SIZE, recognize } = recognition;
      const pixels = await decodePixels(image, MAX_RECOGNITION_SIDE);
      if (!pixels) return { rounds: [], symbols: 0, uncertain: 0 };
      const templates = await Promise.all(
        CHART_SYMBOLS.map(async ({ id }) => ({
          id,
          pixels: await svgPixels(symbolUrl(id), TEMPLATE_SIZE),
        })),
      );
      return recognize(
        pixels,
        templates.flatMap(({ id, pixels }) => (pixels ? [{ id, pixels }] : [])),
      );
    },
  },
);

/** Un diagramme ouvert comme patron, lu, en attente de la relecture de la lectrice. */
export interface ChartOpening {
  readonly charts: readonly NewChart[];
  readonly recognition: Recognition;
}

export type ChartIntakeError = 'format' | 'lourd' | 'pdf' | 'illisible' | 'non-enregistre';

/**
 * Chemin d'entrée d'un diagramme : image du disque, image collée ou déposée
 * (« couverture ou diagramme ? »), page d'un PDF. L'état vit ici, pas dans
 * les composants : le bouton est dans le panneau d'import, replié une fois le
 * patron chargé, alors que les boîtes de dialogue doivent rester visibles.
 */
@Service()
export class ChartIntake {
  private readonly store = inject(ReaderStore);
  private readonly resize = inject(IMAGE_RESIZER);
  private readonly renderPages = inject(PDF_PAGE_RENDERER);
  private readonly readDataUrl = inject(DATA_URL_READER);
  private readonly recognize = inject(CHART_RECOGNIZER);
  private readonly analytics = inject(AnalyticsService);

  /** Pages du PDF à cocher ; `null` tant qu'aucun PDF n'est ouvert. */
  readonly pages = signal<readonly RenderedPage[] | null>(null);
  readonly pdfTotal = signal(0);
  /** Diagramme lu, montré dans le composeur pour relecture ; `null` hors de ce moment. */
  readonly opening = signal<ChartOpening | null>(null);
  /** Image choisie pour devenir une grille, en attente des réglages ; `null` hors de ce moment. */
  readonly gridFile = signal<File | null>(null);
  /** D'où vient l'image de la grille : le lecteur, ou la page dédiée (fiche 49). */
  private gridOrigin: 'lecteur' | 'page' = 'lecteur';
  /** Compte les diagrammes ouverts comme patrons : le panneau d'import se replie à chaque fois. */
  readonly opened = signal(0);
  readonly busy = signal(false);
  readonly error = signal<ChartIntakeError | null>(null);

  /**
   * « Ouvrir un diagramme » : un patron donné seulement en diagramme. L'image
   * est lue, et le résultat ouvert dans le composeur pour que la lectrice le
   * corrige ; rien n'est enregistré avant qu'elle ne valide (`confirmOpening`).
   * Pas besoin d'un patron chargé : c'est ce diagramme qui deviendra le patron.
   */
  async open(file: File): Promise<void> {
    this.error.set(null);
    if (file.type === 'application/pdf') {
      await this.openPdf(file);
      return;
    }
    if (!IMAGE_TYPES.has(file.type)) return this.fail('format');
    if (file.size > MAX_CHART_FILE_BYTES) return this.fail('lourd');
    this.busy.set(true);
    try {
      const resized = await this.resize(file);
      if (!resized) return this.fail('illisible');
      await this.read([resized], file);
    } finally {
      this.busy.set(false);
    }
  }

  /** Lit le premier diagramme ; une lecture qui échoue donne un brouillon vide, pas une erreur. */
  private async read(charts: readonly NewChart[], image: Blob): Promise<void> {
    let recognition: Recognition;
    try {
      recognition = await this.recognize(image);
    } catch {
      recognition = { rounds: [], symbols: 0, uncertain: 0 };
    }
    this.opening.set({ charts, recognition });
    this.analytics.track('chart_recognized', {
      rounds: recognition.rounds.length,
      symbols: roundToTen(recognition.symbols),
    });
  }

  /** La lectrice a relu le brouillon : son texte devient un nouveau projet. */
  async confirmOpening(text: string): Promise<void> {
    const opening = this.opening();
    this.opening.set(null);
    if (!opening || !text) return;
    this.store.openFromChart(text);
    this.opened.update((n) => n + 1);
  }

  cancelOpening(): void {
    this.opening.set(null);
  }

  /**
   * « Ouvrir une image en grille » : mêmes bornes que les diagrammes (type,
   * 10 Mo), refusées avant tout décodage. L'image est lue par le dialogue, qui
   * n'existe qu'une fois ce fichier accepté.
   */
  chooseGridImage(file: File, origin: 'lecteur' | 'page' = 'lecteur'): void {
    this.error.set(null);
    this.gridOrigin = origin;
    if (!IMAGE_TYPES.has(file.type)) return this.fail('format');
    if (file.size > MAX_CHART_FILE_BYTES) return this.fail('lourd');
    this.gridFile.set(file);
  }

  /** L'image n'a pas pu être décodée (illisible, ou plus de 64 millions de pixels). */
  failGridImage(): void {
    this.gridFile.set(null);
    this.fail('illisible');
  }

  cancelGrid(): void {
    this.gridFile.set(null);
  }

  /** La grille choisie devient un nouveau projet ; l'image d'origine n'est pas gardée. */
  async createGrid(grid: ColorGrid, name: string): Promise<void> {
    this.gridFile.set(null);
    if (await this.store.openFromGrid(grid, name, this.gridOrigin))
      this.opened.update((n) => n + 1);
    else this.fail('non-enregistre');
  }

  /** Image collée ou déposée sur la page : elle devient la photo de couverture. */
  async receive(file: File): Promise<void> {
    await this.setCover(file);
  }

  private async setCover(file: File): Promise<void> {
    try {
      this.store.setImage(await this.readDataUrl(file));
    } catch {
      this.error.set('illisible');
    }
  }

  /** Lit les pages cochées, dans l'ordre du PDF : elles ouvrent un nouveau patron. */
  async addPages(numbers: readonly number[]): Promise<void> {
    const pages = (this.pages() ?? []).filter((page) => numbers.includes(page.number));
    this.closePages();
    if (!pages.length) return;
    this.busy.set(true);
    try {
      await this.read(pages, pages[0].blob);
    } finally {
      this.busy.set(false);
    }
  }

  closePages(): void {
    this.pages.set(null);
  }

  private async openPdf(file: File): Promise<void> {
    if (file.size > MAX_CHART_PDF_BYTES) return this.fail('lourd');
    this.busy.set(true);
    try {
      const { pages, total } = await this.renderPages(file);
      if (!pages.length) return this.fail('pdf');
      this.pdfTotal.set(total);
      this.pages.set(pages);
    } catch {
      this.fail('pdf');
    } finally {
      this.busy.set(false);
    }
  }

  private fail(error: ChartIntakeError): void {
    this.error.set(error);
  }
}

/** Le nombre de symboles lus, à la dizaine : assez pour juger la lecture, rien du diagramme. */
const roundToTen = (n: number): number => Math.round(n / 10) * 10;

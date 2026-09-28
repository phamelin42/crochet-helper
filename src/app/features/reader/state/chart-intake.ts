import { InjectionToken, Service, inject, signal } from '@angular/core';
import type { ResizedImage } from '../../../core/platform/image-resize';
import type { RenderedPage } from '../data/pdf-extract';
import { ReaderStore } from './reader-store';

/** Image d'un diagramme : au plus 10 Mo en entrée, 2400 px de côté en sortie. */
export const MAX_CHART_FILE_BYTES = 10 * 1024 * 1024;
/** Un PDF plus lourd n'est pas un patron : refusé avant d'être lu. */
export const MAX_CHART_PDF_BYTES = 30 * 1024 * 1024;
/** Pages d'un PDF qu'on peut retenir d'un coup comme diagrammes. */
export const MAX_PDF_CHART_PAGES = 10;
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
  factory: () => async (file) => (await import('../data/pdf-extract')).renderPdfPages(file),
});

/** Lecture d'un fichier en `data:` URL, pour la couverture. */
export const DATA_URL_READER = new InjectionToken<(file: File) => Promise<string>>(
  'DATA_URL_READER',
  {
    factory: () => async (file) =>
      (await import('../../../core/platform/image-resize')).readAsDataUrl(file),
  },
);

export type ChartIntakeError = 'format' | 'lourd' | 'pdf' | 'illisible';

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

  /** Image collée ou déposée, en attente de la réponse « couverture ou diagramme ? ». */
  readonly question = signal<File | null>(null);
  /** Pages du PDF à cocher ; `null` tant qu'aucun PDF n'est ouvert. */
  readonly pages = signal<readonly RenderedPage[] | null>(null);
  readonly pdfTotal = signal(0);
  readonly busy = signal(false);
  readonly error = signal<ChartIntakeError | null>(null);

  /**
   * Un fichier choisi ou déposé. `ask` : l'image arrive par collage ou dépôt,
   * où la lectrice n'a rien dit de son intention — on le lui demande plutôt
   * que de remplacer la couverture en silence.
   */
  async submit(file: File, ask = false): Promise<void> {
    this.error.set(null);
    if (file.type === 'application/pdf') {
      await this.openPdf(file);
      return;
    }
    if (!IMAGE_TYPES.has(file.type)) return this.fail('format');
    if (file.size > MAX_CHART_FILE_BYTES) return this.fail('lourd');
    if (ask) this.question.set(file);
    else await this.addImage(file);
  }

  /** La réponse « Diagramme » : l'image entre dans le projet. */
  async answerChart(): Promise<void> {
    const file = this.question();
    this.question.set(null);
    if (file) await this.addImage(file);
  }

  /** La réponse « Photo de couverture » : le comportement d'avant la fiche 35. */
  async answerCover(): Promise<void> {
    const file = this.question();
    this.question.set(null);
    if (!file) return;
    try {
      this.store.setImage(await this.readDataUrl(file));
    } catch {
      this.error.set('illisible');
    }
  }

  cancelQuestion(): void {
    this.question.set(null);
  }

  /** Enregistre les pages cochées, dans l'ordre du PDF. */
  async addPages(numbers: readonly number[]): Promise<void> {
    const pages = (this.pages() ?? []).filter((page) => numbers.includes(page.number));
    this.closePages();
    if (!pages.length) return;
    this.busy.set(true);
    try {
      await this.store.addCharts(pages, 'pdf');
    } finally {
      this.busy.set(false);
    }
  }

  closePages(): void {
    this.pages.set(null);
  }

  private async addImage(file: File): Promise<void> {
    this.busy.set(true);
    try {
      const resized = await this.resize(file);
      if (!resized) return this.fail('illisible');
      await this.store.addCharts([resized], 'image');
    } finally {
      this.busy.set(false);
    }
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

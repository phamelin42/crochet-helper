import { Component, computed, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Disclosure } from '../../../shared/ui/disclosure/disclosure';
import { READER_COPY, ReaderTranslationKey } from '../data/reader-copy';
import { ReaderStore } from '../state/reader-store';
import { ImageGallery } from './image-gallery';

/**
 * Photos du PDF rattachées à aucune étape (couverture, schéma général), et
 * l'avis quand des photos ont été laissées de côté à l'import. L'avis reste
 * hors du panneau replié : il doit se lire sans rien ouvrir.
 */
@Component({
  selector: 'fil-pattern-photos',
  imports: [Disclosure, ImageGallery],
  template: `
    @if (note(); as note) {
      <p class="hint photo-note" role="status">{{ note }}</p>
    }
    @if (visible()) {
      <fil-disclosure [label]="t('ui.patternPhotos')" variant="mats" [state]="count()">
        <fil-image-gallery [numbers]="numbers()" [label]="t('ui.patternPhotos')" />
      </fil-disclosure>
    }
  `,
})
export class PatternPhotos {
  protected readonly store = inject(ReaderStore);
  private readonly i18n = inject(I18nService);

  protected t = (key: ReaderTranslationKey) => READER_COPY[this.i18n.locale()][key];

  protected readonly numbers = computed(() => this.store.pattern().images ?? []);
  /** Rien à déplier tant que les fichiers ne sont pas lus, ou s'ils manquent. */
  protected readonly visible = computed(() =>
    this.numbers().some((n) => this.store.imageUrls()[n - 1]),
  );
  protected readonly count = computed(() => String(this.numbers().length));
  protected readonly note = computed(() => {
    const note = this.store.pdfImagesNote();
    if (note === 'tronque') return this.t('ui.photosTruncated');
    if (note === 'non-enregistrees') return this.t('ui.photosNotSaved');
    return '';
  });
}

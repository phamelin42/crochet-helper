import { Component, computed, inject, input, signal } from '@angular/core';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Button } from '../../../shared/ui/button/button';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { Icon } from '../../../shared/ui/icon/icon';
import { READER_COPY, ReaderTranslationKey } from '../data/reader-copy';
import { ReaderStore } from '../state/reader-store';

/**
 * Vignettes des photos d'un patron PDF et leur agrandissement. Une photo dont
 * le fichier manque (patron reçu par lien, sans ses images) n'est pas
 * affichée : la rangée disparaît plutôt que de montrer une case vide.
 */
@Component({
  selector: 'fil-image-gallery',
  imports: [Button, Dialog, Icon],
  // Les flèches du clavier feuillettent, une fois la photo agrandie : les
  // touches pressées dans le dialogue remontent jusqu'ici.
  host: {
    '(keydown.arrowleft)': 'open() && step(-1)',
    '(keydown.arrowright)': 'open() && step(1)',
  },
  template: `
    @if (items().length) {
      <ul class="photo-row" [attr.aria-label]="label()">
        @for (item of items(); track item.n; let i = $index) {
          <li>
            <button type="button" filButton="secondary" class="photo-thumb" (click)="openAt(i)">
              <img [src]="item.url" alt="" width="88" height="88" decoding="async" />
              <span>{{ t('ui.photo') }} {{ item.n }}</span>
            </button>
          </li>
        }
      </ul>

      <fil-dialog [(open)]="open" [label]="currentLabel()" [wide]="true">
        @if (current(); as item) {
          <div class="photo-viewer">
            <img class="photo-full" [src]="item.url" [alt]="currentLabel()" />
            <div class="photo-nav">
              <button
                type="button"
                filButton="secondary"
                [disabled]="index() === 0"
                (click)="step(-1)"
              >
                <fil-icon name="left" /><span>{{ t('ui.photoPrev') }}</span>
              </button>
              <span class="photo-count">{{ index() + 1 }} / {{ items().length }}</span>
              <button
                type="button"
                filButton="secondary"
                [disabled]="index() === items().length - 1"
                (click)="step(1)"
              >
                <span>{{ t('ui.photoNext') }}</span
                ><fil-icon name="right" />
              </button>
              <button type="button" filButton="ghost" (click)="open.set(false)">
                {{ t('ui.photoClose') }}
              </button>
            </div>
          </div>
        }
      </fil-dialog>
    }
  `,
})
export class ImageGallery {
  private readonly store = inject(ReaderStore);
  private readonly i18n = inject(I18nService);
  private readonly analytics = inject(AnalyticsService);

  /** Numéros des images à montrer (marqueurs `[image N]`). */
  readonly numbers = input.required<readonly number[]>();
  /** Nom de la rangée pour les lecteurs d'écran. */
  readonly label = input.required<string>();

  protected readonly open = signal(false);
  private readonly selected = signal(0);

  protected t = (key: ReaderTranslationKey) => READER_COPY[this.i18n.locale()][key];

  protected readonly items = computed(() => {
    const urls = this.store.imageUrls();
    return this.numbers()
      .map((n) => ({ n, url: urls[n - 1] ?? '' }))
      .filter((item) => item.url);
  });
  protected readonly index = computed(() =>
    Math.min(this.selected(), Math.max(0, this.items().length - 1)),
  );
  protected readonly current = computed(() => this.items()[this.index()] ?? null);
  protected readonly currentLabel = computed(() => {
    const item = this.current();
    return item ? `${this.t('ui.photo')} ${item.n}` : '';
  });

  protected openAt(index: number): void {
    this.selected.set(index);
    this.open.set(true);
    this.analytics.track('image_opened');
  }

  protected step(delta: number): void {
    const next = this.index() + delta;
    if (next >= 0 && next < this.items().length) this.selected.set(next);
  }
}

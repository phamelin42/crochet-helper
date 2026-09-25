import { Component, computed, effect, inject, signal } from '@angular/core';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LocalStorageService } from '../../../core/storage/local-storage.service';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { READER_COPY, ReaderTranslationKey } from '../data/reader-copy';
import { WAITLIST_URL_TOKEN } from '../data/waitlist';
import { ReaderStore } from '../state/reader-store';

/** Masquage définitif de la ligne, valable pour tous les projets. */
const HIDDEN_KEY = 'fil.waitlistHidden';

/**
 * Ligne discrète proposant la liste d'attente Tally, à partir de la
 * troisième étape lue d'un projet : la question se pose à qui utilise
 * vraiment l'outil, pas sur l'accueil. Inerte si `WAITLIST_URL` est vide.
 */
@Component({
  selector: 'fil-waitlist-banner',
  imports: [Button, Icon],
  template: `
    @if (visible()) {
      <p class="waitlist">
        <span>{{ t('ui.waitlistText') }}</span>
        <a [href]="url" target="_blank" rel="noopener" (click)="onLinkClick()">
          {{ t('ui.waitlistLink') }}
        </a>
        <button
          type="button"
          filButton="ghost"
          [iconOnly]="true"
          [attr.aria-label]="t('ui.waitlistHide')"
          (click)="onHide()"
        >
          <fil-icon name="close" />
        </button>
      </p>
    }
  `,
})
export class WaitlistBanner {
  private readonly store = inject(ReaderStore);
  private readonly i18n = inject(I18nService);
  private readonly storage = inject(LocalStorageService);
  private readonly analytics = inject(AnalyticsService);

  protected readonly url = inject(WAITLIST_URL_TOKEN);
  protected t = (key: ReaderTranslationKey) => READER_COPY[this.i18n.locale()][key];

  private readonly hidden = signal(this.storage.read<boolean>(HIDDEN_KEY) === true);
  /** Projet pour lequel `waitlist_shown` a déjà été émis — évite de le réémettre. */
  private shownFor: string | null = null;

  protected readonly visible = computed(
    () => !!this.url && !this.hidden() && this.store.absoluteStep() >= 3,
  );

  constructor() {
    effect(() => {
      const id = this.store.currentId();
      if (!this.visible() || !id || this.shownFor === id) return;
      this.shownFor = id;
      this.analytics.track('waitlist_shown');
    });
  }

  protected onLinkClick(): void {
    this.analytics.track('waitlist_clicked');
  }

  protected onHide(): void {
    this.hidden.set(true);
    this.storage.write(HIDDEN_KEY, true);
  }
}

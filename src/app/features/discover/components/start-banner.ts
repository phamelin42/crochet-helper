import { Component, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SessionStorageService } from '../../../core/storage/session-storage.service';
import { Button } from '../../../shared/ui/button/button';
import { ReaderStore } from '../../reader/state/reader-store';
import { RAVELRY_START_KEY, validOrigin } from '../data/favorite.model';

const COPY = {
  fr: {
    drop: (name: string) => `Déposez ici le PDF de ${name}, ou collez son texte.`,
    link: 'Le projet gardera le lien avec ce patron sur Ravelry.',
    close: 'Fermer',
  },
  en: {
    drop: (name: string) => `Drop the PDF of ${name} here, or paste its text.`,
    link: 'The project will keep its link to this pattern on Ravelry.',
    close: 'Close',
  },
};

/**
 * Bandeau en tête du panneau d'import, après « Commencer ce patron » (ADR-004) :
 * il dit quel patron attend son texte. Chargé par `import()` seulement si une
 * fiche est en attente en mémoire de session ; le lecteur seul n'en paie rien.
 * Le nom vient d'un tiers : rendu en texte, jamais en HTML.
 */
@Component({
  selector: 'fil-start-banner',
  imports: [Button],
  template: `
    @if (store.pendingOrigin(); as origin) {
      <div class="note ravelry-start">
        <p>
          <strong>{{ c.drop(origin.name) }}</strong>
          {{ c.link }}
        </p>
        <button type="button" filButton="ghost" (click)="store.dismissPendingOrigin()">
          {{ c.close }}
        </button>
      </div>
    }
  `,
})
export class StartBanner {
  protected readonly store = inject(ReaderStore);
  protected readonly c = COPY[inject(I18nService).locale()];

  constructor() {
    // La fiche vient de la mémoire de session : validée comme toute entrée d'un tiers.
    try {
      const raw = inject(SessionStorageService).read(RAVELRY_START_KEY);
      const origin: unknown = raw ? JSON.parse(raw) : null;
      if (validOrigin(origin)) this.store.pendingOrigin.set(origin);
    } catch {
      /* mémoire de session illisible : pas de bandeau */
    }
  }
}

import { Component, inject } from '@angular/core';
import { UpdateService } from '@mp/core';

/** Annonce une nouvelle version sans jamais recharger d'elle-même. */
@Component({
  selector: 'mp-update-banner',
  template: `
    @if (update.updateAvailable()) {
      <div class="banner" role="status">
        <span>Une nouvelle version est prête.</span>
        <button type="button" class="btn btn-secondary" (click)="update.activateUpdate()">
          Recharger
        </button>
      </div>
    }
  `,
})
export class UpdateBanner {
  protected readonly update = inject(UpdateService);
}

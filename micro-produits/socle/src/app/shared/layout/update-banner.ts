import { Component, inject } from '@angular/core';
import { UpdateService } from '../../core/platform/update.service';

/** Annonce une nouvelle version sans jamais recharger d'elle-même. */
@Component({
  selector: 'app-update-banner',
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

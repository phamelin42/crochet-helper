import { PLATFORM_ID, Service, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SwUpdate } from '@angular/service-worker';

/**
 * Signale qu'une nouvelle version est prête, sans jamais recharger seul :
 * on a peut-être les mains prises au rang 42, un rechargement surprise ferait
 * perdre le fil.
 */
@Service()
export class UpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly updateAvailable = signal(false);

  constructor() {
    if (this.isBrowser && this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe((event) => {
        if (event.type === 'VERSION_READY') this.updateAvailable.set(true);
      });
    }
  }

  async activateUpdate(): Promise<void> {
    await this.swUpdate.activateUpdate();
    if (this.isBrowser) {
      window.location.reload();
    }
  }
}

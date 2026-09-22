import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { UpdateService } from './update.service';

function setup(platform: 'browser' | 'server', isEnabled: boolean) {
  const versionUpdates = new Subject<VersionEvent>();
  TestBed.configureTestingModule({
    providers: [
      { provide: PLATFORM_ID, useValue: platform },
      { provide: SwUpdate, useValue: { isEnabled, versionUpdates } },
    ],
  });
  return { service: TestBed.inject(UpdateService), versionUpdates };
}

describe('UpdateService', () => {
  it('signale la mise à jour disponible quand le service worker en détecte une', () => {
    const { service, versionUpdates } = setup('browser', true);

    expect(service.updateAvailable()).toBe(false);
    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    });

    expect(service.updateAvailable()).toBe(true);
  });

  it('ignore les événements qui ne sont pas une version prête', () => {
    const { service, versionUpdates } = setup('browser', true);

    versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'a' } });

    expect(service.updateAvailable()).toBe(false);
  });

  it('reste inerte côté serveur, même si le service worker est actif', () => {
    const { service, versionUpdates } = setup('server', true);

    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    });

    expect(service.updateAvailable()).toBe(false);
  });

  it("reste inerte quand le service worker n'est pas actif", () => {
    const { service, versionUpdates } = setup('browser', false);

    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    });

    expect(service.updateAvailable()).toBe(false);
  });
});

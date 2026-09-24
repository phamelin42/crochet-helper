import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { REGISTRATION_DELAY_MS, SERVICE_WORKER, UpdateService } from './update.service';

/** Conteneur factice : un `EventTarget` pour les messages du worker. */
function fakeContainer() {
  const target = new EventTarget();
  return Object.assign(target, {
    startMessages: vi.fn(),
    register: vi.fn(() => Promise.resolve({} as ServiceWorkerRegistration)),
    post(data: unknown) {
      target.dispatchEvent(new MessageEvent('message', { data }));
    },
  });
}

function setup(container: ReturnType<typeof fakeContainer> | null, stable = Promise.resolve()) {
  TestBed.configureTestingModule({
    providers: [
      { provide: SERVICE_WORKER, useValue: container },
      { provide: ApplicationRef, useValue: { whenStable: () => stable } },
    ],
  });
  return TestBed.inject(UpdateService);
}

describe('UpdateService', () => {
  afterEach(() => vi.useRealTimers());

  it('signale la mise à jour disponible quand le service worker en annonce une', () => {
    const container = fakeContainer();
    const service = setup(container);

    expect(service.updateAvailable()).toBe(false);
    container.post({ type: 'VERSION_READY', currentVersion: { hash: 'a' } });

    expect(service.updateAvailable()).toBe(true);
    expect(container.startMessages).toHaveBeenCalled();
  });

  it('ignore les messages qui ne sont pas une version prête', () => {
    const container = fakeContainer();
    const service = setup(container);

    for (const data of [{ type: 'VERSION_DETECTED' }, { type: 'NO_NEW_VERSION_DETECTED' }, null]) {
      container.post(data);
    }

    expect(service.updateAvailable()).toBe(false);
  });

  it("enregistre le worker une fois l'application stable", async () => {
    const container = fakeContainer();
    setup(container);

    await vi.waitFor(() => expect(container.register).toHaveBeenCalledWith('/ngsw-worker.js'));
  });

  it("enregistre le worker après le délai maximal si l'application ne se stabilise pas", async () => {
    vi.useFakeTimers();
    const container = fakeContainer();
    setup(container, new Promise<void>(() => undefined));

    await vi.advanceTimersByTimeAsync(REGISTRATION_DELAY_MS - 1);
    expect(container.register).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(container.register).toHaveBeenCalledTimes(1);
  });

  it('reste inerte sans service worker (pré-rendu, développement, navigateur sans support)', () => {
    const service = setup(null);

    expect(service.updateAvailable()).toBe(false);
    expect(() => service.activateUpdate()).not.toThrow();
  });
});

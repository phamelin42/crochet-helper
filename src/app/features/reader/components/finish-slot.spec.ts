import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import {
  installFakeIndexedDb,
  uninstallFakeIndexedDb,
} from '../../../core/storage/testing/fake-indexed-db';
import { ReaderStore } from '../state/reader-store';
import { FinishSlot } from './finish-slot';

describe('FinishSlot', () => {
  beforeEach(() => {
    installFakeIndexedDb();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AnalyticsService, useValue: { track: vi.fn() } },
      ],
    });
  });
  afterEach(() => {
    uninstallFakeIndexedDb();
    localStorage.clear();
  });

  it('montre l’étape tant que le patron n’est pas fini, puis l’écran de fin, puis l’étape si on la revoit', async () => {
    const store = TestBed.inject(ReaderStore);
    await store.initialize();
    store.load('Rang 1 : 6 ms\nRang 2 : 12 ms');
    // Le projet est enregistré avant de cocher : sinon l'écriture initiale rattrape la progression.
    await vi.waitFor(() => expect(store.projects()).toHaveLength(1));
    const fixture = TestBed.createComponent(FinishSlot);
    const host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    expect(host.querySelector('fil-step-view')).toBeTruthy();
    expect(host.querySelector('fil-finish-view')).toBeNull();

    for (let i = 0; i < store.total(); i++) store.advance();
    await vi.waitFor(
      () => {
        fixture.detectChanges();
        expect(host.querySelector('fil-finish-view')).toBeTruthy();
      },
      { timeout: 5000 },
    );
    expect(host.querySelector('fil-step-view')).toBeNull();

    store.reviewLastStep();
    fixture.detectChanges();
    expect(host.querySelector('fil-step-view')).toBeTruthy();
    expect(host.querySelector('fil-finish-view')).toBeNull();
  });
});

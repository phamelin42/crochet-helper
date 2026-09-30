import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { DEMO_PATTERN } from '../data/demo-pattern';
import { ReaderStore } from '../state/reader-store';
import { COPIED_VISIBLE_MS, ShareActions } from './share-actions';

/** Texte volumineux et non compressible (aléatoire) : garantit un lien trop
 *  long quel que soit le support de `CompressionStream` dans l'environnement
 *  de test — un texte répétitif se compresserait sous le seuil. */
function hugeIncompressibleSource(): string {
  const bytes = new Uint8Array(30_000);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

describe('ShareActions', () => {
  let track: ReturnType<typeof vi.fn>;
  let writeText: ReturnType<typeof vi.fn>;

  function setup() {
    TestBed.resetTestingModule();
    track = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: AnalyticsService, useValue: { track } }],
    });
    const fixture = TestBed.createComponent(ShareActions);
    const store = TestBed.inject(ReaderStore);
    return { fixture, store };
  }

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function copyButton(fixture: ReturnType<typeof setup>['fixture']): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLButtonElement).textContent?.includes('Share this pattern'),
    ) as HTMLButtonElement;
  }

  it('désactive « Partager le patron » quand le lien dépasse la longueur maximale', async () => {
    const { fixture, store } = setup();
    store.load(hugeIncompressibleSource());
    fixture.detectChanges();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(copyButton(fixture).disabled).toBe(true);
    });
  });

  it('copie le lien du patron et le signale', async () => {
    const { fixture, store } = setup();
    store.load(DEMO_PATTERN);
    fixture.detectChanges();

    // Le lien se recalcule de façon asynchrone (compression) : comme dans
    // `e2e/pattern-link.spec.ts`, on réessaie le clic jusqu'à ce qu'il soit prêt.
    const button = copyButton(fixture);
    await vi.waitFor(() => {
      fixture.detectChanges();
      button.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Link copied to clipboard.');
    });
    expect(writeText).toHaveBeenCalled();
    const [url] = writeText.mock.calls.at(-1)!;
    expect(url).toContain('#p=');
  });

  it("un échec du presse-papiers l'annonce, sans lever d'exception", async () => {
    writeText.mockRejectedValue(new Error('refusé'));
    const { fixture, store } = setup();
    store.load(DEMO_PATTERN);
    fixture.detectChanges();

    const button = copyButton(fixture);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(() => button.click()).not.toThrow();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Could not copy automatically.');
    });
  });

  it('émet `pattern_shared` une fois par copie réussie, jamais plus', async () => {
    const { fixture, store } = setup();
    store.load(DEMO_PATTERN);
    fixture.detectChanges();

    const button = copyButton(fixture);
    await vi.waitFor(() => {
      fixture.detectChanges();
      button.click();
      fixture.detectChanges();
      expect(track.mock.calls.some(([event]) => event === 'pattern_shared')).toBe(true);
    });

    const shared = track.mock.calls.filter(([event]) => event === 'pattern_shared').length;
    expect(shared).toBe(writeText.mock.calls.length);
  });

  it('« Lien copié » disparaît de lui-même après quelques secondes', async () => {
    const { fixture, store } = setup();
    store.load(DEMO_PATTERN);
    fixture.detectChanges();

    const button = copyButton(fixture);
    await vi.waitFor(() => {
      fixture.detectChanges();
      button.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Link copied to clipboard.');
    });

    vi.useFakeTimers();
    try {
      button.click();
      await vi.waitFor(() => expect(writeText.mock.calls.length).toBeGreaterThan(1));
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Link copied to clipboard.');
      vi.advanceTimersByTime(COPIED_VISIBLE_MS);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Link copied to clipboard.');
    } finally {
      vi.useRealTimers();
    }
  });
});

import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { DEMO_PATTERN } from '../data/demo-pattern';
import { WAITLIST_URL_TOKEN } from '../data/waitlist';
import { ReaderStore } from '../state/reader-store';
import { WaitlistBanner } from './waitlist-banner';

describe('WaitlistBanner', () => {
  let track: ReturnType<typeof vi.fn>;

  function setup(url: string) {
    TestBed.resetTestingModule();
    track = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: AnalyticsService, useValue: { track } },
        { provide: WAITLIST_URL_TOKEN, useValue: url },
      ],
    });
    const fixture = TestBed.createComponent(WaitlistBanner);
    const store = TestBed.inject(ReaderStore);
    return { fixture, store };
  }

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("n'affiche rien et n'émet aucun événement quand l'URL est vide", () => {
    const { fixture, store } = setup('');
    store.load(DEMO_PATTERN);
    store.move(1);
    store.move(1);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.waitlist')).toBeNull();
    expect(track).not.toHaveBeenCalledWith('waitlist_shown', undefined);
    expect(track).not.toHaveBeenCalledWith('waitlist_shown');
  });

  it("apparaît à partir de la troisième étape lue, pas avant, et l'annonce une seule fois", () => {
    const { fixture, store } = setup('https://tally.so/r/test');
    store.load(DEMO_PATTERN);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.waitlist')).toBeNull();

    store.move(1); // étape 2
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.waitlist')).toBeNull();

    store.move(1); // étape 3
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.waitlist')).not.toBeNull();
    expect(track.mock.calls.filter(([event]) => event === 'waitlist_shown')).toHaveLength(1);

    store.move(1); // étape 4 : déjà annoncé, pas réémis
    fixture.detectChanges();
    expect(track.mock.calls.filter(([event]) => event === 'waitlist_shown')).toHaveLength(1);
  });

  it("le lien ne pointe que vers l'URL configurée et compte le clic", () => {
    const { fixture, store } = setup('https://tally.so/r/test');
    store.load(DEMO_PATTERN);
    store.move(1);
    store.move(1);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.href).toBe('https://tally.so/r/test');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener');

    link.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
    expect(track).toHaveBeenCalledWith('waitlist_clicked');
  });

  it('masquée par la croix, elle ne revient pas après rechargement', () => {
    const { fixture, store } = setup('https://tally.so/r/test');
    store.load(DEMO_PATTERN);
    store.move(1);
    store.move(1);
    fixture.detectChanges();

    const hideButton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    hideButton.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.waitlist')).toBeNull();

    const { fixture: reloaded, store: reloadedStore } = setup('https://tally.so/r/test');
    reloadedStore.load(DEMO_PATTERN);
    reloadedStore.move(1);
    reloadedStore.move(1);
    reloaded.detectChanges();

    expect(reloaded.nativeElement.querySelector('.waitlist')).toBeNull();
  });
});

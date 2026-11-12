import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ReaderStore } from '../state/reader-store';
import { PatternPhotos } from './pattern-photos';

const PATTERN = ['Bear', '[image 1]', 'Rnd 1: 6 sc (6)', 'Rnd 2: 12 sc (12)'].join('\n');

describe('PatternPhotos', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  async function setup() {
    const fixture = TestBed.createComponent(PatternPhotos);
    const store = TestBed.inject(ReaderStore);
    store.load(PATTERN);
    // L'effet qui suit le projet vide les photos : on le laisse passer d'abord.
    await fixture.whenStable();
    store.photos.set([{ url: 'blob:test-1', width: 100, height: 80 }]);
    fixture.detectChanges();
    return { fixture, store };
  }

  const details = (fixture: { nativeElement: HTMLElement }) =>
    fixture.nativeElement.querySelector('details') as HTMLDetailsElement;

  it('montre la photo de présentation dépliée à la première étape', async () => {
    const { fixture } = await setup();
    expect(details(fixture).open).toBe(true);
    expect(fixture.nativeElement.querySelector('.photo-thumb')).not.toBeNull();
  });

  it('replie le panneau dès que la lectrice avance, et le rouvre au retour', async () => {
    const { fixture, store } = await setup();
    store.move(1);
    fixture.detectChanges();
    expect(details(fixture).open).toBe(false);

    store.move(-1);
    fixture.detectChanges();
    expect(details(fixture).open).toBe(true);
  });
});

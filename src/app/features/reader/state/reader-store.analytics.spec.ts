import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { ReaderStore } from './reader-store';

describe('ReaderStore — mesure', () => {
  let track: ReturnType<typeof vi.fn>;
  let store: ReaderStore;

  beforeEach(() => {
    track = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: AnalyticsService, useValue: { track } }],
    });
    store = TestBed.inject(ReaderStore);
  });

  const events = () => track.mock.calls.map(([name]) => name);

  it('compte un patron apporté par la personne comme collé puis découpé, et ouvre un projet', () => {
    store.load('Rang 1 : 6 ms dans un cercle magique\nRang 2 : 2 ms dans chaque maille');

    expect(events()).toEqual(['project_created', 'pattern_pasted', 'pattern_parsed']);
    expect(track).toHaveBeenLastCalledWith(
      'pattern_parsed',
      expect.objectContaining({ origine: 'saisie' }),
    );
  });

  it("ne compte jamais l'exemple comme un patron collé", () => {
    store.loadDemo();

    expect(events()).toEqual(['project_created', 'pattern_parsed']);
    expect(track).toHaveBeenCalledWith(
      'pattern_parsed',
      expect.objectContaining({ origine: 'exemple' }),
    );
  });

  it('ne compte pas un PDF importé comme un patron collé', () => {
    store.load('Round 1: 6 sc in a magic ring (6)', 'pdf');

    expect(events()).toEqual(['project_created', 'pattern_parsed']);
    expect(track).toHaveBeenCalledWith(
      'pattern_parsed',
      expect.objectContaining({ origine: 'pdf' }),
    );
  });

  it("n'ouvre pas de nouveau projet quand un patron est déjà en cours", () => {
    store.load('Rang 1 : 6 ms');
    track.mockClear();

    store.load('Rang 1 : 12 ms');

    expect(events()).toEqual(['pattern_pasted', 'pattern_parsed']);
  });

  it("n'émet rien quand on vide le lecteur", () => {
    store.clear();

    expect(track).not.toHaveBeenCalled();
  });
});

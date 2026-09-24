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

  it('compte les lignes rangées dans Pattern.materials, sans leur texte', () => {
    store.load(['Materials:', '4 mm hook', '100 g yarn', 'Round 1: 6 sc (6)'].join('\n'));

    expect(track).toHaveBeenLastCalledWith(
      'pattern_parsed',
      expect.objectContaining({ materials: 2 }),
    );
  });

  it("n'ouvre pas de nouveau projet quand on recharge le même patron", () => {
    store.load('Rang 1 : 6 ms');
    track.mockClear();

    store.load('Rang 1 : 6 ms');

    expect(events()).toEqual(['pattern_pasted', 'pattern_parsed']);
  });

  it('ouvre un nouveau projet quand on charge un autre patron', () => {
    store.load('Rang 1 : 6 ms');
    track.mockClear();

    store.load('Rang 1 : 12 ms');

    expect(events()).toEqual(['project_created', 'pattern_pasted', 'pattern_parsed']);
  });

  it("n'émet rien quand on vide le lecteur", () => {
    store.clear();

    expect(track).not.toHaveBeenCalled();
  });

  describe('profondeur de lecture', () => {
    /** Une seule pièce d'au moins `rows` étapes. */
    function longPattern(rows: number): string {
      const lignes = ['Patron', 'Piece A'];
      for (let i = 1; i <= rows; i++) lignes.push(`Round ${i}: 6 sc (6)`);
      return lignes.join('\n');
    }

    const depths = () => events().filter((name) => String(name).startsWith('reading_depth_'));

    it('émet chaque palier une seule fois, dans l’ordre où il est atteint', () => {
      store.load(longPattern(55));
      track.mockClear();

      for (let i = 0; i < 54; i++) store.move(1);

      expect(depths()).toEqual(['reading_depth_5', 'reading_depth_20', 'reading_depth_50']);
    });

    it('reprendre un projet déjà au-delà d’un palier ne le réémet pas', () => {
      store.load(longPattern(55));
      const id = store.currentId()!;
      store.clear();

      store.projects.set([
        {
          id,
          name: 'Patron',
          source: longPattern(55),
          image: '',
          pieceIndex: 0,
          stepIndex: 9, // position absolue 10 : déjà au-delà du palier 5
          done: {},
          reps: {},
          elapsed: 0,
          expandAbbreviations: false,
          createdAt: 0,
          lastOpenedAt: 0,
        },
      ]);
      track.mockClear();

      store.resumeProject(id);
      expect(depths()).toEqual([]);

      // La suite avance normalement : le palier 20 s'émet, pas le 5 déjà couvert.
      store.move(15);
      expect(depths()).toEqual(['reading_depth_20']);
    });
  });
});

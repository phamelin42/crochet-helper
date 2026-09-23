import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { ReaderStore } from './reader-store';

/** Deux pièces, pour exercer le franchissement de frontière dans `move()`. */
const TWO_PIECES = [
  'Patron',
  'Piece A',
  'Round 1: 6 sc (6)',
  'Round 2: 6 sc (6)',
  'Piece B',
  'Round 1: 6 sc (6)',
].join('\n');

/** Une seule pièce d'au moins `rows` étapes, pour exercer la profondeur de lecture. */
function longPattern(rows: number): string {
  const lignes = ['Patron', 'Piece A'];
  for (let i = 1; i <= rows; i++) lignes.push(`Round ${i}: 6 sc (6)`);
  return lignes.join('\n');
}

describe('ReaderStore', () => {
  let store: ReaderStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(ReaderStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('load', () => {
    it('calcule le total comme la somme des étapes des pièces et repart à la première étape', () => {
      store.load(TWO_PIECES);

      expect(store.pieces().length).toBe(2);
      expect(store.total()).toBe(store.pieces().reduce((n, p) => n + p.steps.length, 0));
      expect(store.pieceIndex()).toBe(0);
      expect(store.stepIndex()).toBe(0);
    });

    it('repart toujours à la première étape et remet compteurs et avancement à zéro', () => {
      store.load(TWO_PIECES);
      store.move(1);
      store.addRepeat(2);
      store.setDone(true);

      store.load(TWO_PIECES);

      expect(store.pieceIndex()).toBe(0);
      expect(store.stepIndex()).toBe(0);
      expect(store.done()).toEqual({});
      expect(store.reps()).toEqual({});
    });
  });

  describe('move', () => {
    it('franchit la fin d’une pièce pour prendre la première étape de la suivante', () => {
      store.load(TWO_PIECES);

      store.move(1);
      expect(store.pieceIndex()).toBe(0);
      expect(store.stepIndex()).toBe(1);

      store.move(1);
      expect(store.pieceIndex()).toBe(1);
      expect(store.stepIndex()).toBe(0);
    });

    it('move(-1) fait l’inverse : revient à la dernière étape de la pièce précédente', () => {
      store.load(TWO_PIECES);
      store.move(1);
      store.move(1);

      store.move(-1);

      expect(store.pieceIndex()).toBe(0);
      expect(store.stepIndex()).toBe(1);
    });

    it('hasPrevious() et hasNext() sont faux aux deux extrémités du patron', () => {
      store.load(TWO_PIECES);

      expect(store.hasPrevious()).toBe(false);
      expect(store.hasNext()).toBe(true);

      store.move(1);
      store.move(1);

      expect(store.hasNext()).toBe(false);
      expect(store.hasPrevious()).toBe(true);
    });
  });

  describe('goTo', () => {
    it('borne aux limites de la pièce courante', () => {
      store.load(TWO_PIECES);

      store.goTo(0);
      expect(store.stepIndex()).toBe(0);

      store.goTo(99);
      expect(store.stepIndex()).toBe(store.stepCount() - 1);
    });

    it('ne lève pas quand il est appelé hors patron', () => {
      expect(() => store.goTo(3)).not.toThrow();
      expect(store.stepIndex()).toBe(0);
    });
  });

  describe('addRepeat', () => {
    it('ne descend jamais sous zéro', () => {
      store.load(TWO_PIECES);

      store.addRepeat(-1);

      expect(store.currentReps()).toBe(0);
    });

    it('compte les répétitions par position : changer d’étape puis revenir retrouve la valeur', () => {
      store.load(TWO_PIECES);
      store.addRepeat(3);
      expect(store.currentReps()).toBe(3);

      store.move(1);
      expect(store.currentReps()).toBe(0);

      store.move(-1);
      expect(store.currentReps()).toBe(3);
    });
  });

  describe('setDone', () => {
    it('avance d’une étape s’il en reste une', () => {
      store.load(TWO_PIECES);

      store.setDone(true);

      expect(store.pieceIndex()).toBe(0);
      expect(store.stepIndex()).toBe(1);
    });

    it('ne va pas au-delà de la fin du patron', () => {
      store.load(TWO_PIECES);
      store.move(1);
      store.move(1);
      expect(store.hasNext()).toBe(false);

      store.setDone(true);

      expect(store.pieceIndex()).toBe(1);
      expect(store.stepIndex()).toBe(0);
      expect(store.isDone()).toBe(true);
    });
  });

  describe('chronomètre', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('startTimer accumule le temps écoulé, stopTimer arrête l’accumulation', () => {
      store.startTimer();
      expect(store.running()).toBe(true);

      vi.advanceTimersByTime(3_000);
      expect(store.elapsed()).toBe(3_000);

      store.stopTimer();
      expect(store.running()).toBe(false);

      vi.advanceTimersByTime(3_000);
      expect(store.elapsed()).toBe(3_000);
    });
  });

  describe('profondeur de lecture', () => {
    it('émet chaque palier une seule fois, dans l’ordre où il est atteint', () => {
      const analytics = TestBed.inject(AnalyticsService);
      const trackSpy = vi.spyOn(analytics, 'track');
      store.load(longPattern(55));
      trackSpy.mockClear();

      for (let i = 0; i < 54; i++) store.move(1);

      const profondeurs = trackSpy.mock.calls
        .map(([event]) => event)
        .filter((event) => event.startsWith('reading_depth_'));
      expect(profondeurs).toEqual(['reading_depth_5', 'reading_depth_20', 'reading_depth_50']);
    });

    it('reprendre un projet déjà au-delà d’un palier ne le réémet pas', () => {
      const analytics = TestBed.inject(AnalyticsService);
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
      const trackSpy = vi.spyOn(analytics, 'track');
      store.resumeProject(id);

      const profondeurs = trackSpy.mock.calls
        .map(([event]) => event)
        .filter((event) => event.startsWith('reading_depth_'));
      expect(profondeurs).toEqual([]);

      // La suite avance normalement : le palier 20 s'émet, pas le 5 déjà couvert.
      store.move(15);
      const suite = trackSpy.mock.calls
        .map(([event]) => event)
        .filter((event) => event.startsWith('reading_depth_'));
      expect(suite).toEqual(['reading_depth_20']);
    });
  });

  describe('clear', () => {
    it('remet tout à zéro, chronomètre compris', () => {
      vi.useFakeTimers();
      store.load(TWO_PIECES);
      store.move(1);
      store.addRepeat(2);
      store.setDone(true);
      store.startTimer();
      vi.advanceTimersByTime(2_000);

      store.clear();

      expect(store.source()).toBe('');
      expect(store.total()).toBe(0);
      expect(store.done()).toEqual({});
      expect(store.reps()).toEqual({});
      expect(store.elapsed()).toBe(0);
      expect(store.running()).toBe(false);
      expect(store.currentId()).toBeNull();
    });
  });
});

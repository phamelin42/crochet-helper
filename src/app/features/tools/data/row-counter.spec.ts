import { describe, expect, it } from 'vitest';
import {
  CounterState,
  INITIAL_COUNTER_STATE,
  increment,
  parseSaved,
  reset,
  targetReached,
} from './row-counter';

describe('increment', () => {
  it('ajoute ou retire des rangs', () => {
    const state: CounterState = { count: 5, target: null };
    expect(increment(state, 1).count).toBe(6);
    expect(increment(state, -1).count).toBe(4);
  });

  it('ne descend jamais sous 0', () => {
    const state: CounterState = { count: 0, target: null };
    expect(increment(state, -1).count).toBe(0);
  });

  it('ne dépasse jamais 9999', () => {
    const state: CounterState = { count: 9999, target: null };
    expect(increment(state, 1).count).toBe(9999);
  });

  it('conserve l’objectif inchangé', () => {
    const state: CounterState = { count: 3, target: 40 };
    expect(increment(state, 1).target).toBe(40);
  });
});

describe('objectif atteint', () => {
  it('le compteur s’arrête à l’objectif, +1 ne le dépasse pas', () => {
    let state: CounterState = { count: 8, target: 10 };
    for (let i = 0; i < 5; i++) state = increment(state, 1);

    expect(state.count).toBe(10);
    expect(targetReached(state)).toBe(true);
  });

  it('on peut toujours reculer, puis avancer de nouveau', () => {
    const state = increment({ count: 10, target: 10 }, -1);
    expect(state.count).toBe(9);
    expect(targetReached(state)).toBe(false);
    expect(increment(state, 1).count).toBe(10);
  });

  it('sans objectif, rien n’est atteint et rien ne bloque', () => {
    expect(targetReached({ count: 500, target: null })).toBe(false);
    expect(increment({ count: 500, target: null }, 1).count).toBe(501);
  });

  it('un objectif abaissé sous le compte bloque +1 sans effacer le compte', () => {
    const state: CounterState = { count: 12, target: 10 };
    expect(targetReached(state)).toBe(true);
    expect(increment(state, 1).count).toBe(12);
    expect(increment(state, -1).count).toBe(10);
  });
});

describe('reset', () => {
  it('ramène le rang à 0 sans toucher à l’objectif', () => {
    const state: CounterState = { count: 12, target: 40 };
    expect(reset(state)).toEqual({ count: 0, target: 40 });
  });
});

describe('parseSaved', () => {
  it('retombe sur l’état initial pour une entrée nulle', () => {
    expect(parseSaved(null)).toEqual(INITIAL_COUNTER_STATE);
  });

  it('retombe sur l’état initial pour une chaîne', () => {
    expect(parseSaved('12')).toEqual(INITIAL_COUNTER_STATE);
  });

  it('retombe sur l’état initial pour un objet mal typé', () => {
    expect(parseSaved({ count: 'douze', target: 'quarante' })).toEqual(INITIAL_COUNTER_STATE);
  });

  it('ramène un rang négatif à 0', () => {
    expect(parseSaved({ count: -5, target: null })).toEqual({ count: 0, target: null });
  });

  it('ignore un objectif négatif ou nul', () => {
    expect(parseSaved({ count: 3, target: 0 })).toEqual({ count: 3, target: null });
    expect(parseSaved({ count: 3, target: -10 })).toEqual({ count: 3, target: null });
  });

  it('relit un état valide tel quel', () => {
    expect(parseSaved({ count: 12, target: 40 })).toEqual({ count: 12, target: 40 });
  });
});

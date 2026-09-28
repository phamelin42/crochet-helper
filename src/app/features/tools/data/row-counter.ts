const MIN = 0;
const MAX = 9999;

/** État du compteur de rangs (fiche 27) : un rang courant, un objectif optionnel. */
export interface CounterState {
  readonly count: number;
  readonly target: number | null;
}

export const INITIAL_COUNTER_STATE: CounterState = { count: 0, target: null };

function clampCount(value: number): number {
  return Math.min(MAX, Math.max(MIN, value));
}

export function increment(state: CounterState, delta: number): CounterState {
  return { ...state, count: clampCount(state.count + delta) };
}

export function reset(state: CounterState): CounterState {
  return { ...state, count: 0 };
}

/** Entrée inconnue (localStorage corrompu ou d'un ancien format) → état initial, jamais d'exception. */
export function parseSaved(raw: unknown): CounterState {
  if (!raw || typeof raw !== 'object') return INITIAL_COUNTER_STATE;
  const { count, target } = raw as Record<string, unknown>;

  const validCount =
    typeof count === 'number' && Number.isFinite(count) ? clampCount(Math.trunc(count)) : 0;
  const validTarget =
    typeof target === 'number' && Number.isFinite(target) && target > 0
      ? Math.min(MAX, Math.trunc(target))
      : null;

  return { count: validCount, target: validTarget };
}

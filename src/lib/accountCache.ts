import type { GameState } from '../types';

export const parseOwnedCachedState = (raw: string, userId: string): GameState | null => {
  try {
    const state = JSON.parse(raw) as GameState;
    return state.session?.userId === userId ? state : null;
  } catch {
    return null;
  }
};

import type { GameState, UserSession } from '../types';

interface SessionResponse {
  session: UserSession;
  state: GameState | null;
  storage: 'postgres' | 'memory';
}

interface SaveStateResponse {
  updatedAt: number;
}

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.error === 'string' ? body.error : `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
};

export const bootstrapAnonymousSession = (): Promise<SessionResponse> =>
  requestJson<SessionResponse>('/api/session');

export const saveCloudState = (state: GameState): Promise<SaveStateResponse> =>
  requestJson<SaveStateResponse>('/api/state', {
    method: 'PUT',
    body: JSON.stringify({ state }),
  });

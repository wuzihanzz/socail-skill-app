import type { MemoryDrawer, MemoryRoomType } from '../types';

export interface LongTermMemoryEntry {
  id: string;
  characterId: string;
  roomType: MemoryRoomType | string;
  content: string;
  importance: number;
  tags: string[];
  source: 'conversation' | 'system' | 'manual';
  score?: number;
  createdAt: number;
  updatedAt: number;
}

interface SearchMemoryResponse {
  entries: LongTermMemoryEntry[];
  storage: 'postgres' | 'memory';
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

export const searchLongTermMemories = (
  characterId: string,
  query: string,
  limit = 6
): Promise<SearchMemoryResponse> =>
  requestJson<SearchMemoryResponse>('/api/memory/search', {
    method: 'POST',
    body: JSON.stringify({ characterId, query, limit }),
  });

export const saveLongTermMemories = (
  characterId: string,
  entries: Array<{ roomType: MemoryRoomType; drawer: MemoryDrawer }>
): Promise<{ entries: LongTermMemoryEntry[]; storage: 'postgres' | 'memory' }> =>
  requestJson<{ entries: LongTermMemoryEntry[]; storage: 'postgres' | 'memory' }>('/api/memory/entries', {
    method: 'POST',
    body: JSON.stringify({
      characterId,
      entries: entries.map(({ roomType, drawer }) => ({
        id: drawer.id,
        roomType,
        content: drawer.content,
        importance: drawer.importance,
        tags: drawer.tags,
        source: drawer.source,
        embeddingText: drawer.embeddingText ?? drawer.content,
      })),
    }),
  });

export const formatLongTermMemoryContext = (entries: LongTermMemoryEntry[]): string => {
  if (entries.length === 0) return '';

  const grouped = entries.reduce<Record<string, LongTermMemoryEntry[]>>((acc, entry) => {
    const key = entry.roomType;
    acc[key] = acc[key] ?? [];
    acc[key].push(entry);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([roomType, roomEntries]) => {
      const lines = roomEntries.slice(0, 3).map((entry) => `- ${entry.content}`).join('\n');
      return `### ${roomType}\n${lines}`;
    })
    .join('\n');
};

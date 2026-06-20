import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTextEmbedding, rankMemoryEntries } from '../server/memorySearch';
import type { MemoryEntry } from '../server/database';

const createEntry = (
  id: string,
  content: string,
  tags: string[],
  importance = 3
): MemoryEntry => ({
  id,
  userId: '00000000-0000-4000-8000-000000000001',
  characterId: 'chen-wei',
  roomType: 'preferences',
  content,
  importance,
  tags,
  source: 'conversation',
  embeddingText: content,
  embedding: buildTextEmbedding(content),
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

test('ranks a relevant preference ahead of unrelated memories', () => {
  const preference = createEntry('preference', '用户不喜欢被说教，希望直接回应', ['preference'], 4);
  const unrelated = createEntry('work', '用户最近在准备工作项目', ['work'], 5);

  const ranked = rankMemoryEntries(
    [unrelated, preference],
    '你还记得我不喜欢别人说教吗',
    2
  );

  assert.equal(ranked[0]?.id, 'preference');
});

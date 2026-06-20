import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAuthSession,
  deleteAuthSession,
  findAuthSessionUserId,
  upsertMemoryEntries,
} from '../server/database';

const userA = '00000000-0000-4000-8000-00000000000a';
const userB = '00000000-0000-4000-8000-00000000000b';

test('creates and revokes an account session', async () => {
  const tokenHash = `session-${Date.now()}`;
  await createAuthSession(userA, tokenHash, Date.now() + 60_000);
  assert.equal(await findAuthSessionUserId(tokenHash), userA);
  await deleteAuthSession(tokenHash);
  assert.equal(await findAuthSessionUserId(tokenHash), null);
});

test('deduplicates identical memories for one character', async () => {
  const content = `用户喜欢安静的咖啡店-${Date.now()}`;
  const base = {
    userId: userA,
    characterId: 'chen-wei',
    roomType: 'preferences',
    content,
    importance: 4,
    tags: ['preference'],
    source: 'conversation' as const,
  };
  const first = await upsertMemoryEntries([{ ...base, id: `first-${Date.now()}` }]);
  const second = await upsertMemoryEntries([{ ...base, id: `second-${Date.now()}` }]);
  assert.equal(second[0]?.id, first[0]?.id);
});

test('rejects a memory id owned by another user', async () => {
  const id = `shared-${Date.now()}`;
  const base = {
    id,
    characterId: 'chen-wei',
    roomType: 'preferences',
    importance: 3,
    tags: ['preference'],
    source: 'conversation' as const,
  };
  await upsertMemoryEntries([{ ...base, userId: userA, content: '用户 A 的记忆' }]);
  await assert.rejects(
    upsertMemoryEntries([{ ...base, userId: userB, content: '用户 B 尝试覆盖' }]),
    /MEMORY_OWNER_MISMATCH/
  );
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { parseOwnedCachedState } from '../src/lib/accountCache';

const createCachedState = (userId: string) =>
  JSON.stringify({
    session: {
      mode: 'account',
      userId,
      displayName: '测试用户',
      authProvider: 'password',
      createdAt: Date.now(),
    },
    userProfile: null,
    currentCharacterId: null,
    relationships: {},
    conversationHistory: [],
  });

test('accepts cache owned by the current account', () => {
  assert.equal(parseOwnedCachedState(createCachedState('user-a'), 'user-a')?.session?.userId, 'user-a');
});

test('rejects cache owned by another account', () => {
  assert.equal(parseOwnedCachedState(createCachedState('user-a'), 'user-b'), null);
});

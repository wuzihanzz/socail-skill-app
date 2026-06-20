import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import {
  clearIdentity,
  issueAccountIdentity,
  readAccountToken,
} from '../server/identity';

const createResponse = () => {
  const headers = new Map<string, string | string[]>();
  return {
    getHeader: (name: string) => headers.get(name),
    setHeader: (name: string, value: string | string[]) => {
      headers.set(name, value);
    },
    headers,
  };
};

test('account and anonymous cookie changes are both preserved', () => {
  const response = createResponse();
  clearIdentity(response as unknown as Response);
  issueAccountIdentity(response as unknown as Response, 'opaque-token');
  const cookies = response.headers.get('Set-Cookie');
  assert.ok(Array.isArray(cookies));
  assert.equal(cookies.length, 2);
});

test('reads the opaque account token from cookies', () => {
  const request = {
    header: (name: string) =>
      name === 'cookie' ? 'relation_uid=ignored; relation_session=opaque-token' : undefined,
  } as unknown as Request;
  assert.equal(readAccountToken(request), 'opaque-token');
});

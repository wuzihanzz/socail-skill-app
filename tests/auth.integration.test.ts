import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';

const waitForServer = (child: ReturnType<typeof spawn>): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for test server')), 10_000);
    const onData = (chunk: Buffer) => {
      if (!chunk.toString().includes('Server listening')) return;
      clearTimeout(timeout);
      child.stdout?.off('data', onData);
      resolve();
    };
    child.stdout?.on('data', onData);
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Test server exited early with code ${code}`));
    });
  });

const cookieByName = (response: Response, name: string): string | undefined =>
  response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .find((value) => value.startsWith(`${name}=`) && value !== `${name}=`);

test('registers, restores, and revokes an account session over HTTP', async () => {
  const port = 31_000 + Math.floor(Math.random() * 1_000);
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      ALLOWED_ORIGINS: origin,
      COOKIE_SECRET: 'integration-test-secret',
      DATABASE_URL: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForServer(child);
    const anonymousResponse = await fetch(`${origin}/api/session`);
    assert.equal(anonymousResponse.status, 200);
    const anonymousCookie = cookieByName(anonymousResponse, 'relation_uid');
    assert.ok(anonymousCookie);

    const email = `integration.${Date.now()}@example.com`;
    const registerResponse = await fetch(`${origin}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: anonymousCookie,
        Origin: origin,
      },
      body: JSON.stringify({ email, password: 'TestPassword!123', displayName: '集成测试' }),
    });
    assert.equal(registerResponse.status, 200);
    const registered = await registerResponse.json();
    assert.equal(registered.session.authProvider, 'password');
    const accountCookie = cookieByName(registerResponse, 'relation_session');
    assert.ok(accountCookie);

    const restoredResponse = await fetch(`${origin}/api/session`, {
      headers: { Cookie: accountCookie },
    });
    assert.equal(restoredResponse.status, 200);
    const restored = await restoredResponse.json();
    assert.equal(restored.session.email, email);

    const logoutResponse = await fetch(`${origin}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: accountCookie,
        Origin: origin,
      },
      body: '{}',
    });
    assert.equal(logoutResponse.status, 200);

    const revokedResponse = await fetch(`${origin}/api/session`, {
      headers: { Cookie: accountCookie },
    });
    assert.equal(revokedResponse.status, 200);
    const revoked = await revokedResponse.json();
    assert.equal(revoked.session.authProvider, 'server-anonymous');
    assert.notEqual(revoked.session.userId, restored.session.userId);
  } finally {
    child.kill();
  }
});

import express from 'express';
import path from 'node:path';
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import {
  closeDatabase,
  consumeDailyIpRequest,
  consumeDailyRequest,
  createAuthAccount,
  createAuthSession,
  deleteAuthSession,
  findAuthAccountByEmail,
  findAuthAccountByUserId,
  findAuthSessionUserId,
  initializeDatabase,
  isDatabaseConfigured,
  listMemoryEntries,
  loadUserState,
  saveUserState,
  upsertMemoryEntries,
  type MemoryEntry,
} from './server/database';
import {
  ACCOUNT_SESSION_SECONDS,
  clearAccountIdentity,
  clearIdentity,
  issueAccountIdentity,
  issueIdentity,
  readAccountToken,
  readUserId,
} from './server/identity';
import { buildTextEmbedding, rankMemoryEntries } from './server/memorySearch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

const scryptAsync = promisify(scrypt);

const defaultAllowedOrigins = [
  'https://social.preview.aliyun-zeabur.cn',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS?.split(',') ?? defaultAllowedOrigins)
    .map((origin) => origin.trim())
    .filter(Boolean)
);
const windowMs = Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS) || 60_000;
const maxRequests = Number(process.env.CHAT_RATE_LIMIT_MAX) || 12;
const authWindowMs = 15 * 60_000;
const authLoginLimit = Number(process.env.AUTH_LOGIN_RATE_LIMIT) || 12;
const authRegisterLimit = Number(process.env.AUTH_REGISTER_RATE_LIMIT) || 6;
const writeWindowMs = 60_000;
const stateWriteLimit = Number(process.env.STATE_WRITE_RATE_LIMIT) || 60;
const memoryWriteLimit = Number(process.env.MEMORY_WRITE_RATE_LIMIT) || 30;
const dailyRequestLimit = Number(process.env.CHAT_DAILY_LIMIT) || 200;
const dailyIpRequestLimit = Number(process.env.CHAT_DAILY_IP_LIMIT) || 300;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

const storageMode = () => (isDatabaseConfigured() ? 'postgres' : 'memory');

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return process.env.ALLOW_MISSING_ORIGIN === 'true';
  return allowedOrigins.has(origin);
};

const getClientIp = (req: express.Request): string => req.ip || 'unknown';

const isRateLimited = (key: string, limit = maxRequests, durationMs = windowMs): boolean => {
  const now = Date.now();
  if (rateBuckets.size > 10_000) {
    for (const [bucketKey, candidate] of rateBuckets) {
      if (candidate.resetAt <= now) rateBuckets.delete(bucketKey);
    }
  }
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + durationMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
};

const hashClientIp = (ip: string): string =>
  createHash('sha256')
    .update(`${process.env.IP_HASH_SALT || process.env.COOKIE_SECRET || 'local'}:${ip}`)
    .digest('hex');

const hashSessionToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

const issueAccountSession = async (res: express.Response, userId: string): Promise<void> => {
  const token = randomBytes(32).toString('base64url');
  await createAuthSession(
    userId,
    hashSessionToken(token),
    Date.now() + ACCOUNT_SESSION_SECONDS * 1000
  );
  clearIdentity(res);
  issueAccountIdentity(res, token);
};

const resolveUserId = async (req: express.Request): Promise<string | null> => {
  const accountToken = readAccountToken(req);
  if (accountToken) {
    const accountUserId = await findAuthSessionUserId(hashSessionToken(accountToken));
    if (accountUserId) return accountUserId;
  }

  const anonymousUserId = readUserId(req);
  if (!anonymousUserId) return null;
  const account = await findAuthAccountByUserId(anonymousUserId);
  return account ? null : anonymousUserId;
};

const requireUserId = async (
  req: express.Request,
  res: express.Response
): Promise<string | null> => {
  try {
    const userId = await resolveUserId(req);
    if (!userId) res.status(401).json({ error: 'Missing or invalid session' });
    return userId;
  } catch (error) {
    console.error('Failed to validate session:', error);
    res.status(503).json({ error: 'Identity service is temporarily unavailable' });
    return null;
  }
};

const scopeMemoryId = (userId: string, clientId: string): string =>
  `mem_${createHash('sha256').update(`${userId}\0${clientId}`).digest('hex')}`;

const toPublicMemoryEntry = (entry: MemoryEntry) => ({
  id: entry.id,
  characterId: entry.characterId,
  roomType: entry.roomType,
  content: entry.content,
  importance: entry.importance,
  tags: entry.tags,
  source: entry.source,
  embeddingText: entry.embeddingText,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
  score: entry.score,
});

const normalizeEmail = (email: unknown): string =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const normalizeDisplayName = (value: unknown, email: string): string => {
  if (typeof value !== 'string') return email.split('@')[0] || '练习者';
  const trimmed = value.trim();
  return trimmed || email.split('@')[0] || '练习者';
};

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 120;

const isValidPassword = (password: unknown): password is string =>
  typeof password === 'string' && password.length >= 8 && password.length <= 128;

const isValidCharacterId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-z0-9-]{2,80}$/i.test(value);

const normalizeMemoryTags = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) => tag.trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 12)
    : [];

const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16).toString('base64url');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString('base64url')}`;
};

const verifyPassword = async (password: string, passwordHash: string): Promise<boolean> => {
  const [algorithm, salt, hash] = passwordHash.split(':');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const received = (await scryptAsync(password, salt, expected.length)) as Buffer;
  return expected.length === received.length && timingSafeEqual(expected, received);
};

const requireAllowedOrigin = (req: express.Request, res: express.Response): boolean => {
  const origin = req.header('origin');
  if (isAllowedOrigin(origin)) return true;
  console.warn('Rejected request from disallowed origin', {
    path: req.path,
    origin,
    ip: getClientIp(req),
  });
  res.status(403).json({ error: 'Forbidden' });
  return false;
};

const buildSessionResponse = async (
  userId: string,
  displayName: string,
  email?: string
) => {
  const stored = await loadUserState(userId);
  return {
    session: {
      mode: 'account' as const,
      userId,
      displayName,
      email,
      authProvider: email ? ('password' as const) : ('server-anonymous' as const),
      createdAt: stored.createdAt,
    },
    state: stored.state,
    storage: storageMode(),
  };
};

const getOrCreateUserId = async (
  req: express.Request,
  res: express.Response
): Promise<string> => {
  const candidateUserId = readUserId(req);
  const existingUserId =
    candidateUserId && !(await findAuthAccountByUserId(candidateUserId))
      ? candidateUserId
      : null;
  const userId = issueIdentity(res, existingUserId);
  await loadUserState(userId);
  return userId;
};

app.get('/api/session', async (req, res) => {
  try {
    const accountToken = readAccountToken(req);
    if (accountToken) {
      const accountUserId = await findAuthSessionUserId(hashSessionToken(accountToken));
      const account = accountUserId ? await findAuthAccountByUserId(accountUserId) : null;
      if (account) {
        return res.json(
          await buildSessionResponse(account.userId, account.displayName, account.email)
        );
      }
      clearAccountIdentity(res);
    }
    const userId = await getOrCreateUserId(req, res);
    const stored = await loadUserState(userId);
    return res.json({
      session: {
        mode: 'account',
        userId,
        displayName: '练习者',
        authProvider: 'server-anonymous',
        createdAt: stored.createdAt,
      },
      state: stored.state,
      storage: storageMode(),
    });
  } catch (error) {
    console.error('Failed to initialize anonymous session:', error);
    return res.status(500).json({ error: '身份服务暂时不可用，请稍后重试。' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  if (!requireAllowedOrigin(req, res)) return;

  const ip = getClientIp(req);
  if (isRateLimited(`auth:register:${ip}`, authRegisterLimit, authWindowMs)) {
    return res.status(429).json({ error: '注册尝试过于频繁，请稍后再试。' });
  }

  const email = normalizeEmail(req.body?.email);
  const displayName = normalizeDisplayName(req.body?.displayName, email);
  const password = req.body?.password;

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: '请输入有效邮箱。' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: '密码至少需要 8 个字符。' });
  }
  if (displayName.length > 40) {
    return res.status(400).json({ error: '昵称最多 40 个字符。' });
  }

  try {
    const anonymousUserId = readUserId(req);
    const existingUserId =
      anonymousUserId && !(await findAuthAccountByUserId(anonymousUserId))
        ? anonymousUserId
        : null;
    const userId = existingUserId ?? randomUUID();
    const account = await createAuthAccount({
      userId,
      email,
      displayName,
      passwordHash: await hashPassword(password),
    });
    await issueAccountSession(res, account.userId);
    return res.json(await buildSessionResponse(account.userId, account.displayName, account.email));
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
      return res.status(409).json({ error: '这个邮箱已经注册，可以直接登录。' });
    }
    console.error('Failed to register account:', error);
    return res.status(500).json({ error: '注册失败，请稍后重试。' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  if (!requireAllowedOrigin(req, res)) return;

  const ip = getClientIp(req);
  if (isRateLimited(`auth:login:${ip}`, authLoginLimit, authWindowMs)) {
    return res.status(429).json({ error: '登录尝试过于频繁，请稍后再试。' });
  }

  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  if (!isValidEmail(email) || typeof password !== 'string') {
    return res.status(400).json({ error: '邮箱或密码不正确。' });
  }

  try {
    const account = await findAuthAccountByEmail(email);
    if (!account || !(await verifyPassword(password, account.passwordHash))) {
      return res.status(401).json({ error: '邮箱或密码不正确。' });
    }
    await issueAccountSession(res, account.userId);
    return res.json(await buildSessionResponse(account.userId, account.displayName, account.email));
  } catch (error) {
    console.error('Failed to login:', error);
    return res.status(500).json({ error: '登录失败，请稍后重试。' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  if (!requireAllowedOrigin(req, res)) return;
  try {
    const accountToken = readAccountToken(req);
    if (accountToken) {
      await deleteAuthSession(hashSessionToken(accountToken));
    }
  } catch (error) {
    console.error('Failed to revoke account session:', error);
    return res.status(503).json({ error: '退出失败，请稍后重试。' });
  }
  clearAccountIdentity(res);
  clearIdentity(res);
  return res.json({ ok: true });
});

app.put('/api/state', async (req, res) => {
  if (!requireAllowedOrigin(req, res)) return;
  const userId = await requireUserId(req, res);
  if (!userId) return;
  if (isRateLimited(`write:state:${userId}`, stateWriteLimit, writeWindowMs)) {
    return res.status(429).json({ error: 'State is being updated too frequently' });
  }

  const { state } = req.body ?? {};
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return res.status(400).json({ error: 'Invalid state payload' });
  }
  if (state.session?.userId && state.session.userId !== userId) {
    return res.status(403).json({ error: 'State owner mismatch' });
  }

  try {
    const account = await findAuthAccountByUserId(userId);
    const updatedAt = await saveUserState(userId, {
      ...state,
      session: {
        ...state.session,
        mode: 'account',
        userId,
        email: account?.email ?? state.session?.email,
        displayName: account?.displayName ?? state.session?.displayName ?? '练习者',
        authProvider: account ? 'password' : 'server-anonymous',
      },
    });
    return res.json({ updatedAt });
  } catch (error) {
    console.error('Failed to save user state:', error);
    return res.status(500).json({ error: 'Unable to save state' });
  }
});

app.post('/api/memory/entries', async (req, res) => {
  if (!requireAllowedOrigin(req, res)) return;
  const userId = await requireUserId(req, res);
  if (!userId) return;
  if (isRateLimited(`write:memory:${userId}`, memoryWriteLimit, writeWindowMs)) {
    return res.status(429).json({ error: 'Memory is being updated too frequently' });
  }

  const { characterId, entries } = req.body ?? {};
  if (!isValidCharacterId(characterId) || !Array.isArray(entries)) {
    return res.status(400).json({ error: 'Invalid memory payload' });
  }

  const normalized = entries
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      id:
        typeof entry.id === 'string' && entry.id.length <= 160
          ? scopeMemoryId(userId, entry.id)
          : scopeMemoryId(userId, randomUUID()),
      userId,
      characterId,
      roomType:
        typeof entry.roomType === 'string' && entry.roomType.length <= 40
          ? entry.roomType
          : 'shared-events',
      content: typeof entry.content === 'string' ? entry.content.trim() : '',
      importance: typeof entry.importance === 'number' ? entry.importance : 3,
      tags: normalizeMemoryTags(entry.tags),
      source:
        entry.source === 'system' || entry.source === 'manual' || entry.source === 'conversation'
          ? entry.source
          : ('conversation' as const),
      embeddingText:
        typeof entry.embeddingText === 'string' ? entry.embeddingText.trim() : undefined,
    }))
    .filter((entry) => entry.content.length >= 4 && entry.content.length <= 600)
    .slice(0, 12)
    .map((entry) => ({
      ...entry,
      embedding: buildTextEmbedding(entry.embeddingText ?? entry.content),
    }));

  try {
    const saved = await upsertMemoryEntries(normalized);
    return res.json({
      entries: saved.map(toPublicMemoryEntry),
      storage: storageMode(),
    });
  } catch (error) {
    console.error('Failed to save memory entries:', error);
    return res.status(500).json({ error: 'Unable to save memory entries' });
  }
});

app.post('/api/memory/search', async (req, res) => {
  if (!requireAllowedOrigin(req, res)) return;
  const userId = await requireUserId(req, res);
  if (!userId) return;

  const { characterId, query, limit } = req.body ?? {};
  if (!isValidCharacterId(characterId) || typeof query !== 'string' || query.length > 2_000) {
    return res.status(400).json({ error: 'Invalid memory search payload' });
  }

  try {
    const entries = await listMemoryEntries(userId, characterId, 120);
    const ranked = rankMemoryEntries(entries, query.slice(0, 1000), Math.min(Number(limit) || 6, 12));
    return res.json({
      entries: ranked.map(toPublicMemoryEntry),
      storage: storageMode(),
    });
  } catch (error) {
    console.error('Failed to search memory entries:', error);
    return res.status(500).json({ error: 'Unable to search memory entries' });
  }
});

app.post('/api/chat', async (req, res) => {
  const { systemPrompt, userMessage, conversationHistory } = req.body ?? {};
  const origin = req.header('origin');
  const ip = getClientIp(req);

  if (!requireAllowedOrigin(req, res)) return;
  const userId = await requireUserId(req, res);
  if (!userId) return;

  if (isRateLimited(`${userId}:${ip}`)) {
    console.warn('Rate limited /api/chat request', { userId, ip, origin });
    return res.status(429).json({ error: 'Too many requests' });
  }

  if (!systemPrompt || !userMessage) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (
    typeof systemPrompt !== 'string' ||
    typeof userMessage !== 'string' ||
    systemPrompt.length > 24_000 ||
    userMessage.length > 2_000 ||
    (conversationHistory !== undefined && !Array.isArray(conversationHistory)) ||
    (Array.isArray(conversationHistory) &&
      (conversationHistory.length > 12 ||
        conversationHistory.some(
          (message) =>
            !message ||
            !['user', 'assistant'].includes(message.role) ||
            typeof message.content !== 'string' ||
            message.content.length > 5_000
        )))
  ) {
    return res.status(400).json({ error: 'Invalid or oversized chat payload' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('DEEPSEEK_API_KEY is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const dailyUsage = await consumeDailyRequest(userId, dailyRequestLimit);
    if (!dailyUsage.allowed) {
      console.warn('Daily chat quota reached', { userId, ip, ...dailyUsage });
      return res.status(429).json({ error: 'Daily chat limit reached' });
    }
    const dailyIpUsage = await consumeDailyIpRequest(hashClientIp(ip), dailyIpRequestLimit);
    if (!dailyIpUsage.allowed) {
      console.warn('Daily IP chat quota reached', { ip, ...dailyIpUsage });
      return res.status(429).json({ error: 'Daily network limit reached' });
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(Array.isArray(conversationHistory) ? conversationHistory : []),
      { role: 'user', content: userMessage },
    ];

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        max_tokens: 300,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('DeepSeek API error:', error);
      return res.status(response.status).json({
        error: `DeepSeek API error: ${response.status}`,
        details: error,
      });
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: unknown;
    };
    const content = data.choices?.[0]?.message?.content;

    if (content) {
      console.info('DeepSeek chat completion succeeded', {
        userId,
        ip,
        origin,
        historyLength: Array.isArray(conversationHistory) ? conversationHistory.length : 0,
        usage: data.usage,
      });
      return res.status(200).json({ text: content });
    }
    return res.status(500).json({ error: 'Unexpected response format from DeepSeek API' });
  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

const distDir = path.resolve(__dirname, 'dist');
app.use(express.static(distDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

const port = Number(process.env.PORT) || 3000;

const start = async () => {
  await initializeDatabase();
  const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });

  const shutdown = async () => {
    server.close();
    await closeDatabase();
  };
  process.once('SIGTERM', () => void shutdown());
  process.once('SIGINT', () => void shutdown());
};

void start().catch((error) => {
  console.error('Server failed to start:', error);
  process.exitCode = 1;
});

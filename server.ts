import express from 'express';
import path from 'node:path';
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import {
  closeDatabase,
  createAuthAccount,
  consumeDailyIpRequest,
  consumeDailyRequest,
  findAuthAccountByEmail,
  findAuthAccountByUserId,
  initializeDatabase,
  isDatabaseConfigured,
  loadUserState,
  saveUserState,
} from './server/database';
import { clearIdentity, issueIdentity, readUserId } from './server/identity';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));

const scryptAsync = promisify(scrypt);

const defaultAllowedOrigins = [
  'https://social.preview.aliyun-zeabur.cn',
  'http://localhost:5173',
  'http://localhost:3000',
];
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS?.split(',') ?? defaultAllowedOrigins)
    .map((origin) => origin.trim())
    .filter(Boolean)
);
const windowMs = Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS) || 60_000;
const maxRequests = Number(process.env.CHAT_RATE_LIMIT_MAX) || 12;
const dailyRequestLimit = Number(process.env.CHAT_DAILY_LIMIT) || 200;
const dailyIpRequestLimit = Number(process.env.CHAT_DAILY_IP_LIMIT) || 300;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return process.env.ALLOW_MISSING_ORIGIN === 'true';
  return allowedOrigins.has(origin);
};

const getClientIp = (req: express.Request): string => {
  const forwardedFor = req.header('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || req.ip || 'unknown';
};

const isRateLimited = (key: string): boolean => {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > maxRequests;
};

const hashClientIp = (ip: string): string =>
  createHash('sha256')
    .update(`${process.env.IP_HASH_SALT || process.env.COOKIE_SECRET || 'local'}:${ip}`)
    .digest('hex');

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

const buildSessionResponse = async (
  res: express.Response,
  userId: string,
  displayName: string,
  email?: string
) => {
  issueIdentity(res, userId);
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
    storage: isDatabaseConfigured() ? ('postgres' as const) : ('memory' as const),
  };
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

const getOrCreateUserId = async (
  req: express.Request,
  res: express.Response
): Promise<string> => {
  const existingUserId = readUserId(req);
  const userId = issueIdentity(res, existingUserId);
  await loadUserState(userId);
  return userId;
};

app.get('/api/session', async (req, res) => {
  try {
    const userId = await getOrCreateUserId(req, res);
    const account = await findAuthAccountByUserId(userId);
    if (account) {
      return res.json(
        await buildSessionResponse(res, account.userId, account.displayName, account.email)
      );
    }
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
      storage: isDatabaseConfigured() ? 'postgres' : 'memory',
    });
  } catch (error) {
    console.error('Failed to initialize anonymous session:', error);
    return res.status(500).json({ error: 'Unable to initialize session' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  if (!requireAllowedOrigin(req, res)) return;

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
    const existingUserId = readUserId(req);
    const userId = existingUserId ?? randomUUID();
    const account = await createAuthAccount({
      userId,
      email,
      displayName,
      passwordHash: await hashPassword(password),
    });
    return res.json(await buildSessionResponse(res, account.userId, account.displayName, account.email));
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
      return res.status(409).json({ error: '这个邮箱已经注册，可以直接登录。' });
    }
    console.error('Failed to register account:', error);
    return res.status(500).json({ error: 'Unable to register account' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  if (!requireAllowedOrigin(req, res)) return;

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
    return res.json(await buildSessionResponse(res, account.userId, account.displayName, account.email));
  } catch (error) {
    console.error('Failed to login:', error);
    return res.status(500).json({ error: 'Unable to login' });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  clearIdentity(res);
  return res.json({ ok: true });
});

app.put('/api/state', async (req, res) => {
  if (!requireAllowedOrigin(req, res)) return;
  const userId = readUserId(req);
  if (!userId) return res.status(401).json({ error: 'Missing or invalid session' });

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

app.post('/api/chat', async (req, res) => {
  const { systemPrompt, userMessage, conversationHistory } = req.body ?? {};
  const origin = req.header('origin');
  const ip = getClientIp(req);
  const userId = readUserId(req);

  if (!requireAllowedOrigin(req, res)) return;
  if (!userId) return res.status(401).json({ error: 'Missing or invalid session' });

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
    systemPrompt.length > 20_000 ||
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

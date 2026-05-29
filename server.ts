import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

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

app.post('/api/chat', async (req, res) => {
  const { systemPrompt, userMessage, conversationHistory } = req.body ?? {};
  const origin = req.header('origin');
  const ip = getClientIp(req);

  if (!isAllowedOrigin(origin)) {
    console.warn('Rejected /api/chat request from disallowed origin', { origin, ip });
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (isRateLimited(ip)) {
    console.warn('Rate limited /api/chat request', { ip, origin });
    return res.status(429).json({ error: 'Too many requests' });
  }

  if (!systemPrompt || !userMessage) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('DEEPSEEK_API_KEY is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
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
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

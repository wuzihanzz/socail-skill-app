import { Pool } from 'pg';

export interface StoredUserState {
  userId: string;
  state: unknown | null;
  createdAt: number;
  updatedAt: number;
}

export interface AuthAccount {
  userId: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: number;
  updatedAt: number;
}

interface AuthSession {
  userId: string;
  expiresAt: number;
}

export interface MemoryEntryInput {
  id?: string;
  userId: string;
  characterId: string;
  roomType: string;
  content: string;
  importance: number;
  tags: string[];
  source: 'conversation' | 'system' | 'manual';
  embeddingText?: string;
  embedding?: number[];
}

export interface MemoryEntry extends MemoryEntryInput {
  id: string;
  createdAt: number;
  updatedAt: number;
  score?: number;
}

interface UserStateRow {
  user_id: string;
  state: unknown | null;
  created_at: Date;
  updated_at: Date;
}

interface AuthAccountRow {
  user_id: string;
  email: string;
  display_name: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

interface AuthSessionRow {
  user_id: string;
  expires_at: Date;
}

interface MemoryEntryRow {
  id: string;
  user_id: string;
  character_id: string;
  room_type: string;
  content: string;
  importance: number;
  tags: string[];
  source: 'conversation' | 'system' | 'manual';
  embedding_text: string | null;
  embedding: number[] | null;
  created_at: Date;
  updated_at: Date;
}

const databaseUrl = process.env.DATABASE_URL?.trim();
const memoryStates = new Map<string, StoredUserState>();
const memoryAccountsByEmail = new Map<string, AuthAccount>();
const memoryAuthSessions = new Map<string, AuthSession>();
const memoryUserUsage = new Map<string, number>();
const memoryIpUsage = new Map<string, number>();
const memoryEntries = new Map<string, MemoryEntry>();
const MAX_MEMORY_ENTRIES_PER_CHARACTER = 500;
const usesZeaburPrivateNetwork = databaseUrl?.includes('zeabur.internal') ?? false;

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl:
        process.env.DATABASE_SSL === 'false' || usesZeaburPrivateNetwork
          ? false
          : process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : undefined,
      max: Number(process.env.DATABASE_POOL_SIZE) || 5,
    })
  : null;

export const isDatabaseConfigured = (): boolean => Boolean(pool);

export const initializeDatabase = async (): Promise<void> => {
  if (!pool) {
    console.warn('DATABASE_URL is not set; user state will only persist until the server restarts.');
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id UUID PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS auth_accounts (
      user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS auth_sessions_user_idx
      ON auth_sessions (user_id);

    CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx
      ON auth_sessions (expires_at);

    CREATE TABLE IF NOT EXISTS user_states (
      user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
      state JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS daily_usage (
      user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
      request_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, usage_date)
    );

    CREATE TABLE IF NOT EXISTS daily_ip_usage (
      ip_hash TEXT NOT NULL,
      usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
      request_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (ip_hash, usage_date)
    );

    CREATE TABLE IF NOT EXISTS memory_entries (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      character_id TEXT NOT NULL,
      room_type TEXT NOT NULL,
      content TEXT NOT NULL,
      importance INTEGER NOT NULL CHECK (importance BETWEEN 1 AND 5),
      tags TEXT[] NOT NULL DEFAULT '{}',
      source TEXT NOT NULL DEFAULT 'conversation',
      embedding_text TEXT,
      embedding JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS memory_entries_user_character_idx
      ON memory_entries (user_id, character_id, updated_at DESC);

    CREATE INDEX IF NOT EXISTS memory_entries_tags_idx
      ON memory_entries USING GIN (tags);
  `);
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const ensureUser = async (userId: string): Promise<void> => {
  if (!pool) {
    if (!memoryStates.has(userId)) {
      const now = Date.now();
      memoryStates.set(userId, { userId, state: null, createdAt: now, updatedAt: now });
    }
    return;
  }

  await pool.query(
    `INSERT INTO app_users (id)
     VALUES ($1)
     ON CONFLICT (id) DO UPDATE SET last_seen_at = NOW()`,
    [userId]
  );
};

export const loadUserState = async (userId: string): Promise<StoredUserState> => {
  await ensureUser(userId);

  if (!pool) {
    return memoryStates.get(userId)!;
  }

  const result = await pool.query<UserStateRow>(
    `SELECT u.id AS user_id, s.state, u.created_at, COALESCE(s.updated_at, u.last_seen_at) AS updated_at
     FROM app_users u
     LEFT JOIN user_states s ON s.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  const row = result.rows[0];
  return {
    userId: row.user_id,
    state: row.state,
    createdAt: row.created_at.getTime(),
    updatedAt: row.updated_at.getTime(),
  };
};

export const saveUserState = async (userId: string, state: unknown): Promise<number> => {
  await ensureUser(userId);
  const updatedAt = Date.now();

  if (!pool) {
    const existing = memoryStates.get(userId)!;
    memoryStates.set(userId, { ...existing, state, updatedAt });
    return updatedAt;
  }

  const result = await pool.query<{ updated_at: Date }>(
    `INSERT INTO user_states (user_id, state)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (user_id)
     DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()
     RETURNING updated_at`,
    [userId, JSON.stringify(state)]
  );
  return result.rows[0].updated_at.getTime();
};

const mapAccountRow = (row: AuthAccountRow): AuthAccount => ({
  userId: row.user_id,
  email: row.email,
  displayName: row.display_name,
  passwordHash: row.password_hash,
  createdAt: row.created_at.getTime(),
  updatedAt: row.updated_at.getTime(),
});

export const findAuthAccountByEmail = async (
  email: string
): Promise<AuthAccount | null> => {
  const normalizedEmail = normalizeEmail(email);

  if (!pool) {
    return memoryAccountsByEmail.get(normalizedEmail) ?? null;
  }

  const result = await pool.query<AuthAccountRow>(
    `SELECT user_id, email, display_name, password_hash, created_at, updated_at
     FROM auth_accounts
     WHERE email = $1`,
    [normalizedEmail]
  );
  return result.rows[0] ? mapAccountRow(result.rows[0]) : null;
};

export const findAuthAccountByUserId = async (
  userId: string
): Promise<AuthAccount | null> => {
  if (!pool) {
    return (
      [...memoryAccountsByEmail.values()].find((account) => account.userId === userId) ??
      null
    );
  }

  const result = await pool.query<AuthAccountRow>(
    `SELECT user_id, email, display_name, password_hash, created_at, updated_at
     FROM auth_accounts
     WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] ? mapAccountRow(result.rows[0]) : null;
};

export const createAuthAccount = async ({
  userId,
  email,
  displayName,
  passwordHash,
}: {
  userId: string;
  email: string;
  displayName: string;
  passwordHash: string;
}): Promise<AuthAccount> => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedDisplayName = displayName.trim() || normalizedEmail.split('@')[0];
  await ensureUser(userId);

  if (!pool) {
    if (memoryAccountsByEmail.has(normalizedEmail)) {
      throw new Error('EMAIL_EXISTS');
    }
    const now = Date.now();
    const account: AuthAccount = {
      userId,
      email: normalizedEmail,
      displayName: normalizedDisplayName,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };
    memoryAccountsByEmail.set(normalizedEmail, account);
    return account;
  }

  try {
    const result = await pool.query<AuthAccountRow>(
      `INSERT INTO auth_accounts (user_id, email, display_name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, email, display_name, password_hash, created_at, updated_at`,
      [userId, normalizedEmail, normalizedDisplayName, passwordHash]
    );
    return mapAccountRow(result.rows[0]);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    ) {
      throw new Error('EMAIL_EXISTS', { cause: error });
    }
    throw error;
  }
};

export const createAuthSession = async (
  userId: string,
  tokenHash: string,
  expiresAt: number
): Promise<void> => {
  await ensureUser(userId);

  if (!pool) {
    memoryAuthSessions.set(tokenHash, { userId, expiresAt });
    return;
  }

  await pool.query('DELETE FROM auth_sessions WHERE expires_at <= NOW()');
  await pool.query(
    `INSERT INTO auth_sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (token_hash) DO NOTHING`,
    [tokenHash, userId, new Date(expiresAt)]
  );
};

export const findAuthSessionUserId = async (tokenHash: string): Promise<string | null> => {
  const now = Date.now();

  if (!pool) {
    const session = memoryAuthSessions.get(tokenHash);
    if (!session) return null;
    if (session.expiresAt <= now) {
      memoryAuthSessions.delete(tokenHash);
      return null;
    }
    return session.userId;
  }

  const result = await pool.query<AuthSessionRow>(
    `SELECT user_id, expires_at
     FROM auth_sessions
     WHERE token_hash = $1 AND expires_at > NOW()`,
    [tokenHash]
  );
  return result.rows[0]?.user_id ?? null;
};

export const deleteAuthSession = async (tokenHash: string): Promise<void> => {
  if (!pool) {
    memoryAuthSessions.delete(tokenHash);
    return;
  }
  await pool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [tokenHash]);
};

export const consumeDailyRequest = async (
  userId: string,
  limit: number
): Promise<{ allowed: boolean; used: number; limit: number }> => {
  await ensureUser(userId);

  if (!pool) {
    const key = `${new Date().toISOString().slice(0, 10)}:${userId}`;
    const used = (memoryUserUsage.get(key) ?? 0) + 1;
    memoryUserUsage.set(key, used);
    return { allowed: used <= limit, used, limit };
  }

  const result = await pool.query<{ request_count: number }>(
    `INSERT INTO daily_usage (user_id, usage_date, request_count)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (user_id, usage_date)
     DO UPDATE SET request_count = daily_usage.request_count + 1
     RETURNING request_count`,
    [userId]
  );
  const used = result.rows[0].request_count;
  return { allowed: used <= limit, used, limit };
};

export const consumeDailyIpRequest = async (
  ipHash: string,
  limit: number
): Promise<{ allowed: boolean; used: number; limit: number }> => {
  if (!pool) {
    const key = `${new Date().toISOString().slice(0, 10)}:${ipHash}`;
    const used = (memoryIpUsage.get(key) ?? 0) + 1;
    memoryIpUsage.set(key, used);
    return { allowed: used <= limit, used, limit };
  }

  const result = await pool.query<{ request_count: number }>(
    `INSERT INTO daily_ip_usage (ip_hash, usage_date, request_count)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (ip_hash, usage_date)
     DO UPDATE SET request_count = daily_ip_usage.request_count + 1
     RETURNING request_count`,
    [ipHash]
  );
  const used = result.rows[0].request_count;
  return { allowed: used <= limit, used, limit };
};

const mapMemoryEntryRow = (row: MemoryEntryRow): MemoryEntry => ({
  id: row.id,
  userId: row.user_id,
  characterId: row.character_id,
  roomType: row.room_type,
  content: row.content,
  importance: row.importance,
  tags: row.tags ?? [],
  source: row.source,
  embeddingText: row.embedding_text ?? undefined,
  embedding: Array.isArray(row.embedding) ? row.embedding : undefined,
  createdAt: row.created_at.getTime(),
  updatedAt: row.updated_at.getTime(),
});

export const upsertMemoryEntries = async (entries: MemoryEntryInput[]): Promise<MemoryEntry[]> => {
  if (entries.length === 0) return [];

  const normalized = entries.map((entry) => ({
    ...entry,
    id:
      entry.id ??
      `mem_${entry.userId}_${entry.characterId}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    content: entry.content.trim(),
    tags: Array.from(new Set(entry.tags.map((tag) => tag.trim()).filter(Boolean))).slice(0, 12),
    importance: Math.max(1, Math.min(5, Math.round(entry.importance))),
    embeddingText: (entry.embeddingText ?? entry.content).trim(),
  }));

  for (const entry of normalized) {
    await ensureUser(entry.userId);
  }

  if (!pool) {
    const now = Date.now();
    const saved = normalized.map<MemoryEntry>((entry) => {
      const idMatch = memoryEntries.get(entry.id);
      if (
        idMatch &&
        (idMatch.userId !== entry.userId || idMatch.characterId !== entry.characterId)
      ) {
        throw new Error('MEMORY_OWNER_MISMATCH');
      }
      const duplicate = [...memoryEntries.values()].find(
        (candidate) =>
          candidate.userId === entry.userId &&
          candidate.characterId === entry.characterId &&
          candidate.content === entry.content
      );
      const existing = duplicate ?? idMatch;
      const next: MemoryEntry = {
        ...entry,
        id: existing?.id ?? entry.id,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      memoryEntries.set(next.id, next);
      return next;
    });
    for (const entry of normalized) {
      const owned = [...memoryEntries.values()]
        .filter(
          (candidate) =>
            candidate.userId === entry.userId && candidate.characterId === entry.characterId
        )
        .sort((left, right) =>
          right.importance - left.importance || right.updatedAt - left.updatedAt
        );
      owned.slice(MAX_MEMORY_ENTRIES_PER_CHARACTER).forEach((candidate) => {
        memoryEntries.delete(candidate.id);
      });
    }
    return saved;
  }

  const saved: MemoryEntry[] = [];
  for (const entry of normalized) {
    const result = await pool.query<MemoryEntryRow>(
      `INSERT INTO memory_entries (
         id, user_id, character_id, room_type, content, importance, tags, source, embedding_text, embedding
       )
       VALUES (
         COALESCE((
           SELECT id FROM memory_entries
           WHERE user_id = $2 AND character_id = $3 AND content = $5
           LIMIT 1
         ), $1),
         $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb
       )
       ON CONFLICT (id)
       DO UPDATE SET
         room_type = EXCLUDED.room_type,
         content = EXCLUDED.content,
         importance = EXCLUDED.importance,
         tags = EXCLUDED.tags,
         source = EXCLUDED.source,
         embedding_text = EXCLUDED.embedding_text,
         embedding = EXCLUDED.embedding,
         updated_at = NOW()
       WHERE memory_entries.user_id = EXCLUDED.user_id
         AND memory_entries.character_id = EXCLUDED.character_id
       RETURNING id, user_id, character_id, room_type, content, importance, tags, source,
         embedding_text, embedding, created_at, updated_at`,
      [
        entry.id,
        entry.userId,
        entry.characterId,
        entry.roomType,
        entry.content,
        entry.importance,
        entry.tags,
        entry.source,
        entry.embeddingText,
        JSON.stringify(entry.embedding ?? null),
      ]
    );
    const row = result.rows[0];
    if (!row) throw new Error('MEMORY_OWNER_MISMATCH');
    saved.push(mapMemoryEntryRow(row));
  }
  const owners = new Set(normalized.map((entry) => `${entry.userId}:${entry.characterId}`));
  for (const owner of owners) {
    const separator = owner.indexOf(':');
    const userId = owner.slice(0, separator);
    const characterId = owner.slice(separator + 1);
    await pool.query(
      `DELETE FROM memory_entries
       WHERE id IN (
         SELECT id FROM memory_entries
         WHERE user_id = $1 AND character_id = $2
         ORDER BY importance DESC, updated_at DESC
         OFFSET $3
       )`,
      [userId, characterId, MAX_MEMORY_ENTRIES_PER_CHARACTER]
    );
  }
  return saved;
};

export const listMemoryEntries = async (
  userId: string,
  characterId: string,
  limit = 80
): Promise<MemoryEntry[]> => {
  await ensureUser(userId);

  if (!pool) {
    return [...memoryEntries.values()]
      .filter((entry) => entry.userId === userId && entry.characterId === characterId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  const result = await pool.query<MemoryEntryRow>(
    `SELECT id, user_id, character_id, room_type, content, importance, tags, source,
       embedding_text, embedding, created_at, updated_at
     FROM memory_entries
     WHERE user_id = $1 AND character_id = $2
     ORDER BY importance DESC, updated_at DESC
     LIMIT $3`,
    [userId, characterId, limit]
  );
  return result.rows.map(mapMemoryEntryRow);
};

export const closeDatabase = async (): Promise<void> => {
  await pool?.end();
};

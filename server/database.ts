import { Pool } from 'pg';

export interface StoredUserState {
  userId: string;
  state: unknown | null;
  createdAt: number;
  updatedAt: number;
}

interface UserStateRow {
  user_id: string;
  state: unknown | null;
  created_at: Date;
  updated_at: Date;
}

const databaseUrl = process.env.DATABASE_URL?.trim();
const memoryStates = new Map<string, StoredUserState>();
const memoryUserUsage = new Map<string, number>();
const memoryIpUsage = new Map<string, number>();
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
  `);
};

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

export const closeDatabase = async (): Promise<void> => {
  await pool?.end();
};

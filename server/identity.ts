import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';

const COOKIE_NAME = 'relation_uid';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const fallbackSecret = randomUUID();

const getSecret = (): string => {
  const configured = process.env.COOKIE_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    console.warn('COOKIE_SECRET is not set; anonymous identities will reset after each deployment.');
  }
  return fallbackSecret;
};

const sign = (userId: string): string =>
  createHmac('sha256', getSecret()).update(userId).digest('base64url');

const parseCookies = (header: string | undefined): Record<string, string> =>
  Object.fromEntries(
    (header ?? '')
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const separator = item.indexOf('=');
        if (separator < 0) return [item, ''];
        return [item.slice(0, separator), decodeURIComponent(item.slice(separator + 1))];
      })
  );

const verifySignature = (userId: string, signature: string): boolean => {
  const expected = Buffer.from(sign(userId));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
};

export const readUserId = (req: Request): string | null => {
  const value = parseCookies(req.header('cookie'))[COOKIE_NAME];
  if (!value) return null;
  const separator = value.lastIndexOf('.');
  if (separator < 0) return null;
  const userId = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  return verifySignature(userId, signature) ? userId : null;
};

export const issueIdentity = (res: Response, existingUserId?: string | null): string => {
  const userId = existingUserId ?? randomUUID();
  const value = encodeURIComponent(`${userId}.${sign(userId)}`);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ONE_YEAR_SECONDS}${secure}`
  );
  return userId;
};

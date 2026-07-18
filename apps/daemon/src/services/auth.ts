import type Database from 'better-sqlite3';
import { randomUUID, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';
import type { RequestHandler } from 'express';
import { logger } from '../utils/index.js';

/**
 * Constant-time comparison of two hex strings. Fails closed (returns false) on a
 * length mismatch or any encoding error, so it can never throw into the caller.
 * Prevents the timing side-channel of a plain `===` string compare on HMAC sigs.
 */
function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length || bufA.length === 0) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function hashPassword(password: string): string {
  const salt = randomUUID().slice(0, 16);
  const buf = scryptSync(password, salt, 64);
  return `${salt}:${buf.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const idx = stored.indexOf(':');
  if (idx === -1) return false;
  const salt = stored.slice(0, idx);
  const hash = stored.slice(idx + 1);
  if (!salt || !hash) return false;
  const check = scryptSync(password, salt, 64).toString('hex');
  return timingSafeEqual(Buffer.from(hash), Buffer.from(check));
}

export function createSession(db: Database.Database, userId: string): string {
  const token = randomUUID();
  const now = Date.now();
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?,?,?,?)')
    .run(token, userId, now, now + 7 * 24 * 60 * 60 * 1000);
  return token;
}

export function getSession(db: Database.Database, token: string): any | null {
  const row = db.prepare('SELECT s.*, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?')
    .get(token, Date.now()) as any;
  return row || null;
}

export function createAuthMiddleware(db: Database.Database): RequestHandler {
  return (req, res, next) => {
    const publicPaths = ['/health', '/version', '/metrics', '/daemon/status', '/auth/login', '/auth/register'];
    if (publicPaths.includes(req.path)) return next();

    const userId = req.headers['x-user-id'] as string | undefined;
    const signature = req.headers['x-daemon-signature'] as string | undefined;
    const webhookSecret = process.env.WEBHOOK_SECRET || '';
    if (userId && signature && webhookSecret) {
      const expected = createHmac('sha256', webhookSecret).update(userId).digest('hex');
      if (timingSafeEqualHex(signature, expected)) {
        (req as any).user = { id: userId };
        return next();
      }
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const session = getSession(db, authHeader.slice(7));
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    (req as any).user = { id: session.user_id, email: session.email, name: session.name };
    next();
  };
}

export function shouldRequireAuth(): boolean {
  const requireAuth = process.env.NODE_ENV === 'production' || process.env.DAEMON_AUTH_ENABLED === '1' || process.env.DAEMON_AUTH_REQUIRED === '1';
  if (!requireAuth) {
    logger.warn('AUTH', 'Authentication is DISABLED. Set DAEMON_AUTH_ENABLED=1 or NODE_ENV=production to enable.');
  }
  return requireAuth;
}
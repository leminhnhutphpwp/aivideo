import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import type { Request, Response } from 'express';
import { createAuthMiddleware } from './auth.js';

// The HMAC (x-daemon-signature) branch never touches the DB, so a stub is enough.
const stubDb: any = { prepare: () => ({ get: () => null, run: () => undefined }) };

function runMiddleware(headers: Record<string, string>, path = '/media/enhance-prompt') {
  const req = { path, headers } as unknown as Request;
  let statusCode = 0;
  let nextCalled = false;
  const res = {
    status(code: number) { statusCode = code; return this; },
    json() { return this; },
  } as unknown as Response;
  const mw = createAuthMiddleware(stubDb);
  mw(req, res, () => { nextCalled = true; });
  return { statusCode, nextCalled, user: (req as any).user };
}

describe('createAuthMiddleware — HMAC constant-time verification', () => {
  const secret = 'test-webhook-secret';
  const userId = 'user-123';
  const validSig = createHmac('sha256', secret).update(userId).digest('hex');

  beforeEach(() => { process.env.WEBHOOK_SECRET = secret; });
  afterEach(() => { delete process.env.WEBHOOK_SECRET; });

  it('accepts a valid HMAC signature', () => {
    const r = runMiddleware({ 'x-user-id': userId, 'x-daemon-signature': validSig });
    expect(r.nextCalled).toBe(true);
    expect(r.user?.id).toBe(userId);
  });

  it('rejects a wrong signature (fails closed, no bearer token)', () => {
    const r = runMiddleware({ 'x-user-id': userId, 'x-daemon-signature': 'deadbeef'.repeat(8) });
    expect(r.nextCalled).toBe(false);
    expect(r.statusCode).toBe(401);
  });

  it('rejects a non-hex / wrong-length signature without throwing', () => {
    const r = runMiddleware({ 'x-user-id': userId, 'x-daemon-signature': 'not-a-valid-hex-sig' });
    expect(r.nextCalled).toBe(false);
    expect(r.statusCode).toBe(401);
  });

  it('allows public paths without credentials', () => {
    const r = runMiddleware({}, '/health');
    expect(r.nextCalled).toBe(true);
  });
});

describe('createAuthMiddleware — timestamped (replay-resistant) signature', () => {
  const secret = 'test-webhook-secret';
  const userId = 'laravel-app';
  const nowSec = () => Math.floor(Date.now() / 1000);
  const sigFor = (ts: number) =>
    createHmac('sha256', secret).update(`${userId}.${ts}`).digest('hex');

  beforeEach(() => { process.env.WEBHOOK_SECRET = secret; });
  afterEach(() => {
    delete process.env.WEBHOOK_SECRET;
    delete process.env.DAEMON_STRICT_SIGNATURE;
    delete process.env.DAEMON_SIGNATURE_WINDOW_SECONDS;
  });

  it('accepts a fresh timestamped signature', () => {
    const ts = nowSec();
    const r = runMiddleware({
      'x-user-id': userId,
      'x-timestamp': String(ts),
      'x-daemon-signature': sigFor(ts),
    });
    expect(r.nextCalled).toBe(true);
    expect(r.user?.id).toBe(userId);
  });

  it('rejects an expired timestamp (outside the replay window)', () => {
    const ts = nowSec() - 100000; // far outside default 300s window
    const r = runMiddleware({
      'x-user-id': userId,
      'x-timestamp': String(ts),
      'x-daemon-signature': sigFor(ts),
    });
    expect(r.nextCalled).toBe(false);
    expect(r.statusCode).toBe(401);
  });

  it('rejects a tampered timestamp (signature no longer matches)', () => {
    const ts = nowSec();
    const r = runMiddleware({
      'x-user-id': userId,
      'x-timestamp': String(ts + 5), // signed ts, sent ts+5 → mismatch
      'x-daemon-signature': sigFor(ts),
    });
    expect(r.nextCalled).toBe(false);
    expect(r.statusCode).toBe(401);
  });

  it('rejects a non-numeric timestamp without falling back to legacy', () => {
    const legacySig = createHmac('sha256', secret).update(userId).digest('hex');
    const r = runMiddleware({
      'x-user-id': userId,
      'x-timestamp': 'not-a-number',
      'x-daemon-signature': legacySig,
    });
    expect(r.nextCalled).toBe(false);
    expect(r.statusCode).toBe(401);
  });

  it('still accepts the legacy constant signature by default (rollout compat)', () => {
    const legacySig = createHmac('sha256', secret).update(userId).digest('hex');
    const r = runMiddleware({ 'x-user-id': userId, 'x-daemon-signature': legacySig });
    expect(r.nextCalled).toBe(true);
  });

  it('rejects the legacy signature when DAEMON_STRICT_SIGNATURE=1', () => {
    process.env.DAEMON_STRICT_SIGNATURE = '1';
    const legacySig = createHmac('sha256', secret).update(userId).digest('hex');
    const r = runMiddleware({ 'x-user-id': userId, 'x-daemon-signature': legacySig });
    expect(r.nextCalled).toBe(false);
    expect(r.statusCode).toBe(401);
  });
});

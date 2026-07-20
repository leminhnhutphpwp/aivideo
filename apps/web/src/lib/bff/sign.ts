import crypto from 'crypto';
import type { NextRequest } from 'next/server';

/**
 * BFF signing + forwarding helper (server-only, Node runtime).
 *
 * The browser calls same-origin Next.js route handlers under `/api/bff/*`; those
 * handlers use this module to (1) enforce a same-site Origin check (Layer 1) and
 * (2) HMAC-sign the request (Layer 4) before forwarding to Laravel.
 *
 * Fail-open: when `APP_BFF_SECRET` is empty/undefined (local dev) we skip the
 * signature headers — Laravel skips verification too, so nothing breaks locally.
 *
 * ⚠️ `APP_BFF_SECRET` is server-only (NO `NEXT_PUBLIC_` prefix). Route handlers
 * read it via `process.env` at request time; it is never sent to the browser.
 */

/** Secret shared with Laravel. Empty = HMAC disabled (dev fail-open). */
const BFF_SECRET = process.env.APP_BFF_SECRET || '';

/** Max clock skew Laravel accepts (must stay ≤ its 300s window). */
const MAX_SKEW_SECONDS = 300;

/**
 * Laravel base URL as reached from the Next.js server (NOT the browser).
 * In Docker the web container reaches Laravel via the `app` service, so set
 * `LARAVEL_INTERNAL_URL=http://app:8000`. Falls back to the public URL / localhost
 * for host-run dev.
 */
function laravelBaseUrl(): string {
  return (
    process.env.LARAVEL_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_LARAVEL_URL ||
    'http://localhost:8000'
  );
}

/** Strip a single trailing slash for stable comparison. */
function normalizeOrigin(value: string): string {
  return value.replace(/\/+$/, '');
}

/** Same-site origins allowed to call the BFF (Layer 1). */
function allowedOrigins(): string[] {
  const set = new Set<string>();
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) set.add(normalizeOrigin(site));
  // Always permit local dev origins.
  set.add('http://localhost:3000');
  set.add('http://127.0.0.1:3000');
  return [...set];
}

/**
 * Layer 1 — Origin check. Same-origin browser fetches send our own origin.
 * A missing Origin (server-to-server, some same-origin GETs) is allowed;
 * a present-but-foreign Origin is rejected.
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true;
  return allowedOrigins().includes(normalizeOrigin(origin));
}

/** sha256-hex of the raw request body (`""` for GET / no body). */
function hashBody(rawBody: string): string {
  return crypto.createHash('sha256').update(rawBody ?? '').digest('hex');
}

/**
 * Compute the BFF HMAC signature headers per the Laravel contract.
 * Canonical string: `${ts}.${METHOD}.${path}.${bodyHash}` (METHOD uppercase,
 * `path` = `/api/...` with a single leading slash, bodyHash = sha256-hex of raw body).
 * Returns `null` when the secret is unset (dev fail-open — skip the headers).
 */
export function signRequest(
  method: string,
  path: string,
  rawBody: string,
): { timestamp: string; signature: string } | null {
  if (!BFF_SECRET) return null;
  const ts = Math.floor(Date.now() / 1000);
  const bodyHash = hashBody(rawBody);
  const canonical = `${ts}.${method.toUpperCase()}.${path}.${bodyHash}`;
  const signature = crypto.createHmac('sha256', BFF_SECRET).update(canonical).digest('hex');
  return { timestamp: String(ts), signature };
}

/** Read the Turnstile token from the incoming header or a JSON body field. */
function readTurnstileToken(req: NextRequest, rawBody: string): string | null {
  const header = req.headers.get('cf-turnstile-response');
  if (header) return header;
  if (rawBody) {
    try {
      const parsed = JSON.parse(rawBody) as { turnstile_token?: unknown };
      if (typeof parsed.turnstile_token === 'string' && parsed.turnstile_token) {
        return parsed.turnstile_token;
      }
    } catch {
      // not JSON — ignore
    }
  }
  return null;
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ success: false, message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export interface ProxyOptions {
  /** HTTP method to forward. */
  method: 'GET' | 'POST';
  /** Full Laravel path including leading `/api/...` (e.g. `/api/coupons/redeem`). */
  laravelPath: string;
  /** When true a missing Authorization header returns 401 (protected endpoints). */
  requireAuth?: boolean;
}

/**
 * Enforce the Origin check, sign, and forward an incoming BFF request to Laravel.
 * Returns Laravel's status + JSON body straight back so client `ApiError` handling
 * keeps working on non-2xx.
 */
export async function proxyToLaravel(req: NextRequest, opts: ProxyOptions): Promise<Response> {
  const { method, laravelPath, requireAuth = true } = opts;

  // Layer 1 — Origin check.
  if (!isOriginAllowed(req.headers.get('origin'))) {
    return jsonError('Origin không được phép', 403);
  }

  // Forward the caller's JWT unchanged.
  const authorization = req.headers.get('authorization');
  if (requireAuth && !authorization) {
    return jsonError('Chưa đăng nhập', 401);
  }

  // Read the raw body once and forward the identical string we hash.
  const rawBody = method === 'GET' ? '' : await req.text();
  const turnstileToken = readTurnstileToken(req, rawBody);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (authorization) headers['Authorization'] = authorization;
  if (turnstileToken) headers['CF-Turnstile-Response'] = turnstileToken;

  // Layer 4 — HMAC (skipped when the secret is unset: dev fail-open).
  const signed = signRequest(method, laravelPath, rawBody);
  if (signed) {
    headers['X-BFF-Timestamp'] = signed.timestamp;
    headers['X-BFF-Signature'] = signed.signature;
  }

  const url = `${laravelBaseUrl()}${laravelPath}`;
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method,
      headers,
      body: method === 'GET' ? undefined : rawBody,
      cache: 'no-store',
    });
  } catch {
    return jsonError('Không kết nối được máy chủ', 502);
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { 'content-type': 'application/json' },
  });
}

// Re-exported for the sign-helper sanity snippet / tests.
export const _internal = { hashBody, MAX_SKEW_SECONDS };

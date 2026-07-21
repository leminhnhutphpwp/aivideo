import type Database from 'better-sqlite3';
import { createHmac } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { insertMediaTask, updateMediaTask } from '../media/tasks.js';
import { logger } from '../utils/index.js';

export type LiveMediaTask = {
  id: string;
  projectId: string;
  status: string;
  surface?: string;
  model?: string;
  metadata?: Record<string, string>;
  progress: string[];
  file: unknown;
  error: unknown;
  startedAt: number;
  endedAt: number | null;
  createdAt: number;
  updatedAt: number;
  waiters: Set<() => void>;
};

const liveTasks = new Map<string, LiveMediaTask>();

const TERMINAL_STATUSES = new Set(['done', 'failed', 'interrupted']);
// Grace period before a terminal task is dropped from the in-memory map. Long enough
// for in-flight long-poll/GET consumers to still read it; the terminal state is already
// persisted to SQLite and served from there afterwards.
const LIVE_TASK_EVICT_MS = 60000;

// Optional db-bound hook, wired at boot, invoked when a TERMINAL webhook is delivered so
// the "webhook_delivered" flag can be persisted (prevents boot re-fire of old callbacks).
let onWebhookDelivered: ((taskId: string) => void) | null = null;
export function setWebhookDeliveredHandler(fn: (taskId: string) => void): void {
  onWebhookDelivered = fn;
}

export function isInternalHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '0.0.0.0' || normalized === '[::1]') return true;
  if (normalized.endsWith('.local') || normalized.endsWith('.internal')) return true;
  if (/^10\./.test(normalized)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(normalized)) return true;
  if (/^192\.168\./.test(normalized)) return true;
  return false;
}

function sendHttpRequest(url: string, body: string, headers: Record<string, string>, timeoutMs: number): Promise<{ ok: boolean; retryable: boolean; message: string }> {
  return new Promise((resolve) => {
    const requester = url.startsWith('https:') ? httpsRequest : httpRequest;
    const req = requester(url, { method: 'POST', headers, timeout: timeoutMs });
    req.on('response', (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => {
        const status = res.statusCode ?? 0;
        // 2xx/3xx = delivered. 4xx = rejected (bad HMAC / validation) — a
        // permanent failure, retrying won't help. 5xx / network = retryable.
        const ok = status >= 200 && status < 400;
        const retryable = status >= 500 || status === 0;
        resolve({ ok, retryable, message: `HTTP ${res.statusCode}` });
      });
    });
    req.on('error', (e: Error) => {
      resolve({ ok: false, retryable: true, message: e.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, retryable: true, message: 'timeout' });
    });
    req.write(body);
    req.end();
  });
}

function fireWebhookWithRetry(task: LiveMediaTask, callbackUrl: string, body: string, headers: Record<string, string>, retries: number): void {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [5000, 15000, 45000]; // 5s, 15s, 45s

  sendHttpRequest(callbackUrl, body, headers, 15000).then((result) => {
    if (result.ok) {
      logger.info('WEBHOOK', `Webhook sent for task ${task.id}`, { url: callbackUrl });
      // Persist delivery for terminal webhooks only, so boot reconciliation won't replay
      // them. Progress ('running') webhooks are transient and must not set the flag.
      if (onWebhookDelivered && TERMINAL_STATUSES.has(task.status)) {
        try { onWebhookDelivered(task.id); } catch {/* best-effort */}
      }
      return;
    }
    // 4xx (rejected HMAC / validation) — permanent failure, do NOT retry.
    if (!result.retryable) {
      logger.error('WEBHOOK', `Webhook rejected for task ${task.id} (non-retryable)`, { url: callbackUrl, error: result.message });
      return;
    }
    const attemptCount = MAX_RETRIES - retries + 1;
    if (retries > 0) {
      const delay = RETRY_DELAYS[MAX_RETRIES - retries] || 5000;
      logger.warn('WEBHOOK', `Webhook failed (attempt ${attemptCount}), retrying in ${delay}ms`, { taskId: task.id, url: callbackUrl, error: result.message });
      setTimeout(() => fireWebhookWithRetry(task, callbackUrl, body, headers, retries - 1), delay);
    } else {
      logger.error('WEBHOOK', `Webhook exhausted all ${MAX_RETRIES} retries for task ${task.id}`, { url: callbackUrl, lastError: result.message });
    }
  });
}

export function fireWebhook(task: LiveMediaTask): void {
  // Terminal state — drop the progress-throttle entry so the map doesn't leak.
  lastProgressWebhook.delete(task.id);
  const callbackUrl = task.metadata?.callbackUrl;
  if (!callbackUrl) return;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(callbackUrl);
  } catch {
    return;
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') return;
  const payload = {
    taskId: task.id,
    status: task.status === 'done' ? 'completed' : task.status,
    progress: task.progress,
    ...(task.status === 'done' && task.file ? {
      output: {
        files: task.file,
        projectId: task.projectId,
      },
    } : {}),
    ...(task.status === 'failed' || task.status === 'interrupted' ? {
      error_message: (task.error as any)?.message || 'Unknown error',
      error_code: (task.error as any)?.code || 'UNKNOWN',
    } : {}),
    metadata: task.metadata,
  };
  const body = JSON.stringify(payload);
  const webhookSecret = process.env.WEBHOOK_SECRET || '';
  const signature = webhookSecret
    ? createHmac('sha256', webhookSecret).update(body).digest('hex')
    : '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body).toString(),
  };
  if (signature) headers['X-Signature'] = signature;

  fireWebhookWithRetry(task, callbackUrl, body, headers, 3);
}

const lastProgressWebhook = new Map<string, number>();

export function fireProgressWebhook(task: LiveMediaTask): void {
  const callbackUrl = task.metadata?.callbackUrl;
  if (!callbackUrl) return;

  const now = Date.now();
  const last = lastProgressWebhook.get(task.id) || 0;
  if (now - last < 3000) return;
  lastProgressWebhook.set(task.id, now);

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(callbackUrl);
  } catch {
    return;
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') return;

  const payload = {
    taskId: task.id,
    status: 'running',
    progress: task.progress,
    metadata: task.metadata,
  };
  const body = JSON.stringify(payload);
  const webhookSecret = process.env.WEBHOOK_SECRET || '';
  const signature = webhookSecret
    ? createHmac('sha256', webhookSecret).update(body).digest('hex')
    : '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body).toString(),
  };
  if (signature) headers['X-Signature'] = signature;

  fireWebhookWithRetry(task, callbackUrl, body, headers, 1);
}

export function createMediaTask(taskId: string, projectId: string, meta: { surface?: string; model?: string; metadata?: Record<string, string> }): LiveMediaTask {
  const now = Date.now();
  const task: LiveMediaTask = {
    id: taskId,
    projectId,
    status: 'queued',
    ...(meta.surface !== undefined ? { surface: meta.surface } : {}),
    ...(meta.model !== undefined ? { model: meta.model } : {}),
    ...(meta.metadata !== undefined ? { metadata: meta.metadata } : {}),
    progress: [],
    file: null,
    error: null,
    startedAt: now,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
    waiters: new Set(),
  };
  liveTasks.set(taskId, task);
  return task;
}

export function createPersistMediaTask(db: Database.Database) {
  const persistedTaskIds = new Set<string>();
  return function persistMediaTask(task: LiveMediaTask): void {
    const validStatuses = new Set(['queued', 'running', 'done', 'failed', 'interrupted']);
    if (!validStatuses.has(task.status)) return;

    try {
      if (persistedTaskIds.has(task.id)) {
        updateMediaTask(db, task.id, {
          status: task.status as any,
          surface: task.surface ?? null,
          model: task.model ?? null,
          progress: task.progress,
          file: task.file ?? null,
          error: task.error as any ?? null,
          metadata: task.metadata ?? null,
          endedAt: task.endedAt,
          updatedAt: Date.now(),
        });
      } else {
        insertMediaTask(db, {
          id: task.id,
          projectId: task.projectId,
          status: task.status as any,
          surface: task.surface,
          model: task.model,
          progress: task.progress,
          file: task.file ?? null,
          error: task.error as any ?? null,
          metadata: task.metadata,
          startedAt: task.startedAt,
          endedAt: task.endedAt,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        });
        persistedTaskIds.add(task.id);
      }
    } catch (err: any) {
      logger.error('PERSIST', `Failed to persist task ${task.id}`, { error: err.message });
    }
  };
}

export function appendTaskProgress(task: LiveMediaTask, line: string): void {
  task.progress.push(line);
  for (const w of task.waiters) w();
}

export function notifyTaskWaiters(task: LiveMediaTask): void {
  for (const w of task.waiters) w();
  task.waiters.clear();
  // Evict terminal tasks from the in-memory map to prevent unbounded growth. Deferred so
  // late long-poll/GET consumers can still read the entry; state is already persisted.
  if (TERMINAL_STATUSES.has(task.status)) {
    const timer = setTimeout(() => {
      const current = liveTasks.get(task.id);
      if (current && TERMINAL_STATUSES.has(current.status)) liveTasks.delete(task.id);
    }, LIVE_TASK_EVICT_MS);
    timer.unref?.();
  }
}

export function getLiveMediaTask(taskId: string): LiveMediaTask | undefined {
  return liveTasks.get(taskId);
}

export function mediaTaskSnapshot(task: LiveMediaTask, since: number) {
  return {
    taskId: task.id,
    status: task.status,
    startedAt: task.startedAt,
    endedAt: task.endedAt,
    progress: task.progress.slice(since),
    progressCount: task.progress.length,
    ...(task.status === 'done' ? { file: task.file } : {}),
    ...(task.status === 'failed' || task.status === 'interrupted' ? { error: task.error } : {}),
  };
}

export function getLiveTasks(): Map<string, LiveMediaTask> {
  return liveTasks;
}

export function fireWebhookFromRow(row: { id: string; projectId: string; status: string; surface?: string; model?: string; metadata?: Record<string, string>; progress: string[]; file: unknown; error: unknown; startedAt: number; endedAt: number | null; createdAt: number; updatedAt: number }): void {
  const task: LiveMediaTask = {
    id: row.id,
    projectId: row.projectId,
    status: row.status,
    surface: row.surface,
    model: row.model,
    metadata: row.metadata,
    progress: row.progress,
    file: row.file,
    error: row.error,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    waiters: new Set(),
  };
  fireWebhook(task);
}

export function getTaskCounts(): { running: number; done: number; failed: number; queued: number } {
  const counts = { running: 0, done: 0, failed: 0, queued: 0 };
  for (const t of liveTasks.values()) {
    if (counts[t.status as keyof typeof counts] !== undefined) counts[t.status as keyof typeof counts]++;
  }
  return counts;
}
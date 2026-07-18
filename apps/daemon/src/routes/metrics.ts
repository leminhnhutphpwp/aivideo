import { Router } from 'express';
import path from 'node:path';
import type Database from 'better-sqlite3';
import type { LiveMediaTask } from '../services/task-manager.js';
import { existsSync, statSync, readdirSync } from 'node:fs';

const STARTED_AT = Date.now();

const METRICS_AUTH_TOKEN = process.env.DAEMON_METRICS_TOKEN || '';

let cachedDiskUsage = { value: 0, at: 0 };
const DISK_CACHE_TTL = 300_000; // 5 min

function metricsAuthMiddleware(req: any, res: any, next: () => void): void {
  if (!METRICS_AUTH_TOKEN) return next();
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ') || auth.slice(7) !== METRICS_AUTH_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

export function createMetricsRouter(
  db: Database.Database,
  PROJECTS_DIR: string,
  dbPath: string,
  getLiveTasks: () => Map<string, LiveMediaTask>,
  getLastVacuumAt?: () => number,
): Router {
  const router = Router();

  router.get('/metrics', metricsAuthMiddleware, (_req, res) => {
    const now = Date.now();
    const uptimeSeconds = (now - STARTED_AT) / 1000;
    const projectCount = ((db.prepare('SELECT COUNT(*) as count FROM projects').get() as any)?.count ?? 0);
    const userCount = ((db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count ?? 0);

    const liveTasks = getLiveTasks();
    let running = 0, done = 0, failed = 0, queued = 0, interrupted = 0;

    for (const t of liveTasks.values()) {
      if (t.status === 'running') running++;
      else if (t.status === 'done') done++;
      else if (t.status === 'failed') failed++;
      else if (t.status === 'queued') queued++;
      else if (t.status === 'interrupted') interrupted++;
    }

    // Hung task detection: tasks in running/queued state for >30 min
    const STUCK_THRESHOLD_MS = 30 * 60 * 1000;
    let stuckCount = 0;
    for (const t of liveTasks.values()) {
      if ((t.status === 'running' || t.status === 'queued') && (now - t.startedAt) > STUCK_THRESHOLD_MS) {
        stuckCount++;
      }
    }
    // Also check persisted tasks from DB
    const stuckDbCount = ((db.prepare(
      `SELECT COUNT(*) as count FROM media_tasks WHERE status IN ('queued','running') AND started_at < ?`
    ).get(now - STUCK_THRESHOLD_MS) as any)?.count ?? 0);

    const lines: string[] = [];
    lines.push('# HELP daemon_uptime_seconds Daemon process uptime in seconds');
    lines.push('# TYPE daemon_uptime_seconds gauge');
    lines.push(`daemon_uptime_seconds ${uptimeSeconds}`);

    lines.push('# HELP daemon_tasks_total Current task counts by status');
    lines.push('# TYPE daemon_tasks_total gauge');
    lines.push(`daemon_tasks_total{status="running"} ${running}`);
    lines.push(`daemon_tasks_total{status="done"} ${done}`);
    lines.push(`daemon_tasks_total{status="failed"} ${failed}`);
    lines.push(`daemon_tasks_total{status="queued"} ${queued}`);
    lines.push(`daemon_tasks_total{status="interrupted"} ${interrupted}`);

    lines.push('# HELP daemon_tasks_stuck Tasks stuck in running/queued for >30min');
    lines.push('# TYPE daemon_tasks_stuck gauge');
    lines.push(`daemon_tasks_stuck{source="live"} ${stuckCount}`);
    lines.push(`daemon_tasks_stuck{source="persisted"} ${stuckDbCount}`);

    lines.push('# HELP daemon_projects_total Total project count');
    lines.push('# TYPE daemon_projects_total gauge');
    lines.push(`daemon_projects_total ${projectCount}`);

    lines.push('# HELP daemon_users_total Total user count');
    lines.push('# TYPE daemon_users_total gauge');
    lines.push(`daemon_users_total ${userCount}`);

    if (dbPath && existsSync(dbPath)) {
      const dbSize = statSync(dbPath).size;
      lines.push('# HELP daemon_db_size_bytes SQLite database file size');
      lines.push('# TYPE daemon_db_size_bytes gauge');
      lines.push(`daemon_db_size_bytes ${dbSize}`);
    }

    if (PROJECTS_DIR && existsSync(PROJECTS_DIR)) {
      if (now - cachedDiskUsage.at > DISK_CACHE_TTL || cachedDiskUsage.at === 0) {
        cachedDiskUsage = { value: dirSize(PROJECTS_DIR), at: now };
      }
      lines.push('# HELP daemon_projects_disk_bytes Total disk usage by project files');
      lines.push('# TYPE daemon_projects_disk_bytes gauge');
      lines.push(`daemon_projects_disk_bytes ${cachedDiskUsage.value}`);
    }

    for (const t of liveTasks.values()) {
      if (t.endedAt && t.startedAt) {
        const durationMs = t.endedAt - t.startedAt;
        const durationSec = durationMs / 1000;
        const model = (t.model ?? 'unknown').replace(/"/g, '\\"');
        lines.push(`daemon_generation_duration_seconds{model="${model}",status="${t.status}"} ${durationSec}`);
      }
    }

    lines.push('# HELP daemon_generation_duration_seconds_count Task count for duration tracking');
    lines.push('# TYPE daemon_generation_duration_seconds_count gauge');
    lines.push(`daemon_generation_duration_seconds_count ${liveTasks.size}`);

    // Average generation duration by surface (from persisted DB, last hour)
    const RECENT_WINDOW = 60 * 60 * 1000;
    const surfaceAvgRows = (db.prepare(
      `SELECT surface, AVG(ended_at - started_at) as avg_ms, COUNT(*) as cnt FROM media_tasks WHERE status IN ('done','failed') AND ended_at > ? AND surface IS NOT NULL GROUP BY surface`
    ).all(now - RECENT_WINDOW) as any[]) || [];
    if (surfaceAvgRows.length > 0) {
      lines.push('# HELP daemon_recent_avg_duration_ms Average task duration by surface (last hour)');
      lines.push('# TYPE daemon_recent_avg_duration_ms gauge');
      for (const r of surfaceAvgRows) {
        lines.push(`daemon_recent_avg_duration_ms{surface="${r.surface}"} ${Math.round(r.avg_ms || 0)}`);
      }
    }

    // Total generation counts by surface (from persisted DB, last hour)
    const surfaceCountRows = (db.prepare(
      `SELECT surface, COUNT(*) as cnt FROM media_tasks WHERE ended_at > ? AND surface IS NOT NULL GROUP BY surface`
    ).all(now - RECENT_WINDOW) as any[]) || [];
    if (surfaceCountRows.length > 0) {
      lines.push('# HELP daemon_recent_generations_total Generation count by surface (last hour)');
      lines.push('# TYPE daemon_recent_generations_total gauge');
      for (const r of surfaceCountRows) {
        lines.push(`daemon_recent_generations_total{surface="${r.surface}"} ${r.cnt}`);
      }
    }

    lines.push('# HELP daemon_memory_bytes Process memory usage');
    lines.push('# TYPE daemon_memory_bytes gauge');
    const mem = process.memoryUsage();
    lines.push(`daemon_memory_bytes{type="rss"} ${mem.rss}`);
    lines.push(`daemon_memory_bytes{type="heapTotal"} ${mem.heapTotal}`);
    lines.push(`daemon_memory_bytes{type="heapUsed"} ${mem.heapUsed}`);

    lines.push('# HELP daemon_db_last_vacuum_timestamp Unix timestamp of last VACUUM');
    lines.push('# TYPE daemon_db_last_vacuum_timestamp gauge');
    lines.push(`daemon_db_last_vacuum_timestamp ${getLastVacuumAt?.() ?? 0}`);

    lines.push('# HELP daemon_up Daemon process is up');
    lines.push('# TYPE daemon_up gauge');
    lines.push('daemon_up 1');

    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(lines.join('\n') + '\n');
  });

  return router;
}

function dirSize(dir: string): number {
  let total = 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isFile()) {
        try { total += statSync(full).size; } catch {}
      } else if (entry.isDirectory()) {
        total += dirSize(full);
      }
    }
  } catch {}
  return total;
}

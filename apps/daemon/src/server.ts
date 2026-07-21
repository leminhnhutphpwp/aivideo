import express from 'express';
import type { Server } from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { migrateMediaTasks, reconcileMediaTasksOnBoot, markMediaTaskWebhookDelivered } from './media/tasks.js';
import { logger } from './utils/index.js';
import { createAuthMiddleware, hashPassword, verifyPassword, createSession, getSession, shouldRequireAuth } from './services/auth.js';
import { createPersistMediaTask, getTaskCounts, getLiveTasks, fireWebhookFromRow, setWebhookDeliveredHandler } from './services/task-manager.js';
import { createProjectRoutes, createTemplateRoutes, SKIP_FILES } from './routes/projects.js';
import { createMediaRoutes } from './routes/media.js';
import { createMetricsRouter } from './routes/metrics.js';

let daemonShuttingDown = false;
let desktopAuthGateActive = false;
let resolvedPort = 0;
let startedAt = 0;
let lastVacuumAt = 0;

const activeMediaTasks = new Set<Promise<void>>();

export function trackMediaTask(p: Promise<void>): void {
  activeMediaTasks.add(p);
  p.finally(() => { activeMediaTasks.delete(p); });
}

export function isShuttingDown(): boolean {
  return daemonShuttingDown;
}

export function setShuttingDown(): void {
  daemonShuttingDown = true;
}

function activeTaskCount(): number {
  return activeMediaTasks.size;
}

export function isDesktopAuthGateActive(): boolean {
  return desktopAuthGateActive;
}

export function setDesktopAuthSecret(_secret: Buffer): void {
  desktopAuthGateActive = true;
}

function getDirSize(dir: string): number {
  let total = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isFile()) {
        try { total += fs.statSync(full).size; } catch {}
      } else if (entry.isDirectory()) {
        total += getDirSize(full);
      }
    }
  } catch {}
  return total;
}

export async function startServer({
  port = 7456,
  host = process.env.BIND_HOST || '127.0.0.1',
  returnServer = false,
  desktopPdfExporter = null,
}: {
  port?: number;
  host?: string;
  returnServer?: boolean;
  desktopPdfExporter?: any;
} = {}) {
  resolvedPort = port;
  startedAt = Date.now();
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // CORS
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin == null || origin === '') return next();

    const isLocal =
      origin.startsWith('http://127.0.0.1') ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://[::1]');
    if (!isLocal) {
      return res.status(403).json({ error: 'Cross-origin requests not allowed' });
    }

    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Signature');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  });

  const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();
  const RUNTIME_DATA_DIR = process.env.DATA_DIR || path.join(PROJECT_ROOT, '.od');
  const PROJECTS_DIR = path.join(RUNTIME_DATA_DIR, 'projects');

  // Prevent recursive nesting: PROJECT_ROOT must not be inside a project directory
  const normalizedRoot = path.resolve(PROJECT_ROOT);
  const normalizedProjects = path.resolve(PROJECTS_DIR);
  if (normalizedRoot.startsWith(normalizedProjects + path.sep) || normalizedRoot === normalizedProjects) {
    throw new Error(
      `PROJECT_ROOT (${PROJECT_ROOT}) resolves inside PROJECTS_DIR (${PROJECTS_DIR}). ` +
      `This would cause recursive directory nesting. Set PROJECT_ROOT or DATA_DIR to a safe parent directory.`
    );
  }

  const dbPath = path.join(RUNTIME_DATA_DIR, 'app.sqlite');

  fs.mkdirSync(RUNTIME_DATA_DIR, { recursive: true });
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      surface TEXT,
      skill_id TEXT,
      design_system_id TEXT,
      pending_prompt TEXT,
      metadata_json TEXT,
      custom_instructions TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source_project_id TEXT,
      description TEXT,
      files_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  try { db.exec('ALTER TABLE projects ADD COLUMN surface TEXT'); } catch {/* migration */}
  try { db.exec('ALTER TABLE projects ADD COLUMN user_id TEXT'); } catch {/* migration */}

  migrateMediaTasks(db);

  // Persist the "webhook delivered" flag when a terminal webhook is acknowledged, so boot
  // reconciliation below only re-fires callbacks that were never delivered.
  setWebhookDeliveredHandler((taskId) => markMediaTaskWebhookDelivered(db, taskId));

  const bootResult = reconcileMediaTasksOnBoot(db, { terminalTtlMs: 86400000 });
  if (bootResult.interrupted > 0 || bootResult.deleted > 0) {
    logger.info('BOOT', 'Reconciled media tasks', { interrupted: bootResult.interrupted, deleted: bootResult.deleted });
  }
  // Fire webhooks for interrupted tasks (queued/running at time of crash)
  for (const task of bootResult.interruptedTasks) {
    fireWebhookFromRow(task);
  }
  if (bootResult.interruptedTasks.length > 0) {
    logger.info('BOOT', `Fired webhooks for ${bootResult.interruptedTasks.length} interrupted tasks`);
  }
  // Fire webhooks for terminal tasks (done/failed) whose callback may not have been delivered
  for (const task of bootResult.pendingTasks) {
    fireWebhookFromRow(task);
  }
  if (bootResult.pendingTasks.length > 0) {
    logger.info('BOOT', `Fired webhooks for ${bootResult.pendingTasks.length} pending terminal tasks`);
  }

  const persistMediaTask = createPersistMediaTask(db);

  // Cleanup expired sessions
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  setInterval(() => {
    const result = db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
    if (result.changes > 0) {
      logger.info('AUTH', `Cleaned up ${result.changes} expired sessions`);
    }
  }, 3600000); // every hour

  // Auto-VACUUM: run every hour if DB > 100MB and last vacuum > 24h ago
  const runVacuum = () => {
    try {
      const dbSize = fs.statSync(dbPath).size;
      if (dbSize > 100 * 1024 * 1024 && Date.now() - lastVacuumAt > 86400000) {
        logger.info('DB', 'Running VACUUM', { sizeBytes: dbSize, lastVacuumAt });
        db.exec('VACUUM');
        lastVacuumAt = Date.now();
        const newSize = fs.statSync(dbPath).size;
        logger.info('DB', `VACUUM completed`, { before: dbSize, after: newSize, saved: dbSize - newSize });
      }
    } catch (err: any) {
      logger.error('DB', `VACUUM failed: ${err.message}`);
    }
  };
  setInterval(runVacuum, 3600000);
  // Run once on boot
  setTimeout(runVacuum, 60000); // wait 1 min for daemon to settle

  // Scheduled DB cleanup: stale tasks & orphan projects (every 6h)
  const CLEANUP_AGE_MS = 30 * 86400000; // 30 days
  const runCleanup = () => {
    try {
      // 1. Delete terminal media tasks older than 30 days
      const cutoff = Date.now() - CLEANUP_AGE_MS;
      const staleTasks = db.prepare(
        `DELETE FROM media_tasks WHERE status IN ('done','failed') AND updated_at < ?`
      ).run(cutoff);
      if (staleTasks.changes > 0) {
        logger.info('CLEANUP', `Removed ${staleTasks.changes} stale media tasks (>30d)`);
      }

      // 2. Delete old projects (DB + disk) that have no active tasks
      const oldProjects = db.prepare(
        `SELECT p.id FROM projects p
         WHERE p.updated_at < ?
         AND NOT EXISTS (
           SELECT 1 FROM media_tasks mt
           WHERE mt.project_id = p.id AND mt.status IN ('queued','running','interrupted')
         )`
      ).all(cutoff) as { id: string }[];

      let deletedProjects = 0;
      for (const { id } of oldProjects) {
        const projectDir = path.join(PROJECTS_DIR, id);
        try {
          if (fs.existsSync(projectDir)) {
            fs.rmSync(projectDir, { recursive: true, force: true });
          }
        } catch (e: any) {
          logger.warn('CLEANUP', `Failed to remove project dir ${id}: ${e.message}`);
        }
        db.prepare('DELETE FROM projects WHERE id = ?').run(id);
        deletedProjects++;
      }
      if (deletedProjects > 0) {
        logger.info('CLEANUP', `Removed ${deletedProjects} old projects (>30d, no active tasks)`);
      }

      // 3. Delete project records whose directory no longer exists on disk
      const allProjectIds = db.prepare('SELECT id FROM projects').all() as { id: string }[];
      let orphanCount = 0;
      for (const { id } of allProjectIds) {
        if (!fs.existsSync(path.join(PROJECTS_DIR, id))) {
          db.prepare('DELETE FROM projects WHERE id = ?').run(id);
          orphanCount++;
        }
      }
      if (orphanCount > 0) {
        logger.info('CLEANUP', `Removed ${orphanCount} orphan project records (no directory)`);
      }
    } catch (err: any) {
      logger.error('CLEANUP', `Cleanup failed: ${err.message}`);
    }
  };
  setInterval(runCleanup, 6 * 3600000); // every 6 hours
  setTimeout(runCleanup, 120000); // run 2 min after boot

  // --- Auth middleware ---
  if (shouldRequireAuth()) {
    app.use('/api', createAuthMiddleware(db));
  }

  // --- Auth routes ---
  app.post('/api/auth/register', (req, res) => {
    const { email, password, name } = req.body || {};
    if (!email || !password || !name) return res.status(400).json({ error: 'email, password, name required' });
    if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string') return res.status(400).json({ error: 'Invalid input' });
    if (password.length < 8) return res.status(400).json({ error: 'Password too short (minimum 8 characters)' });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const id = randomUUID();
    const hash = hashPassword(password as string);
    db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?,?,?,?,?)')
      .run(id, email, name, hash, Date.now());

    const token = createSession(db, id);
    res.status(201).json({ token, user: { id, email, name } });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email, password required' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user || !verifyPassword(password as string, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = createSession(db, user.id);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = (req as any).user;
    res.json({ user });
  });

  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(authHeader.slice(7));
    }
    res.json({ ok: true });
  });

  // --- Health ---
  app.get('/api/health', (_req, res) => {
    if (daemonShuttingDown) {
      return res.status(503).json({ status: 'shutting_down', activeTasks: activeTaskCount() });
    }
    res.json({ status: 'ok' });
  });
  app.get('/api/version', (_req, res) => res.json({ version: '0.7.0-video' }));

  // --- Metrics (Prometheus) - uses DAEMON_METRICS_TOKEN for auth if set ---
  app.use('/api', createMetricsRouter(db, PROJECTS_DIR, dbPath, getLiveTasks, () => lastVacuumAt));

  // --- Template routes (must be before project :id) ---
  app.use('/api/templates', createTemplateRoutes(db, PROJECTS_DIR));

  // --- Project & file routes ---
  app.use('/api/projects', createProjectRoutes(db, PROJECTS_DIR));

  // --- Media routes ---
  app.use('/api/media', createMediaRoutes(db, PROJECT_ROOT, PROJECTS_DIR, persistMediaTask));

  // --- Daemon status ---
  app.get('/api/daemon/status', (_req, res) => {
    const projectCount = (db.prepare('SELECT COUNT(*) as count FROM projects').get() as any)?.count || 0;
    const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0;
    const taskCounts = getTaskCounts();
    let dbSizeBytes = 0;
    try { dbSizeBytes = fs.statSync(dbPath).size; } catch {}
    let diskUsageBytes = 0;
    try { diskUsageBytes = getDirSize(PROJECTS_DIR); } catch {}
    res.json({
      state: daemonShuttingDown ? 'shutting_down' : 'running',
      pid: process.pid,
      url: `http://${host}:${resolvedPort}`,
      uptime: Date.now() - startedAt,
      projects: projectCount,
      users: userCount,
      tasks: taskCounts,
      db: { sizeBytes: dbSizeBytes, path: dbPath },
      disk: { usageBytes: diskUsageBytes },
      desktopAuthGateActive,
      memory: process.memoryUsage(),
      updatedAt: new Date().toISOString(),
    });
  });

  // --- Shutdown ---
  app.post('/api/daemon/shutdown', (_req, res) => {
    daemonShuttingDown = true;
    const remaining = activeTaskCount();
    res.json({ accepted: true, activeTasks: remaining, message: remaining > 0 ? `Waiting for ${remaining} active task(s) to finish…` : 'Shutting down now' });
    performGracefulShutdown(httpServer);
  });

  // --- Graceful shutdown on SIGTERM / SIGINT ---
  const SHUTDOWN_GRACE_MS = parseInt(process.env.SHUTDOWN_GRACE_MS || '300000', 10); // 5 min default
  let shutdownTimer: ReturnType<typeof setTimeout> | null = null;
  let httpServer: Server | null = null;

  function performGracefulShutdown(srv: Server | null) {
    if (shutdownTimer || !srv) return;
    logger.info('SHUTDOWN', 'Graceful shutdown initiated', { activeTasks: activeTaskCount() });

    // Close HTTP server to stop accepting new connections
    srv.close(() => {
      logger.info('SHUTDOWN', 'HTTP server closed');
    });

    // Force exit after grace period
    shutdownTimer = setTimeout(() => {
      const remaining = activeTaskCount();
      if (remaining > 0) {
        logger.warn('SHUTDOWN', `Grace period expired, forcing exit with ${remaining} active task(s)`);
      }
      process.exit(0);
    }, SHUTDOWN_GRACE_MS);

    // If no active tasks, exit immediately
    if (activeTaskCount() === 0) {
      clearTimeout(shutdownTimer);
      logger.info('SHUTDOWN', 'No active tasks, exiting');
      process.exit(0);
    }
  }

  // Watch active tasks — when all complete, exit
  const watchInterval = setInterval(() => {
    if (!daemonShuttingDown || !shutdownTimer) return;
    const remaining = activeTaskCount();
    if (remaining === 0) {
      clearTimeout(shutdownTimer);
      clearInterval(watchInterval);
      logger.info('SHUTDOWN', 'All tasks drained, exiting');
      process.exit(0);
    }
  }, 1000);
  watchInterval.unref();

  return new Promise((resolve, reject) => {
    httpServer = app.listen(port, host, () => {
      const addr = httpServer!.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : port;
      resolvedPort = actualPort;
      const url = `http://${host}:${actualPort}`;

      // Register signal handlers after server is up
      process.on('SIGTERM', () => {
        daemonShuttingDown = true;
        logger.info('SHUTDOWN', 'Received SIGTERM', { activeTasks: activeTaskCount() });
        performGracefulShutdown(httpServer);
      });

      process.on('SIGINT', () => {
        daemonShuttingDown = true;
        logger.info('SHUTDOWN', 'Received SIGINT', { activeTasks: activeTaskCount() });
        performGracefulShutdown(httpServer);
      });

      if (returnServer) {
        resolve({ server: httpServer, url, shutdown: async () => { daemonShuttingDown = true; performGracefulShutdown(httpServer); } });
      } else {
        resolve(url);
      }
    });
    httpServer.on('error', reject);
  });
}
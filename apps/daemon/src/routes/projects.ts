import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { readdirSync, statSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { renameSync as fsRenameSync, unlinkSync as fsUnlinkSync, rmSync } from 'node:fs';
import multer from 'multer';
import path from 'node:path';
import { logger } from '../utils/index.js';

export const SKIP_FILES = new Set(['.sqlite-wal', '.sqlite-shm']);

export function createProjectRoutes(db: Database.Database, PROJECTS_DIR: string): Router {
  const router = Router();

  const UPLOAD_MAX_SIZE = 50 * 1024 * 1024;
  const ALLOWED_EXTENSIONS = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.ts', '.tsx', '.json', '.md', '.txt', '.csv', '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp4', '.mov', '.webm', '.mp3', '.wav', '.m4a', '.zip']);

  const mapProject = (row: any) => ({
    id: row.id,
    name: row.name,
    surface: row.surface ?? null,
    skillId: row.skill_id ?? null,
    designSystemId: row.design_system_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.pending_prompt ? { pendingPrompt: row.pending_prompt } : {}),
    ...(row.custom_instructions ? { customInstructions: row.custom_instructions } : {}),
    ...(row.metadata_json ? { metadata: safeParseJson(row.metadata_json, null) } : {}),
  });

  function safeParseJson(raw: unknown, fallback: any): any {
    if (typeof raw !== 'string') return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  function projectDirFor(id: string): string {
    if (!/^[A-Za-z0-9._-]+$/.test(id)) throw new Error('invalid project id');
    const resolved = path.resolve(PROJECTS_DIR, id);
    if (!resolved.startsWith(path.resolve(PROJECTS_DIR) + path.sep) && resolved !== path.resolve(PROJECTS_DIR)) {
      throw new Error('path traversal');
    }
    return resolved;
  }

  function safeJoin(base: string, sub: string): string {
    const p = path.resolve(base, sub);
    const b = path.resolve(base);
    if (p !== b && !p.startsWith(b + path.sep)) throw new Error('path traversal');
    return p;
  }

  const MIME: Record<string, string> = {
    '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8', '.ts': 'text/typescript; charset=utf-8',
    '.tsx': 'text/typescript; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
    '.pdf': 'application/pdf',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
    '.zip': 'application/zip', '.gz': 'application/gzip',
  };

  function fileEntry(name: string, dir: string) {
    const fp = safeJoin(dir, name);
    const st = statSync(fp);
    const ext = path.extname(name).toLowerCase();
    const K: Record<string, string> = {
      '.html': 'html', '.htm': 'html',
      '.svg': 'sketch', '.sketch.json': 'sketch',
      '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.gif': 'image',
      '.webp': 'image', '.avif': 'image',
      '.mp4': 'video', '.mov': 'video', '.webm': 'video',
      '.mp3': 'audio', '.wav': 'audio', '.m4a': 'audio',
      '.md': 'text', '.txt': 'text', '.json': 'text', '.csv': 'text',
      '.js': 'code', '.mjs': 'code', '.ts': 'code', '.tsx': 'code', '.py': 'code',
      '.css': 'code', '.jsx': 'code',
      '.pdf': 'pdf', '.docx': 'document', '.pptx': 'presentation', '.xlsx': 'spreadsheet',
    };
    return { name, size: st.size, mtime: Math.round(st.mtimeMs), kind: K[ext] || 'binary', mime: MIME[ext] || 'application/octet-stream' };
  }

  function readFiles(dir: string) {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter((n) => {
      if (SKIP_FILES.has(n)) return false;
      try { return statSync(safeJoin(dir, n)).isFile(); } catch { return false; }
    }).map((n) => fileEntry(n, dir));
  }

  // --- Project CRUD ---
  router.get('/', (req, res) => {
    const userId = req.headers['x-user-id'] as string | undefined;
    let rows: any[];
    if (userId) {
      rows = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC').all(userId);
    } else {
      rows = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();
    }

    // Attach latest task info (file + status) for preview thumbnails
    const taskStmt = db.prepare(`
      SELECT project_id AS projectId, file_json AS fileJson, status
      FROM media_tasks
      WHERE project_id = ? AND status = 'done'
      ORDER BY ended_at DESC LIMIT 1
    `);
    // Latest task of ANY status — drives the project's displayed status so a
    // project whose render failed shows 'failed', not falsely 'done'.
    const latestStatusStmt = db.prepare(`
      SELECT status FROM media_tasks
      WHERE project_id = ?
      ORDER BY created_at DESC LIMIT 1
    `);
    const projects: any[] = rows.map(row => {
      const project: any = mapProject(row);
      const task: any = taskStmt.get(row.id);
      if (task) {
        let outputFile: string | null = null;
        try {
          const parsed = typeof task.fileJson === 'string' ? JSON.parse(task.fileJson) : task.fileJson;
          if (parsed) {
            if (Array.isArray(parsed) && parsed.length > 0) {
              outputFile = typeof parsed[0] === 'string' ? parsed[0] : parsed[0]?.name || null;
            } else if (parsed.name) {
              outputFile = parsed.name;
            } else if (typeof parsed === 'string') {
              outputFile = parsed;
            }
          }
        } catch { /* ignore parse errors */ }
        project.lastTaskFile = outputFile;
      }
      const latest: any = latestStatusStmt.get(row.id);
      project.lastTaskStatus = latest?.status ?? null;
      return project;
    });
    res.json({ projects });
  });

  router.post('/', (req, res) => {
    const now = Date.now();
    const id = typeof req.body?.id === 'string' && req.body.id ? req.body.id : randomUUID();
    let name = typeof req.body?.name === 'string' && req.body.name.trim() ? req.body.name.trim() : '';
    if (!name && req.body?.metadata?.name) name = req.body.metadata.name;
    if (!name) name = 'Untitled';
    const userId = req.headers['x-user-id'] as string | undefined;
    const conversationId = randomUUID();
    const insertResult = db.prepare('INSERT OR IGNORE INTO projects (id,user_id,name,surface,skill_id,design_system_id,pending_prompt,metadata_json,custom_instructions,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .run(id, userId ?? null, name, req.body?.surface ?? null, req.body?.skillId ?? null, req.body?.designSystemId ?? null, req.body?.pendingPrompt ?? null, req.body?.metadata ? JSON.stringify(req.body.metadata) : null, req.body?.customInstructions ?? null, now, now);
    const created = insertResult.changes > 0;
    const exists = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    const row = exists as any;
    if (!row.conversationId && !db.prepare('SELECT id FROM conversations WHERE project_id = ?').get(id)) {
      db.prepare('INSERT OR IGNORE INTO conversations (id,project_id,title,created_at,updated_at) VALUES (?,?,?,?,?)')
        .run(randomUUID(), id, null, now, now);
    }
    const conv = db.prepare('SELECT id FROM conversations WHERE project_id = ?').get(id) as any;
    const convId = conv?.id ?? conversationId;
    res.status(created ? 201 : 200).json({ project: mapProject(row), conversationId: convId });
  });

  router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const userId = req.headers['x-user-id'] as string | undefined;
    const projectUserId = (row as any).user_id;
    if (userId && projectUserId && projectUserId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const resolvedDir = projectDirFor(req.params.id);
    mkdirSync(resolvedDir, { recursive: true });
    res.json({ project: mapProject(row), resolvedDir });
  });

  router.patch('/:id', (req, res) => {
    const row: any = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    const userId = req.headers['x-user-id'] as string | undefined;
    if (userId && row.user_id && row.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const mergedMetadata = req.body?.metadata === null ? null : (req.body?.metadata ?? (row.metadata_json ? safeParseJson(row.metadata_json, {}) : null));
    const now = Date.now();
    db.prepare('UPDATE projects SET name=?, surface=?, skill_id=?, design_system_id=?, pending_prompt=?, metadata_json=?, custom_instructions=?, updated_at=? WHERE id=?')
      .run(req.body?.name ?? row.name, req.body?.surface ?? row.surface, req.body?.skillId ?? row.skill_id, req.body?.designSystemId ?? row.design_system_id, req.body?.pendingPrompt ?? row.pending_prompt, mergedMetadata ? JSON.stringify(mergedMetadata) : null, req.body?.customInstructions ?? row.custom_instructions, now, req.params.id);
    const updated: any = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    res.json({ project: mapProject(updated) });
  });

  router.get('/:id/conversations', (req, res) => {
    const rows = db.prepare('SELECT id, project_id, title, created_at, updated_at FROM conversations WHERE project_id = ? ORDER BY updated_at DESC').all(req.params.id);
    res.json({ conversations: rows.map((r: any) => ({ id: r.id, projectId: r.project_id, title: r.title, createdAt: r.created_at, updatedAt: r.updated_at })) });
  });

  // --- Files ---
  router.get('/:id/files', (req, res) => {
    const dir = projectDirFor(req.params.id);
    res.json({ files: readFiles(dir) });
  });

  router.get('/:id/files-legacy', (req, res) => {
    const dir = path.join(PROJECTS_DIR, req.params.id);
    if (!existsSync(dir)) return res.json({ files: [] });
    const files = readdirSync(dir)
      .filter((name) => !SKIP_FILES.has(name) && statSync(path.join(dir, name)).isFile())
      .map((name) => {
        const st = statSync(path.join(dir, name));
        const ext = path.extname(name).toLowerCase();
        const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg' };
        return { name, size: st.size, mtime: st.mtimeMs, kind: ext === '.html' ? 'html' : 'binary', mime: mime[ext] ?? 'application/octet-stream' };
      });
    res.json({ files });
  });

  const uploadMiddleware = multer({
    storage: multer.diskStorage({
      destination: (_req, file, cb) => {
        const projectId = (_req as any).params?.id;
        if (!projectId || !/^[A-Za-z0-9._-]+$/.test(projectId)) {
          cb(new Error('Invalid project ID'), '');
          return;
        }
        const dir = path.join(PROJECTS_DIR, projectId);
        mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const sanitized = path.basename(file.originalname).replace(/[^A-Za-z0-9._-]/g, '_');
        cb(null, sanitized);
      },
    }),
    limits: { fileSize: UPLOAD_MAX_SIZE },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        cb(new Error(`File type ${ext} not allowed`));
        return;
      }
      cb(null, true);
    },
  });

  router.post('/:id/upload', uploadMiddleware.array('file', 10), (req, res) => {
    const files = (req.files as Express.Multer.File[] ?? []).map((f) => ({
      name: f.filename,
      path: f.filename,
      size: f.size,
      originalName: f.originalname,
    }));
    res.json({ files });
  });

  router.delete('/:id', (req, res) => {
    const dir = projectDirFor(req.params.id);
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
    const changes = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id).changes;
    if (!changes) return res.status(404).json({ error: 'Project not found' });
    res.json({ ok: true });
  });

  router.delete('/:id/raw/:file', (req, res) => {
    const dir = projectDirFor(req.params.id);
    const fp = safeJoin(dir, req.params.file);
    try {
      fsUnlinkSync(fp);
      res.json({ ok: true });
    } catch {
      res.status(404).json({ error: 'file not found' });
    }
  });

  router.post('/:id/files/rename', (req, res) => {
    const dir = projectDirFor(req.params.id);
    const from = req.body?.from;
    const to = req.body?.to;
    if (!from || !to) return res.status(400).json({ error: 'from and to required' });
    const src = safeJoin(dir, from);
    const dst = safeJoin(dir, to);
    try {
      fsRenameSync(src, dst);
      const st = statSync(dst);
      const ext = path.extname(to).toLowerCase();
      const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg' };
      res.json({ file: { name: to, size: st.size, mtime: Math.round(st.mtimeMs), kind: ext === '.html' ? 'html' : 'binary', mime: MIME[ext] || 'application/octet-stream' }, oldName: from, newName: to });
    } catch {
      res.status(404).json({ error: 'rename failed' });
    }
  });

  // --- Serve generated files ---
  router.get('/:id/raw/:file', (req, res) => {
    const projectDir = projectDirFor(req.params.id);
    const filePath = path.resolve(projectDir, path.basename(req.params.file));
    if (!filePath.startsWith(path.resolve(PROJECTS_DIR))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    const ext = path.extname(filePath).toLowerCase();
    res.type(MIME[ext] || 'application/octet-stream');
    res.sendFile(filePath);
  });

  // --- Templates ---
  router.get('/templates', (_req, res) => {
    const rows = db.prepare('SELECT * FROM templates ORDER BY created_at DESC').all();
    res.json({ templates: rows.map((r: any) => ({ id: r.id, name: r.name, sourceProjectId: r.source_project_id ?? undefined, description: r.description ?? undefined, files: JSON.parse(r.files_json), createdAt: r.created_at })) });
  });

  // Note: template routes are mounted separately because they conflict with project :id pattern
  // They need to be registered BEFORE projects on the main router

  return router;
}

export function createTemplateRoutes(db: Database.Database, PROJECTS_DIR: string): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const rows = db.prepare('SELECT * FROM templates ORDER BY created_at DESC').all();
    res.json({ templates: rows.map((r: any) => ({ id: r.id, name: r.name, sourceProjectId: r.source_project_id ?? undefined, description: r.description ?? undefined, files: JSON.parse(r.files_json), createdAt: r.created_at })) });
  });

  router.get('/:id', (req, res) => {
    const row: any = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Template not found' });
    res.json({ template: { id: row.id, name: row.name, sourceProjectId: row.source_project_id ?? undefined, description: row.description ?? undefined, files: JSON.parse(row.files_json), createdAt: row.created_at } });
  });

  router.post('/', (req, res) => {
    const sourceProjectId = String(req.body?.sourceProjectId ?? '');
    if (!sourceProjectId) return res.status(400).json({ error: 'sourceProjectId required' });
    const dir = path.join(PROJECTS_DIR, sourceProjectId);
    const files = existsSync(dir)
      ? readdirSync(dir).filter((name: string) => !SKIP_FILES.has(name) && statSync(path.join(dir, name)).isFile()).map((name: string) => ({ name, content: readFileSync(path.join(dir, name), 'utf8') }))
      : [];
    const id = randomUUID();
    const createdAt = Date.now();
    db.prepare('INSERT INTO templates (id,name,source_project_id,description,files_json,created_at) VALUES (?,?,?,?,?,?)')
      .run(id, req.body?.name ?? 'Template', sourceProjectId, req.body?.description ?? null, JSON.stringify(files), createdAt);
    res.status(201).json({ template: { id, name: req.body?.name ?? 'Template', sourceProjectId, description: req.body?.description ?? undefined, files, createdAt } });
  });

  router.delete('/:id', (req, res) => {
    const changes = db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id).changes;
    if (!changes) return res.status(404).json({ error: 'Template not found' });
    res.json({ ok: true });
  });

  return router;
}
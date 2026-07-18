import { mkdir } from 'node:fs/promises';
import path from 'node:path';

// Blacklisted project IDs that would cause recursive directory structures
const RESERVED_IDS = new Set(['app', 'undefined', 'null', 'true', 'false', 'NaN', 'projects', '.od', 'node_modules']);

export function isSafeId(id: string): boolean {
  if (typeof id !== 'string') return false;
  if (id.length === 0 || id.length > 128) return false;
  if (/^\.+$/.test(id)) return false;
  if (id.toLowerCase() === 'app' || id.toLowerCase() === 'undefined') return false;
  if (RESERVED_IDS.has(id) || RESERVED_IDS.has(id.toLowerCase())) return false;
  // Prevent path traversal and directory-like names
  if (id.includes('/') || id.includes('\\') || id.startsWith('.')) return false;
  return /^[A-Za-z0-9._-]+$/.test(id);
}

export function projectDir(projectsRoot: string, projectId: string): string {
  if (!isSafeId(projectId)) throw new Error('invalid project id');
  return path.join(projectsRoot, projectId);
}

export async function ensureProject(projectsRoot: string, projectId: string): Promise<string> {
  const dir = projectDir(projectsRoot, projectId);
  await mkdir(dir, { recursive: true });
  return dir;
}

const EXT_MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.ts': 'text/typescript; charset=utf-8',
  '.tsx': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
};

export function mimeFor(name: string): string {
  const ext = path.extname(name).toLowerCase();
  return EXT_MIME[ext] || 'application/octet-stream';
}

export function kindFor(name: string): string {
  if (name.endsWith('.sketch.json')) return 'sketch';
  const ext = path.extname(name).toLowerCase();
  if (ext === '.html' || ext === '.htm') return 'html';
  if (ext === '.svg') return 'sketch';
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'].includes(ext)) {
    if (name.startsWith('sketch-')) return 'sketch';
    return 'image';
  }
  if (['.mp4', '.mov', '.webm'].includes(ext)) return 'video';
  if (['.mp3', '.wav', '.m4a'].includes(ext)) return 'audio';
  if (['.md', '.txt'].includes(ext)) return 'text';
  if (['.js', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.css', '.py'].includes(ext)) return 'code';
  if (ext === '.pdf') return 'pdf';
  return 'binary';
}

export function sanitizeName(raw: string): string {
  const cleaned = String(raw ?? '')
    .replace(/[\\/]/g, '_')
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}._-]/gu, '_')
    .replace(/^\.+/, '_')
    .trim();
  return cleaned || `file-${Date.now()}`;
}

export function getProject(_db: any, id: string): any {
  return { id };
}

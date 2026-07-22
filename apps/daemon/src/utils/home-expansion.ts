import os from 'node:os';
import path from 'node:path';

const HOME_BARE_TOKENS = new Set(['~', '$HOME', '${HOME}']);
const HOME_PREFIX_RE = /^(~|\$\{HOME\}|\$HOME)[/\\](.*)$/;

export function expandHomePrefix(raw: string): string {
  const home = os.homedir();
  if (HOME_BARE_TOKENS.has(raw)) return home;
  const match = HOME_PREFIX_RE.exec(raw);
  if (match) return path.join(home, match[2] ?? '');
  return raw;
}

/**
 * Guards a resolved directory against path traversal: a project-relative input
 * (e.g. `../../etc`) must stay inside `projectRoot`. Absolute inputs are an
 * explicit, deliberate location and are allowed through. Throws on escape.
 */
export function assertWithinRoot(resolved: string, projectRoot: string): string {
  const root = path.resolve(projectRoot);
  const rel = path.relative(root, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`path escapes project root: ${resolved}`);
  }
  return resolved;
}

export function resolveProjectRelativePath(raw: string, projectRoot: string): string {
  const expanded = expandHomePrefix(raw);
  if (path.isAbsolute(expanded)) return expanded;
  return assertWithinRoot(path.resolve(projectRoot, expanded), projectRoot);
}

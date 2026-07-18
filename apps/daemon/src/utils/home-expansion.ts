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

export function resolveProjectRelativePath(raw: string, projectRoot: string): string {
  const expanded = expandHomePrefix(raw);
  return path.isAbsolute(expanded) ? expanded : path.resolve(projectRoot, expanded);
}

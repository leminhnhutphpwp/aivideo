import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MEDIA_PROVIDERS } from './models.js';
import { expandHomePrefix, assertWithinRoot } from '../utils/home-expansion.js';

const PROVIDER_IDS = MEDIA_PROVIDERS.map((p) => p.id);
type ProviderEntry = { apiKey?: string; baseUrl?: string; model?: string };
type ProviderMap = Record<string, ProviderEntry>;
type ModelAliasMap = Record<string, string>;
type JsonRecord = Record<string, unknown>;
type OAuthCredential = { apiKey: string; source: string };

const ENV_MODEL_ALIASES = 'MEDIA_MODEL_ALIASES';

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object';
}

function errorCode(err: unknown): string | undefined {
  return isRecord(err) && typeof err.code === 'string' ? err.code : undefined;
}

const ENV_KEYS: Record<string, string[]> = {
  qwencloud: ['QWENCLOUD_API_KEY', 'DASHSCOPE_API_KEY'],
  ckey: ['TTS_API_KEY', 'CKEY_API_KEY'],
  cloudflare: ['CLOUDFLARE_API_KEY'],
  // Generic OpenAI-compatible image/TTS endpoint (e.g. xah.io → Alibaba DashScope).
  // Dispatched via protocol='openai'; base URL comes from OPENAI_BASE_URL (see readEnvBaseUrl).
  openai: ['OPENAI_API_KEY'],
};

function resolveOverrideDir(raw: string, projectRoot: string): string {
  const expanded = expandHomePrefix(raw);
  if (path.isAbsolute(expanded)) return expanded;
  return assertWithinRoot(path.resolve(projectRoot, expanded), projectRoot);
}

function envOverrideDir(envName: string, projectRoot: string): string | null {
  const raw = process.env[envName];
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed ? resolveOverrideDir(trimmed, projectRoot) : null;
}

function configFile(projectRoot: string): string {
  const dir = envOverrideDir('MEDIA_CONFIG_DIR', projectRoot)
    ?? envOverrideDir('DATA_DIR', projectRoot)
    ?? path.join(projectRoot, '.od');
  return path.join(dir, 'media-config.json');
}

function coerceAliasMap(raw: unknown): ModelAliasMap {
  if (!isRecord(raw)) return {};
  const out: ModelAliasMap = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof k !== 'string' || !k.trim()) continue;
    if (typeof v !== 'string' || !v.trim()) continue;
    out[k.trim()] = v.trim();
  }
  return out;
}

async function readStoredFile(projectRoot: string): Promise<JsonRecord> {
  try {
    const raw = await readFile(configFile(projectRoot), 'utf8');
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch (err) {
    if (errorCode(err) === 'ENOENT') return {};
    throw err;
  }
}

async function readStored(projectRoot: string): Promise<ProviderMap> {
  const parsed = await readStoredFile(projectRoot);
  return isRecord(parsed.providers) ? (parsed.providers as ProviderMap) : {};
}

async function readStoredAliases(projectRoot: string): Promise<ModelAliasMap> {
  const parsed = await readStoredFile(projectRoot);
  return coerceAliasMap(parsed.aliases);
}

async function writeStored(projectRoot: string, providers: ProviderMap, aliases?: ModelAliasMap): Promise<void> {
  const file = configFile(projectRoot);
  await mkdir(path.dirname(file), { recursive: true });
  const resolvedAliases = aliases ?? (await readStoredAliases(projectRoot));
  const body: JsonRecord = { providers };
  if (Object.keys(resolvedAliases).length > 0) {
    body.aliases = resolvedAliases;
  }
  await writeFile(file, JSON.stringify(body, null, 2), 'utf8');
}

function readEnvAliases(): ModelAliasMap {
  const raw = process.env[ENV_MODEL_ALIASES];
  if (typeof raw !== 'string' || !raw.trim()) return {};
  try { return coerceAliasMap(JSON.parse(raw)); } catch { return {}; }
}

export async function resolveModelAlias(projectRoot: string, modelId: string): Promise<string> {
  const envAliases = readEnvAliases();
  if (envAliases[modelId]) return envAliases[modelId]!;
  const stored = await readStoredAliases(projectRoot);
  return stored[modelId] ?? modelId;
}

export async function readAliasMap(projectRoot: string): Promise<{ effective: ModelAliasMap; env: ModelAliasMap; stored: ModelAliasMap }> {
  const env = readEnvAliases();
  const stored = await readStoredAliases(projectRoot);
  const effective: ModelAliasMap = { ...stored, ...env };
  return { effective, env, stored };
}

function readEnvKey(providerId: string): string | null {
  const keys = ENV_KEYS[providerId];
  if (!keys) return null;
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function readEnvBaseUrl(providerId: string): string | null {
  const upper = providerId.toUpperCase().replace(/-/g, '_');
  const candidates: string[] = [`${upper}_BASE_URL`];
  if (providerId === 'openai' || providerId === 'ckey') {
    candidates.push('TTS_BASE_URL', 'OPENAI_BASE_URL', 'LLM_BASE_URL');
  }
  for (const key of candidates) {
    const v = process.env[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function readNestedString(obj: unknown, keys: string[]): string {
  let cur: unknown = obj;
  for (const key of keys) {
    if (!isRecord(cur)) return '';
    cur = cur[key];
  }
  return typeof cur === 'string' && cur.trim() ? cur.trim() : '';
}

async function readJsonIfPresent(file: string): Promise<JsonRecord | null> {
  try {
    const raw = await readFile(file, 'utf8');
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch (err) {
    if (errorCode(err) === 'ENOENT') return null;
    return null;
  }
}

function tokenFromHermesAuth(data: unknown): string {
  const providerToken = readNestedString(data, ['providers', 'openai-codex', 'tokens', 'access_token']);
  if (providerToken) return providerToken;
  const pool = isRecord(data) && isRecord(data.credential_pool) ? data.credential_pool['openai-codex'] : null;
  if (Array.isArray(pool)) {
    for (const item of pool) {
      const token = readNestedString(item, ['access_token']);
      if (token) return token;
    }
  }
  return '';
}

function tokenFromCodexAuth(data: unknown): { token: string; source: string } | null {
  const oauthToken = readNestedString(data, ['tokens', 'access_token']);
  if (oauthToken) return { token: oauthToken, source: 'oauth-codex' };
  const apiKey = readNestedString(data, ['OPENAI_API_KEY']);
  if (apiKey) return { token: apiKey, source: 'codex-auth' };
  return null;
}

async function resolveOpenAIOAuthCredential(): Promise<OAuthCredential | null> {
  const home = os.homedir();
  const hermesAuth = await readJsonIfPresent(path.join(home, '.hermes', 'auth.json'));
  const hermesToken = tokenFromHermesAuth(hermesAuth);
  if (hermesToken) return { apiKey: hermesToken, source: 'oauth-hermes' };

  const codexAuth = await readJsonIfPresent(path.join(home, '.codex', 'auth.json'));
  const codexToken = tokenFromCodexAuth(codexAuth);
  if (codexToken) return { apiKey: codexToken.token, source: codexToken.source };

  return null;
}

export async function resolveProviderConfig(projectRoot: string, providerId: string): Promise<ProviderEntry> {
  const stored = await readStored(projectRoot);
  const entry = stored[providerId] || {};
  const envKey = readEnvKey(providerId);
  const oauth = providerId === 'openai' && !envKey && !entry.apiKey ? await resolveOpenAIOAuthCredential() : null;
  // Base URL precedence: env override → stored config → the provider's built-in
  // defaultBaseUrl (e.g. qwencloud → dashscope-intl). Falling through to the default
  // is what stops "no Qwen Cloud base URL" when only the API key (DASHSCOPE_API_KEY)
  // is set — the default was defined in ALL_PROVIDERS but never consulted here.
  const defaultBaseUrl = MEDIA_PROVIDERS.find((p) => p.id === providerId)?.defaultBaseUrl || '';
  return {
    apiKey: envKey || entry.apiKey || oauth?.apiKey || '',
    baseUrl: readEnvBaseUrl(providerId) || entry.baseUrl || defaultBaseUrl,
    ...(typeof entry.model === 'string' && entry.model.trim() ? { model: entry.model.trim() } : {}),
  };
}

export interface MaskedConfigResponse {
  providers: Record<string, { configured: boolean; source: string; apiKeyTail: string; baseUrl: string; model?: string }>;
  aliases: { effective: ModelAliasMap; env: ModelAliasMap; stored: ModelAliasMap };
}

export async function readMaskedConfig(projectRoot: string): Promise<MaskedConfigResponse> {
  const stored = await readStored(projectRoot);
  const providers: MaskedConfigResponse['providers'] = {};
  for (const id of PROVIDER_IDS) {
    const entry = stored[id] || {};
    const envKey = readEnvKey(id);
    const hasStoredKey = typeof entry.apiKey === 'string' && entry.apiKey.length > 0;
    const oauth = id === 'openai' && !envKey && !hasStoredKey ? await resolveOpenAIOAuthCredential() : null;
    providers[id] = {
      configured: Boolean(envKey || hasStoredKey || oauth?.apiKey),
      source: envKey ? 'env' : hasStoredKey ? 'stored' : oauth?.source || 'unset',
      apiKeyTail: hasStoredKey && entry.apiKey ? entry.apiKey.slice(-4) : '',
      baseUrl: entry.baseUrl || '',
      ...(typeof entry.model === 'string' && entry.model.trim() ? { model: entry.model.trim() } : {}),
    };
  }
  const aliases = await readAliasMap(projectRoot);
  return { providers, aliases };
}

export async function writeConfig(projectRoot: string, body: unknown) {
  const incoming = isRecord(body) && isRecord(body.providers) ? body.providers : {};
  const force = Boolean(isRecord(body) && body.force === true);
  const prior = await readStored(projectRoot);
  const next: ProviderMap = {};
  for (const id of PROVIDER_IDS) {
    const entry = incoming[id];
    if (!isRecord(entry)) continue;
    const incomingApiKey = typeof entry.apiKey === 'string' && entry.apiKey.trim() ? entry.apiKey.trim() : '';
    const preserveApiKey = entry.preserveApiKey === true;
    const priorApiKey = typeof prior[id]?.apiKey === 'string' && prior[id].apiKey.trim() ? prior[id].apiKey.trim() : '';
    const apiKey = incomingApiKey || (preserveApiKey ? priorApiKey : '');
    const baseUrl = typeof entry.baseUrl === 'string' && entry.baseUrl.trim() ? entry.baseUrl.trim() : '';
    const model = typeof entry.model === 'string' && entry.model.trim() ? entry.model.trim() : '';
    if (!apiKey && !baseUrl && !model) continue;
    next[id] = { apiKey, baseUrl, ...(model ? { model } : {}) };
  }
  if (Object.keys(next).length === 0) {
    const priorIds = Object.keys(prior).filter((id) => prior[id] && (prior[id].apiKey || prior[id].baseUrl));
    if (priorIds.length > 0) {
      if (!force) {
        const err = new Error(`refusing to wipe ${priorIds.length} configured provider(s) without force=true: ${priorIds.join(', ')}`) as Error & { status: number };
        err.status = 409;
        throw err;
      }
      try { console.error(`[media-config] WARN: incoming PUT empty, would wipe ${priorIds.length} configured provider(s): ${priorIds.join(', ')}`); } catch {}
    }
  }
  await writeStored(projectRoot, next);
  return readMaskedConfig(projectRoot);
}

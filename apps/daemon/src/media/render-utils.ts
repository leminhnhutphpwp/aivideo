import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { Agent as UndiciAgent } from 'undici';
import { promisify } from 'node:util';
import { execFile as execFileCb } from 'node:child_process';
import type { ImageRef, JsonRecord, MediaContext, MediaSurface, AudioKind, RenderResult } from './types.js';
import { DEFAULT_OUTPUT_BY_SURFACE } from './types.js';

export type { ProviderConfig, ProgressFn, ImageRef, MediaContext, MediaSurface, AudioKind, RenderResult } from './types.js';
export { StubProviderDisabledError, DEFAULT_OUTPUT_BY_SURFACE, SURFACES, AUDIO_KINDS } from './types.js';

const execFile = promisify(execFileCb);

export function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object';
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function errorStringProp(err: unknown, key: string): string {
  return isRecord(err) && typeof err[key] === 'string' ? err[key] : '';
}

export function stubsAllowed(): boolean {
  const v = process.env.MEDIA_ALLOW_STUBS;
  return v === '1' || v === 'true';
}

export async function resolveProjectImage(rel: unknown, projectDir: string): Promise<ImageRef | null> {
  if (typeof rel !== 'string' || !rel.trim()) return null;
  const projectRootResolved = path.resolve(projectDir);
  const abs = path.resolve(projectRootResolved, rel.trim());
  if (
    abs !== projectRootResolved &&
    !abs.startsWith(projectRootResolved + path.sep)
  ) {
    throw new Error(
      `--image path "${rel}" resolves outside the project directory.`,
    );
  }
  let info;
  try {
    info = await stat(abs);
  } catch {
    throw new Error(`--image not found: ${rel}`);
  }
  if (!info.isFile()) {
    throw new Error(`--image is not a regular file: ${rel}`);
  }
  const ext = path.extname(abs).toLowerCase();

  // Video formats — encode as base64 for provider API (QwenCloud requires public URL or base64)
  const VIDEO_MIMES: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
  };
  if (ext in VIDEO_MIMES) {
    const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
    if (info.size > MAX_VIDEO_BYTES) {
      throw new Error(`--image too large (${info.size} bytes; max ${MAX_VIDEO_BYTES}).`);
    }
    const videoBytes = await readFile(abs);
    const mime = VIDEO_MIMES[ext];
    return {
      path: rel.trim(),
      abs,
      mime,
      size: videoBytes.length,
      dataUrl: `data:${mime};base64,${videoBytes.toString('base64')}`,
    };
  }

  // Image formats
  const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
  if (info.size > MAX_IMAGE_BYTES) {
    throw new Error(
      `--image too large (${info.size} bytes; max ${MAX_IMAGE_BYTES}).`,
    );
  }
  const bytes = await readFile(abs);
  const mime = ({
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  })[ext];
  if (!mime) {
    throw new Error(
      `--image has unsupported extension "${ext}". Use png, jpg, jpeg, webp, gif, mp4, mov, or webm.`,
    );
  }
  return {
    path: rel.trim(),
    abs,
    mime,
    size: bytes.length,
    dataUrl: `data:${mime};base64,${bytes.toString('base64')}`,
  };
}

export function clampNumber(value: unknown, allowed: number[]): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  if (allowed.length === 0) return undefined;
  if (allowed.includes(value)) return value;
  let best = allowed[0]!;
  let bestDiff = Math.abs(value - best);
  for (const a of allowed) {
    const d = Math.abs(value - a);
    if (d < bestDiff) {
      best = a;
      bestDiff = d;
    }
  }
  return best;
}

export function clampWithWarning(value: unknown, allowed: number[], flagName: string): { value: number | undefined; warning: string | null } {
  const clamped = clampNumber(value, allowed);
  if (
    typeof value === 'number'
    && Number.isFinite(value)
    && typeof clamped === 'number'
    && clamped !== value
  ) {
    return {
      value: clamped,
      warning: `--${flagName} ${value} clamped to ${clamped} (allowed: ${allowed.join(', ')})`,
    };
  }
  return { value: clamped, warning: null };
}

export function autoOutputName(surface: MediaSurface, model: string, audioKind?: AudioKind): string {
  const base = DEFAULT_OUTPUT_BY_SURFACE[surface] || 'artifact.bin';
  const stamp = Date.now().toString(36);
  const tag = surface === 'audio' && audioKind ? `${audioKind}` : surface;
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : '';
  return `${stem}-${tag}-${stamp}${ext}`;
}

export function defaultAspectFor(surface: MediaSurface): string | undefined {
  if (surface === 'image') return '1:1';
  if (surface === 'video') return '16:9';
  return undefined;
}

export function volcengineRatioFor(aspect?: string): string {
  if (!aspect) return '16:9';
  if (aspect === '1:1' || aspect === '16:9' || aspect === '9:16' || aspect === '4:3' || aspect === '3:4') {
    return aspect;
  }
  return '16:9';
}

export function openaiSizeFor(model: string, aspect?: string): string {
  if (model.startsWith('gpt-image-')) {
    if (aspect === '16:9') return '1792x1024';
    if (aspect === '9:16') return '1024x1792';
    if (aspect === '4:3') return '1408x1056';
    if (aspect === '3:4') return '1056x1408';
    return '1024x1024';
  }
  if (model === 'dall-e-3') {
    if (aspect === '16:9') return '1792x1024';
    if (aspect === '9:16') return '1024x1792';
    return '1024x1024';
  }
  return '1024x1024';
}

export function truncate(s: unknown, n: number): string {
  const v = String(s || '');
  if (v.length <= n) return v;
  return v.slice(0, n - 1) + '…';
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function grokAspectFor(aspect?: string): string {
  if (
    aspect === '1:1'
    || aspect === '16:9'
    || aspect === '9:16'
    || aspect === '4:3'
    || aspect === '3:4'
  ) {
    return aspect;
  }
  return '16:9';
}

export function nanoBananaAspectFor(aspect?: string): string {
  if (
    aspect === '1:1'
    || aspect === '16:9'
    || aspect === '9:16'
    || aspect === '4:3'
    || aspect === '3:4'
  ) {
    return aspect;
  }
  return '1:1';
}

export function imageRouterSizeFor(aspect: string | undefined, surface: 'image' | 'video'): string {
  if (surface === 'video') {
    if (aspect === '1:1') return '1024x1024';
    if (aspect === '9:16') return '576x1024';
    if (aspect === '4:3') return '1024x768';
    if (aspect === '3:4') return '768x1024';
    return '1024x576';
  }
  if (aspect === '16:9') return '1024x576';
  if (aspect === '9:16') return '576x1024';
  if (aspect === '4:3') return '1024x768';
  if (aspect === '3:4') return '768x1024';
  return '1024x1024';
}

export function sniffImageExt(bytes: Buffer): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return '.jpg';
  }
  if (
    bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  ) {
    return '.png';
  }
  if (
    bytes.length >= 12
    && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return '.webp';
  }
  return '.png';
}

export function detectAzureEndpoint(baseUrl: string): boolean {
  if (typeof baseUrl !== 'string' || !baseUrl) return false;
  if (/\.azure\.com\b/i.test(baseUrl)) return true;
  if (/\/openai\/deployments\//i.test(baseUrl)) return true;
  return false;
}

export const AZURE_DEFAULT_API_VERSION = '2024-02-01';
export const OPENAI_IMAGE_HEADERS_TIMEOUT_MS = 10 * 60 * 1000;
export const OPENAI_IMAGE_BODY_TIMEOUT_MS = 10 * 60 * 1000;
export const openAIImageDispatcher = new UndiciAgent({
  headersTimeout: OPENAI_IMAGE_HEADERS_TIMEOUT_MS,
  bodyTimeout: OPENAI_IMAGE_BODY_TIMEOUT_MS,
});

export const NANOBANANA_DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';
export const NANOBANANA_DEFAULT_MODEL = 'gemini-3.1-flash-image-preview';
export const NANOBANANA_DEFAULT_IMAGE_SIZE = '1K';
export const IMAGEROUTER_DEFAULT_BASE_URL = 'https://api.imagerouter.io/v1/openai';
export const CUSTOM_IMAGE_MODEL_ID = 'custom-image';

export const OPENAI_TTS_VOICES = new Set([
  'alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'verse',
]);

export const CKEY_DEFAULT_VOICE_ID = 'vi-VN-NamMinhNeural';
export const ELEVENLABS_DEFAULT_BASE_URL = 'https://api.elevenlabs.io';
export const ELEVENLABS_DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';
export const ELEVENLABS_TTS_MODEL_MAP: Record<string, string> = {
  'elevenlabs-v3': 'eleven_v3',
};
export const ELEVENLABS_SFX_MODEL_MAP: Record<string, string> = {
  'elevenlabs-sfx': 'eleven_text_to_sound_v2',
};
export const ELEVENLABS_SFX_MAX_PROMPT_CHARS = 450;
export const ELEVENLABS_SFX_DEFAULT_PROMPT_INFLUENCE = 0.3;

export function clampElevenLabsSfxDuration(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 5;
  return Math.min(30, Math.max(0.5, value));
}

export function clampElevenLabsSfxPromptInfluence(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return ELEVENLABS_SFX_DEFAULT_PROMPT_INFLUENCE;
  }
  return Math.min(1, Math.max(0, value));
}

export function requireElevenLabsPrompt(text: string, kind: 'TTS' | 'SFX'): string {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`ElevenLabs ${kind} prompt must not be empty. Pass --prompt before retrying.`);
  }
  return trimmed;
}

export function assertElevenLabsSfxPromptLength(text: string): void {
  const promptChars = Array.from(text).length;
  if (promptChars > ELEVENLABS_SFX_MAX_PROMPT_CHARS) {
    throw new Error(
      `ElevenLabs SFX prompt exceeds ${ELEVENLABS_SFX_MAX_PROMPT_CHARS} characters (${promptChars}). Shorten --prompt before retrying.`,
    );
  }
}

export const MINIMAX_DEFAULT_BASE_URL = 'https://api.minimaxi.chat/v1';
export const MINIMAX_TTS_MODEL_MAP: Record<string, string> = {
  'minimax-tts': 'speech-02-turbo',
};

export const SENSEAUDIO_DEFAULT_BASE_URL = 'https://api.senseaudio.cn';
export const SENSEAUDIO_DEFAULT_VOICE_ID = 'female_0033_b';
export const SENSEAUDIO_TTS_MODEL_MAP: Record<string, string> = {
  'senseaudio-tts': 'senseaudio-tts-1.5-260319',
};

export const FISHAUDIO_DEFAULT_BASE_URL = 'https://api.fish.audio';
export const FISHAUDIO_TTS_MODEL_MAP: Record<string, string> = {
  'fish-speech-2': 'speech-1.6',
};

export const GOOGLE_TTS_BASE = 'https://texttospeech.googleapis.com';

export const HYPERFRAMES_RENDER_TIMEOUT_MS = 5 * 60 * 1000;

export function buildOpenAICompatibleGenerationUrl(baseUrl: string, endpoint: 'images' | 'videos'): string {
  const suffix = `/${endpoint}/generations`;
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    const stripped = baseUrl.replace(/\/$/, '');
    return stripped.endsWith(suffix) ? stripped : `${stripped}${suffix}`;
  }
  const strippedPath = parsed.pathname.replace(/\/+$/, '');
  if (!strippedPath.endsWith(suffix)) {
    parsed.pathname = `${strippedPath}${suffix}`;
  }
  return parsed.toString();
}

export function buildOpenAIImageUrl(baseUrl: string, isAzure: boolean): string {
  let parsed;
  try {
    parsed = new URL(buildOpenAICompatibleGenerationUrl(baseUrl, 'images'));
  } catch {
    return buildOpenAICompatibleGenerationUrl(baseUrl, 'images');
  }
  if (isAzure && !parsed.searchParams.has('api-version')) {
    parsed.searchParams.set('api-version', AZURE_DEFAULT_API_VERSION);
  }
  return parsed.toString();
}

export function buildOpenAIVideoUrl(baseUrl: string): string {
  return buildOpenAICompatibleGenerationUrl(baseUrl, 'videos');
}

export function buildOpenAISpeechUrl(baseUrl: string, isAzure: boolean): string {
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    const stripped = baseUrl.replace(/\/$/, '');
    return `${stripped}/audio/speech`;
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, '') + '/audio/speech';
  if (isAzure && !parsed.searchParams.has('api-version')) {
    parsed.searchParams.set('api-version', AZURE_DEFAULT_API_VERSION);
  }
  return parsed.toString();
}

export function openaiSpeechFormatFor(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.wav') return 'wav';
  if (ext === '.flac') return 'flac';
  if (ext === '.aac') return 'aac';
  if (ext === '.opus' || ext === '.ogg' || ext === '.oga') return 'opus';
  return 'mp3';
}

export async function parseOpenAICompatibleJson(resp: Response, providerTag: string): Promise<any> {
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`${providerTag} ${resp.status}: ${truncate(text, 240)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${providerTag} non-JSON response: ${truncate(text, 200)}`);
  }
}

export async function bytesFromOpenAICompatibleData(data: any, providerTag: string): Promise<Buffer> {
  const entry = data && Array.isArray(data.data) ? data.data[0] : null;
  if (!entry) throw new Error(`${providerTag} response had no data[0]`);
  if (typeof entry.b64_json === 'string' && entry.b64_json) {
    const raw = entry.b64_json.includes(',')
      ? entry.b64_json.slice(entry.b64_json.indexOf(',') + 1)
      : entry.b64_json;
    return Buffer.from(raw, 'base64');
  }
  if (typeof entry.url === 'string' && entry.url) {
    const mediaResp = await fetch(entry.url);
    if (!mediaResp.ok) {
      throw new Error(`${providerTag} media fetch ${mediaResp.status}`);
    }
    const arr = await mediaResp.arrayBuffer();
    return Buffer.from(arr);
  }
  throw new Error(`${providerTag} response had neither b64_json nor url`);
}

export function customImageOverridesOpenAIModel(
  ctx: MediaContext,
  credentials: { apiKey?: string; baseUrl?: string; model?: string } | null,
): credentials is { apiKey?: string; baseUrl?: string; model?: string } {
  const baseUrl = credentials?.baseUrl?.trim();
  const model = credentials?.model?.trim();
  if (!baseUrl || !model) return false;
  return model === ctx.model || model === ctx.wireModel;
}

export function nanoBananaHeaders(baseUrl: string, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (usesOfficialGoogleApiKeyHeader(baseUrl)) {
    headers['x-goog-api-key'] = apiKey;
    return headers;
  }
  headers.authorization = `Bearer ${apiKey}`;
  return headers;
}

export function usesOfficialGoogleApiKeyHeader(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    return url.hostname === 'generativelanguage.googleapis.com';
  } catch {
    return false;
  }
}

export function inlineImageBytesFromGenerateContent(data: any): Buffer {
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      const inline = part?.inlineData;
      if (typeof inline?.data === 'string' && inline.data) {
        return Buffer.from(inline.data, 'base64');
      }
    }
  }
  throw new Error('nano-banana image response missing candidates[].content.parts[].inlineData.data');
}

export function runHyperFramesRender(compAbs: string, tmpOutput: string, onProgress?: (message: string) => void): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(
      'npx',
      ['-y', 'hyperframes', 'render', compAbs, '--output', tmpOutput, '--workers', '1'],
      { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const stripAnsi = (s: string): string =>
      s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').replace(/\x1b\[\?[0-9]+[hl]/g, '');
    const emit = (chunk: Buffer): void => {
      if (typeof onProgress !== 'function') return;
      const text = stripAnsi(chunk.toString('utf8'));
      const lines = text.split(/[\r\n]+/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try { onProgress(trimmed); } catch {}
      }
    };
    let stderrTail = '';
    child.stdout.on('data', emit);
    child.stderr.on('data', (chunk) => {
      stderrTail += chunk.toString('utf8');
      if (stderrTail.length > 8000) stderrTail = stderrTail.slice(-8000);
      emit(chunk);
    });
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch {}
      reject(new Error(`hyperframes render timed out after ${Math.round(HYPERFRAMES_RENDER_TIMEOUT_MS / 1000)}s`));
    }, HYPERFRAMES_RENDER_TIMEOUT_MS);
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (code === 0) return resolve();
      const reason = signal ? `signal ${signal}` : `exit ${code}`;
      const tail = stderrTail.trim().split('\n').slice(-12).join('\n');
      const err = new Error(`hyperframes render exited ${reason}` + (tail ? `\n${tail}` : '')) as Error & { stderr: string };
      err.stderr = tail;
      reject(err);
    });
  });
}

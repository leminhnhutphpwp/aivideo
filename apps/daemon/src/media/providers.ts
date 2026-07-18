// Unified provider config — single source of truth.
// ALL providers, models, TTS configs, and LLM configs go here.
// Other files (models.ts, routes/media.ts) derive from this file.

export type ProviderConfig = {
  id: string;
  label: string;
  hint: string;
  integrated: boolean;
  defaultBaseUrl?: string;
  docsUrl?: string;
  credentialsRequired?: boolean;
  settingsVisible?: boolean;
  supportsCustomModel?: boolean;
  customModelPlaceholder?: string;
  /** Env var that holds the API key (e.g. 'CKEY_API_KEY') */
  apiKeyEnv: string;
  /** Models this provider hosts */
  models: ProviderModel[];
  /** TTS config — present if provider supports TTS */
  tts?: { model: string };
  /** LLM config — present if provider supports chat/completions */
  llm?: { baseUrl: string; defaultModel: string };
};

export type ProviderModel = {
  id: string;
  label: string;
  hint: string;
  caps: string[];
  default?: boolean;
  /** The identifier sent on the wire to the provider API, when it differs from the
   *  clean internal `id` (e.g. internal 'wan2.7-image' → wire 'phuocanh421994/Wan2.7_Image').
   *  Falls back to `id` when omitted. */
  wireModel?: string;
  /** Aspect ratios this model is confirmed to accept. Omit = all MEDIA_ASPECTS. */
  aspects?: string[];
};

export const ALL_PROVIDERS: ProviderConfig[] = [
  {
    id: 'qwencloud',
    label: 'Qwen Cloud (Alibaba)',
    hint: 'Wan 2.7 · HappyHorse',
    integrated: true,
    defaultBaseUrl: 'https://dashscope-intl.aliyuncs.com/api/v1',
    apiKeyEnv: 'QWENCLOUD_API_KEY',
    models: [
      // --- Image ---
      { id: 'z-image-turbo', label: 'z-image-turbo', hint: '$0.015/img · turbo · rẻ nhất', caps: ['t2i'] },
      { id: 'wan2.6-t2i', label: 'wan2.6-t2i', hint: '$0.03/img · Wan 2.6', caps: ['t2i'] },
      { id: 'qwen-image-max', label: 'qwen-image-max', hint: '$0.075/img · realism', caps: ['t2i'] },
      { id: 'wan2.7-image-pro', label: 'wan2.7-image-pro', hint: '$0.075/img · Wan 2.7 async', caps: ['t2i'] },
      { id: 'qwen-image-plus', label: 'qwen-image-plus', hint: '$0.03/img · T2I + Edit', caps: ['t2i', 'i2i'] },
      { id: 'qwen-image-2.0', label: 'qwen-image-2.0', hint: '$0.035/img · T2I + Edit + Inpaint', caps: ['t2i', 'i2i', 'inpaint'] },
      { id: 'qwen-image-2.0-pro', label: 'qwen-image-2.0-pro', hint: '$0.075/img · T2I + Edit + Inpaint', caps: ['t2i', 'i2i', 'inpaint'] },
      { id: 'qwen-image-edit-plus', label: 'qwen-image-edit-plus', hint: '$0.03/img · Edit + T2I', caps: ['i2i', 'inpaint', 't2i'] },
      { id: 'wan2.5-i2i-preview', label: 'wan2.5-i2i-preview', hint: 'Wan 2.5 · Edit rẻ nhất', caps: ['i2i', 'inpaint'] },
      { id: 'qwen-image-edit', label: 'qwen-image-edit', hint: 'Edit basic', caps: ['i2i', 'inpaint'] },
      { id: 'qwen-image-edit-max', label: 'qwen-image-edit-max', hint: '$0.075/img · Edit max', caps: ['i2i', 'inpaint'] },
      // --- Video ---
      { id: 'wan2.6-t2v', label: 'wan2.6-t2v', hint: '$0.07/s · 1080P · multi-shot · audio', caps: ['t2v', 'audio'], default: true },
      { id: 'wan2.6-i2v', label: 'wan2.6-i2v', hint: '$0.07/s · first/last frame · audio', caps: ['i2v', 'audio'] },
      { id: 'wan2.6-r2v', label: 'wan2.6-r2v', hint: 'Wan 2.6 · reference-to-video', caps: ['r2v', 'audio'] },
      { id: 'wan2.2-animate-move', label: 'wan2.2-animate-move', hint: 'motion transfer · rẻ', caps: ['character-anim'] },
      { id: 'wan2.2-animate-mix', label: 'wan2.2-animate-mix', hint: 'face swap · rẻ', caps: ['character-anim'] },
      { id: 'wan2.7-t2v-2026-04-25', label: 'wan2.7-t2v', hint: '$0.10/s · multi-shot · custom audio', caps: ['t2v', 'audio'] },
      { id: 'wan2.7-i2v-2026-04-25', label: 'wan2.7-i2v', hint: '$0.10/s · first/last frame', caps: ['i2v', 'audio'] },
      { id: 'wan2.7-r2v', label: 'wan2.7-r2v', hint: '$0.10/s · reference-to-video', caps: ['r2v', 'audio'] },
      { id: 'wan2.7-videoedit', label: 'wan2.7-videoedit', hint: '$0.10/s · video editing', caps: ['video-edit'] },
      { id: 'happyhorse-1.0-t2v', label: 'happyhorse-1.0-t2v', hint: '$0.10+/s · 1080P · 15s · audio', caps: ['t2v', 'audio'] },
      { id: 'happyhorse-1.0-i2v', label: 'happyhorse-1.0-i2v', hint: '$0.10+/s · i2v · 1080P', caps: ['i2v', 'audio'] },
      { id: 'happyhorse-1.0-r2v', label: 'happyhorse-1.0-r2v', hint: '$0.10+/s · r2v · consistent chars', caps: ['r2v', 'audio'] },
      { id: 'happyhorse-1.0-video-edit', label: 'happyhorse-1.0-video-edit', hint: '$0.10+/s · style transfer', caps: ['video-edit'] },
      { id: 'wan2.1-vace-plus', label: 'wan2.1-vace-plus', hint: '$0.10/s · all-in-one edit+gen', caps: ['t2v', 'i2v'] },
    ],
  },
  {
    id: 'ckey',
    label: 'CKey',
    hint: 'OpenAI-compatible · TTS giọng Việt · LLM',
    integrated: true,
    defaultBaseUrl: 'https://ckey.vn/v1',
    apiKeyEnv: 'CKEY_API_KEY',
    models: [
      { id: 'thanhnhan9023/gpt-image-2', label: 'gpt-image-2', hint: 'OpenAI-compatible · T2I + Edit', caps: ['t2i'], default: true },
      { id: 'tts-1', label: 'tts-1', hint: 'TTS · giọng Việt', caps: ['tts'], default: true },
    ],
    tts: { model: 'tts-1' },
    llm: { baseUrl: 'https://ckey.vn', defaultModel: 'gpt-4o-mini' },
  },
  {
    id: 'elevenlabs',
    label: 'ElevenLabs',
    hint: 'TTS · SFX · Voice cloning',
    integrated: true,
    defaultBaseUrl: 'https://api.elevenlabs.io',
    docsUrl: 'https://elevenlabs.io/docs',
    apiKeyEnv: 'ELEVENLABS_API_KEY',
    models: [
      { id: 'elevenlabs-v3', label: 'ElevenLabs v3', hint: 'TTS · đa ngôn ngữ · Việt', caps: ['tts'], default: true },
      { id: 'elevenlabs-sfx', label: 'ElevenLabs SFX', hint: 'Sound effects · text-to-sound', caps: ['sfx'] },
    ],
    tts: { model: 'elevenlabs-v3' },
  },
  {
    id: 'stub',
    label: 'Stub (placeholder)',
    hint: 'Deterministic local placeholder bytes',
    integrated: true,
    apiKeyEnv: '',
    models: [],
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare Workers AI',
    hint: 'SDXL · FLUX · DreamShaper · Leonardo',
    integrated: true,
    defaultBaseUrl: 'https://image-generation.minhnhut1999nb.workers.dev',
    apiKeyEnv: 'CLOUDFLARE_API_KEY',
    models: [
      { id: 'cf-sdxl-lightning', label: 'cf-sdxl-lightning', hint: 'SDXL · T2I · free', caps: ['t2i'] },
      { id: 'cf-sd-img2img', label: 'cf-sd-img2img', hint: 'SD 1.5 · Edit', caps: ['i2i'] },
      { id: 'cf-flux-2-klein', label: 'cf-flux-2-klein', hint: 'FLUX.2 · $0.015/img · T2I + Edit', caps: ['t2i', 'i2i'] },
      { id: 'cf-dreamshaper', label: 'cf-dreamshaper', hint: 'DreamShaper · Free · T2I+Edit+Inpaint', caps: ['t2i', 'i2i', 'inpaint'] },
      { id: 'cf-phoenix-1.0', label: 'cf-phoenix-1.0', hint: 'Leonardo · $0.026/img · T2I + text', caps: ['t2i'] },
      { id: 'cf-lucid-origin', label: 'cf-lucid-origin', hint: 'Leonardo · $0.031/img · T2I + 2500px', caps: ['t2i'] },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI-compatible (xah.io)',
    hint: 'Wan 2.7 Image · DashScope · T2I',
    integrated: true,
    defaultBaseUrl: 'https://api.xah.io/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    models: [
      // Text-to-image only (no /images/edits route on this model → no i2i/inpaint).
      // Wire id differs from the clean internal id (see wireModel). All 5 aspects
      // (1:1, 16:9, 9:16, 4:3, 3:4) probed real & confirmed at 2048-class px.
      { id: 'wan2.7-image', label: 'Wan 2.7 Image', hint: 'T2I · 2048px · mọi tỉ lệ', caps: ['t2i'], wireModel: 'phuocanh421994/Wan2.7_Image' },
      { id: 'xah-wan2.7-image-pro', label: 'Wan 2.7 Image Pro', hint: 'T2I · Pro · storyboard multi-panel', caps: ['t2i'], wireModel: 'phuocanh421994/Wan2.7_Image_Pro' },
    ],
  },
];

// --- Derived helpers ---

export function getProvider(id: string): ProviderConfig | undefined {
  return ALL_PROVIDERS.find(p => p.id === id);
}

export function getAllModels(surface: 'image' | 'video' | 'audio'): ProviderModel[] {
  const caps = surface === 'image' ? ['t2i', 'i2i', 'inpaint'] : surface === 'video' ? ['t2v', 'i2v', 'r2v', 'video-edit', 'character-anim', 'audio'] : ['tts'];
  return ALL_PROVIDERS.flatMap(p =>
    p.models.filter(m => m.caps.some(c => caps.includes(c))).map(m => ({ ...m, provider: p.id } as any))
  );
}

export function getImageModels(): ProviderModel[] { return getAllModels('image'); }
export function getVideoModels(): ProviderModel[] { return getAllModels('video'); }
export function getAudioModels(): ProviderModel[] { return getAllModels('audio'); }

export function resolveLlmProvider(): { providerId: string; apiKey: string; baseUrl: string; model: string } | null {
  const providerId = process.env['LLM_PROVIDER'];
  if (!providerId) return null;
  const p = getProvider(providerId);
  if (!p?.llm) return null;
  const apiKey = process.env[p.apiKeyEnv];
  if (!apiKey) return null;
  return {
    providerId,
    apiKey,
    baseUrl: p.llm.baseUrl,
    model: process.env['LLM_MODEL'] || p.llm.defaultModel,
  };
}

// --- SSRF guard for client-supplied LLM baseUrl overrides ------------------
//
// The daemon accepts an admin `llm` override (baseUrl/apiKey) forwarded by
// Laravel from AiSettings — including a fully custom OpenAI-compatible provider
// whose host the admin configures freely. If the daemon is reached directly
// (not through the Laravel proxy), an attacker could set `baseUrl` to an
// internal host and turn /enhance-prompt, /skills/author,
// /storyboard-from-concept into an SSRF primitive.
//
// Design: we DO NOT constrain the host to a name allowlist (that would block
// legitimate Custom-API LLM hosts the admin configures). We block ONLY the
// actual SSRF surface — private / loopback / link-local / cloud-metadata
// targets — and permit ANY public http(s) host.

/** True for hostnames that point at the daemon's own network (SSRF targets). */
function isPrivateHostname(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase(); // strip IPv6 brackets
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  // IPv6 loopback / unspecified / link-local (fe80::/10) / unique-local (fc00::/7)
  if (h === '::1' || h === '::') return true;
  if (/^fe[89ab][0-9a-f]:/i.test(h) || /^f[cd][0-9a-f]{2}:/i.test(h)) return true;
  // IPv4 (dotted quad)
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 0 || a === 10 || a === 127) return true;      // this-host / private-A / loopback
    if (a === 169 && b === 254) return true;                // link-local (incl. cloud metadata 169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true;        // private-B
    if (a === 192 && b === 168) return true;                 // private-C
    if (a === 100 && b >= 64 && b <= 127) return true;       // CGNAT (100.64.0.0/10)
  }
  return false;
}

/**
 * Validate a client-supplied LLM baseUrl. Only http(s) is allowed, and the host
 * must NOT resolve to a private / loopback / link-local / cloud-metadata target
 * (the real SSRF surface). Any public host is permitted so that admin-configured
 * Custom-API LLM providers on arbitrary hosts work without a code/env change.
 */
export function isAllowedLlmBaseUrl(baseUrl: string): boolean {
  let url: URL;
  try { url = new URL(baseUrl); } catch { return false; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  return !isPrivateHostname(url.hostname.toLowerCase());
}

export type ResolvedLlm = { providerId: string; apiKey: string; baseUrl: string; model: string };

/**
 * Resolve the LLM config for a request. Prefers the admin override forwarded by
 * Laravel (AiSettings → LlmConfigResolver); falls back to the daemon's own .env.
 * When a client-supplied override is used, its baseUrl is validated against the
 * host allowlist (SSRF guard) — gemini uses a fixed Google endpoint (not baseUrl)
 * so it is exempt from URL validation. Returns `{ error }` on rejection.
 */
export function resolveRequestLlm(override: any): { llm?: ResolvedLlm; error?: string } {
  if (override && override.apiKey) {
    const providerId = String(override.providerId || 'custom');
    const baseUrl = String(override.baseUrl || '');
    if (providerId !== 'gemini' && !isAllowedLlmBaseUrl(baseUrl)) {
      return { error: `LLM baseUrl không được phép: ${baseUrl || '(trống)'}` };
    }
    return {
      llm: {
        providerId,
        apiKey: String(override.apiKey),
        baseUrl,
        model: String(override.model || 'gpt-4o-mini'),
      },
    };
  }
  const llm = resolveLlmProvider();
  return llm ? { llm } : {};
}

export type ImageModerationConfig = {
  model: string;
  apiKey: string;
  baseUrl: string;
  /** Ordered fallback vision models tried when the primary returns prose/refusal. */
  fallbackModels: string[];
};

/**
 * Default primary vision model for moderation.
 *
 * ⚠️ Must be a model that ACTUALLY performs vision + content classification on
 * this endpoint. `claude-haiku-4.5` on api.xah.io is NOT such a model — it is
 * proxied to a coding assistant ("Kiro") that refuses image analysis with prose
 * ("I appreciate you reaching out…"), which made moderation a silent no-op
 * (extractJsonFromLlm fails → fail-open safe:true → NSFW never blocked). Verified
 * 2026-07-18 via live probe: `openai/gpt-5.6-luna` genuinely sees images
 * (correctly described a test scene) and returns valid `{safe,reason}` JSON on
 * both remote-URL and data-URI inputs. See worklog 2026-07-18-image-moderation-fix.
 */
const DEFAULT_MODERATION_MODEL = 'openai/gpt-5.6-luna';

/**
 * Default fallback chain — tried in order when the primary model returns an
 * unparseable/refusal reply. Kept short and vision-capable. `claude-haiku-4.5`
 * is deliberately EXCLUDED (see above).
 */
const DEFAULT_MODERATION_FALLBACKS = ['openai/gpt-5.6-luna'];

/**
 * Resolve the vision-model config used to moderate community images before they
 * reach the public feed. OpenAI-compatible chat/completions with image_url input
 * (default provider: xah.io). Returns null when disabled or unconfigured — the
 * caller then fails open (does not block publishing).
 *
 * Env:
 * - `IMAGE_MODERATION_ENABLED` — set `0`/`false` to force off. Default: ON when a key exists.
 * - `IMAGE_MODERATION_API_KEY` — vision provider key (falls back to `OPENAI_API_KEY`).
 * - `IMAGE_MODERATION_BASE_URL` — OpenAI-compatible base incl. version path. Default `https://api.xah.io/v1`.
 * - `IMAGE_MODERATION_MODEL` — primary vision model id. Default `openai/gpt-5.6-luna`.
 * - `IMAGE_MODERATION_FALLBACK_MODELS` — comma-separated fallback model ids tried
 *   when the primary returns prose/refusal. Default `openai/gpt-5.6-luna`.
 */
export function resolveImageModerationConfig(): ImageModerationConfig | null {
  const enabledRaw = (process.env['IMAGE_MODERATION_ENABLED'] || '').trim().toLowerCase();
  if (enabledRaw === '0' || enabledRaw === 'false' || enabledRaw === 'off') return null;
  const apiKey = process.env['IMAGE_MODERATION_API_KEY'] || process.env['OPENAI_API_KEY'] || '';
  if (!apiKey) return null; // default-on only when a key is present
  const baseUrl = (process.env['IMAGE_MODERATION_BASE_URL'] || 'https://api.xah.io/v1').replace(/\/+$/, '');
  const model = process.env['IMAGE_MODERATION_MODEL'] || DEFAULT_MODERATION_MODEL;
  const fallbackRaw = (process.env['IMAGE_MODERATION_FALLBACK_MODELS'] || '').trim();
  const fallbackModels = (fallbackRaw ? fallbackRaw.split(',') : DEFAULT_MODERATION_FALLBACKS)
    .map((m) => m.trim())
    .filter((m) => m && m !== model); // de-dupe the primary out of the fallback chain
  return { model, apiKey, baseUrl, fallbackModels };
}

/**
 * Web-search provider for trend grounding (currently Tavily). Returns null when
 * not configured so callers degrade gracefully to LLM-only.
 */
export function resolveSearchProvider(): { provider: string; apiKey: string } | null {
  const provider = process.env['SEARCH_PROVIDER'];
  if (provider !== 'tavily') return null;
  const apiKey = process.env['TAVILY_API_KEY'];
  if (!apiKey) return null;
  return { provider, apiKey };
}

export function resolveTtsProvider(): { providerId: string; model: string } | null {
  const providerId = process.env['TTS_PROVIDER'] || 'ckey';
  const p = getProvider(providerId);
  if (!p?.tts) return null;
  return { providerId, model: p.tts.model };
}

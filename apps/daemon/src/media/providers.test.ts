import { describe, it, expect, afterEach } from 'vitest';
import {
  ALL_PROVIDERS,
  getProvider,
  getAllModels,
  getImageModels,
  getVideoModels,
  getAudioModels,
  resolveLlmProvider,
  resolveTtsProvider,
  isAllowedLlmBaseUrl,
  resolveRequestLlm,
  resolveImageModerationConfig,
} from './providers.js';

describe('ALL_PROVIDERS', () => {
  it('contains expected providers', () => {
    const ids = ALL_PROVIDERS.map(p => p.id);
    expect(ids).toContain('qwencloud');
    expect(ids).toContain('ckey');
    expect(ids).toContain('elevenlabs');
    expect(ids).toContain('cloudflare');
    expect(ids).toContain('stub');
  });

  it('each provider has required fields', () => {
    for (const p of ALL_PROVIDERS) {
      expect(p.id).toBeTruthy();
      expect(p.label).toBeTruthy();
      expect(p.hint).toBeTruthy();
      expect(typeof p.integrated).toBe('boolean');
      expect(p.apiKeyEnv).toBeDefined();
      expect(Array.isArray(p.models)).toBe(true);
    }
  });

  it('qwencloud has image and video models', () => {
    const qwen = getProvider('qwencloud')!;
    expect(qwen).toBeDefined();
    const imageModels = qwen.models.filter(m => m.caps.some(c => ['t2i', 'i2i', 'inpaint'].includes(c)));
    const videoModels = qwen.models.filter(m => m.caps.some(c => ['t2v', 'i2v', 'r2v'].includes(c)));
    expect(imageModels.length).toBeGreaterThan(0);
    expect(videoModels.length).toBeGreaterThan(0);
  });

  it('ckey has TTS and image models', () => {
    const ckey = getProvider('ckey')!;
    expect(ckey).toBeDefined();
    expect(ckey.tts).toBeDefined();
    const ttsModels = ckey.models.filter(m => m.caps.includes('tts'));
    expect(ttsModels.length).toBeGreaterThan(0);
  });

  it('elevenlabs has TTS and SFX models', () => {
    const el = getProvider('elevenlabs')!;
    expect(el).toBeDefined();
    expect(el.tts).toBeDefined();
    const models = el.models.map(m => m.id);
    expect(models).toContain('elevenlabs-v3');
    expect(models).toContain('elevenlabs-sfx');
  });

  it('cloudflare has image models', () => {
    const cf = getProvider('cloudflare')!;
    expect(cf).toBeDefined();
    expect(cf.models.length).toBeGreaterThan(0);
    expect(cf.apiKeyEnv).toBe('CLOUDFLARE_API_KEY');
  });

  it('stub has no models', () => {
    const stub = getProvider('stub')!;
    expect(stub).toBeDefined();
    expect(stub.models).toEqual([]);
  });
});

describe('getProvider', () => {
  it('returns provider by id', () => {
    expect(getProvider('qwencloud')).toBeDefined();
    expect(getProvider('ckey')).toBeDefined();
  });

  it('returns undefined for unknown id', () => {
    expect(getProvider('nonexistent')).toBeUndefined();
  });
});

describe('getAllModels', () => {
  it('returns image models with t2i cap', () => {
    const imageModels = getAllModels('image');
    expect(imageModels.length).toBeGreaterThan(0);
    for (const m of imageModels) {
      expect(m.caps.some(c => ['t2i', 'i2i', 'inpaint'].includes(c))).toBe(true);
    }
  });

  it('returns video models with t2v/i2v/r2v cap', () => {
    const videoModels = getAllModels('video');
    expect(videoModels.length).toBeGreaterThan(0);
    for (const m of videoModels) {
      expect(m.caps.some(c => ['t2v', 'i2v', 'r2v', 'video-edit', 'character-anim', 'audio'].includes(c))).toBe(true);
    }
  });

  it('returns audio models with tts cap', () => {
    const audioModels = getAllModels('audio');
    expect(audioModels.length).toBeGreaterThan(0);
    for (const m of audioModels) {
      expect(m.caps.some(c => ['tts'].includes(c))).toBe(true);
    }
  });
});

describe('getImageModels / getVideoModels / getAudioModels', () => {
  it('getImageModels returns non-empty array', () => {
    expect(getImageModels().length).toBeGreaterThan(0);
  });

  it('getVideoModels returns non-empty array', () => {
    expect(getVideoModels().length).toBeGreaterThan(0);
  });

  it('getAudioModels returns non-empty array', () => {
    expect(getAudioModels().length).toBeGreaterThan(0);
  });
});

describe('resolveLlmProvider', () => {
  it('returns null when LLM_PROVIDER is not set', () => {
    delete process.env.LLM_PROVIDER;
    expect(resolveLlmProvider()).toBeNull();
  });

  it('returns null when provider has no LLM config', () => {
    process.env.LLM_PROVIDER = 'stub';
    expect(resolveLlmProvider()).toBeNull();
  });

  it('returns config when LLM_PROVIDER is set to ckey with API key', () => {
    process.env.LLM_PROVIDER = 'ckey';
    process.env.CKEY_API_KEY = 'test-key';
    const result = resolveLlmProvider();
    expect(result).not.toBeNull();
    expect(result?.providerId).toBe('ckey');
    expect(result?.apiKey).toBe('test-key');
    expect(result?.baseUrl).toBe('https://ckey.vn');
    expect(result?.model).toBe('gpt-4o-mini');
  });

  it('returns null when API key is missing', () => {
    process.env.LLM_PROVIDER = 'ckey';
    delete process.env.CKEY_API_KEY;
    expect(resolveLlmProvider()).toBeNull();
  });
});

describe('isAllowedLlmBaseUrl (SSRF guard)', () => {
  it('allows known provider hosts', () => {
    expect(isAllowedLlmBaseUrl('https://ckey.vn')).toBe(true);
    expect(isAllowedLlmBaseUrl('https://api.openai.com/v1')).toBe(true);
    expect(isAllowedLlmBaseUrl('https://openrouter.ai')).toBe(true);
  });

  it('rejects loopback and private-network hosts', () => {
    expect(isAllowedLlmBaseUrl('http://localhost:8000')).toBe(false);
    expect(isAllowedLlmBaseUrl('http://127.0.0.1')).toBe(false);
    expect(isAllowedLlmBaseUrl('http://10.0.0.5/v1')).toBe(false);
    expect(isAllowedLlmBaseUrl('http://172.16.4.2')).toBe(false);
    expect(isAllowedLlmBaseUrl('http://192.168.1.10')).toBe(false);
    expect(isAllowedLlmBaseUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isAllowedLlmBaseUrl('http://100.100.0.1')).toBe(false);
    expect(isAllowedLlmBaseUrl('http://[::1]')).toBe(false);
  });

  it('allows arbitrary public hosts (Custom-API LLM providers)', () => {
    // Design change: no name allowlist — any public host an admin configures is
    // permitted; only private/loopback/link-local targets are the SSRF surface.
    expect(isAllowedLlmBaseUrl('https://evil.example.com/v1')).toBe(true);
    expect(isAllowedLlmBaseUrl('https://llm.mycorp.example/v1')).toBe(true);
    expect(isAllowedLlmBaseUrl('https://api.xah.io/v1')).toBe(true);
  });

  it('rejects non-http(s) protocols and malformed URLs', () => {
    expect(isAllowedLlmBaseUrl('file:///etc/passwd')).toBe(false);
    expect(isAllowedLlmBaseUrl('gopher://ckey.vn')).toBe(false);
    expect(isAllowedLlmBaseUrl('not-a-url')).toBe(false);
    expect(isAllowedLlmBaseUrl('')).toBe(false);
  });
});

describe('resolveRequestLlm', () => {
  it('rejects a client override pointing at an internal host', () => {
    const { llm, error } = resolveRequestLlm({ apiKey: 'k', baseUrl: 'http://169.254.169.254', model: 'x' });
    expect(llm).toBeUndefined();
    expect(error).toBeTruthy();
  });

  it('accepts a client override on an allowed provider host', () => {
    const { llm, error } = resolveRequestLlm({ apiKey: 'k', baseUrl: 'https://api.openai.com', model: 'gpt-4o' });
    expect(error).toBeUndefined();
    expect(llm?.baseUrl).toBe('https://api.openai.com');
    expect(llm?.apiKey).toBe('k');
  });

  it('exempts gemini overrides from baseUrl validation (fixed Google endpoint)', () => {
    const { llm, error } = resolveRequestLlm({ providerId: 'gemini', apiKey: 'k', baseUrl: '' });
    expect(error).toBeUndefined();
    expect(llm?.providerId).toBe('gemini');
  });

  it('falls back to .env when no override is supplied', () => {
    process.env.LLM_PROVIDER = 'ckey';
    process.env.CKEY_API_KEY = 'env-key';
    const { llm, error } = resolveRequestLlm(undefined);
    expect(error).toBeUndefined();
    expect(llm?.providerId).toBe('ckey');
    expect(llm?.apiKey).toBe('env-key');
  });
});

describe('resolveImageModerationConfig', () => {
  const saved = { ...process.env };
  afterEach(() => {
    for (const k of ['IMAGE_MODERATION_ENABLED', 'IMAGE_MODERATION_API_KEY', 'IMAGE_MODERATION_MODEL', 'IMAGE_MODERATION_BASE_URL', 'IMAGE_MODERATION_FALLBACK_MODELS', 'OPENAI_API_KEY']) {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
    }
  });

  it('returns null when no API key is available (default-on needs a key)', () => {
    delete process.env.IMAGE_MODERATION_API_KEY;
    delete process.env.OPENAI_API_KEY;
    expect(resolveImageModerationConfig()).toBeNull();
  });

  it('is enabled by default when a key is present, with xah.io + a VISION-capable model default', () => {
    delete process.env.IMAGE_MODERATION_ENABLED;
    process.env.IMAGE_MODERATION_API_KEY = 'sk-test';
    delete process.env.IMAGE_MODERATION_MODEL;
    delete process.env.IMAGE_MODERATION_BASE_URL;
    const cfg = resolveImageModerationConfig();
    expect(cfg).not.toBeNull();
    expect(cfg?.apiKey).toBe('sk-test');
    expect(cfg?.baseUrl).toBe('https://api.xah.io/v1');
    // Default must NOT be claude-haiku-4.5 — on xah.io that id proxies to a coding
    // assistant that refuses image analysis (prose), making moderation a no-op.
    expect(cfg?.model).toBe('openai/gpt-5.6-luna');
    expect(cfg?.model).not.toBe('claude-haiku-4.5');
  });

  it('exposes a fallback model chain, de-duped against the primary', () => {
    process.env.IMAGE_MODERATION_API_KEY = 'sk-test';
    delete process.env.IMAGE_MODERATION_MODEL;
    delete process.env.IMAGE_MODERATION_FALLBACK_MODELS;
    // Default primary == default fallback → de-duped to an empty chain.
    expect(resolveImageModerationConfig()?.fallbackModels).toEqual([]);

    process.env.IMAGE_MODERATION_MODEL = 'primary-vision';
    process.env.IMAGE_MODERATION_FALLBACK_MODELS = 'a, b ,primary-vision, ';
    const cfg = resolveImageModerationConfig();
    // Trimmed, empties dropped, primary removed from the chain.
    expect(cfg?.fallbackModels).toEqual(['a', 'b']);
  });

  it('falls back to OPENAI_API_KEY when no dedicated key set', () => {
    delete process.env.IMAGE_MODERATION_API_KEY;
    process.env.OPENAI_API_KEY = 'sk-openai';
    expect(resolveImageModerationConfig()?.apiKey).toBe('sk-openai');
  });

  it('honors explicit disable and custom model/base', () => {
    process.env.IMAGE_MODERATION_API_KEY = 'sk-test';
    process.env.IMAGE_MODERATION_ENABLED = '0';
    expect(resolveImageModerationConfig()).toBeNull();
    process.env.IMAGE_MODERATION_ENABLED = 'true';
    process.env.IMAGE_MODERATION_MODEL = 'openai/gpt-5.6-luna';
    process.env.IMAGE_MODERATION_BASE_URL = 'https://api.xah.io/v1/';
    const cfg = resolveImageModerationConfig();
    expect(cfg?.model).toBe('openai/gpt-5.6-luna');
    expect(cfg?.baseUrl).toBe('https://api.xah.io/v1'); // trailing slash trimmed
  });
});

describe('resolveTtsProvider', () => {
  it('defaults to ckey', () => {
    delete process.env.TTS_PROVIDER;
    const result = resolveTtsProvider();
    expect(result).not.toBeNull();
    expect(result?.providerId).toBe('ckey');
  });

  it('returns elevenlabs when TTS_PROVIDER is set', () => {
    process.env.TTS_PROVIDER = 'elevenlabs';
    const result = resolveTtsProvider();
    expect(result).not.toBeNull();
    expect(result?.providerId).toBe('elevenlabs');
    expect(result?.model).toBe('elevenlabs-v3');
  });
});

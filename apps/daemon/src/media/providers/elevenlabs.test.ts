import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderElevenLabsTTS, renderElevenLabsSFX } from './elevenlabs.js';
import type { MediaContext, ProviderConfig } from '../types.js';

function makeCtx(overrides: Partial<MediaContext> = {}): MediaContext {
  return {
    surface: 'audio',
    model: 'elevenlabs-v3',
    wireModel: 'elevenlabs-v3',
    modelDef: { id: 'elevenlabs-v3', label: 'ElevenLabs v3', hint: '', provider: 'elevenlabs', caps: ['tts'] },
    provider: null,
    prompt: 'Hello world',
    aspect: undefined,
    length: undefined,
    duration: 10,
    voice: 'vi-VN-NamMinhNeural',
    audioKind: 'speech',
    language: '',
    loop: false,
    promptInfluence: undefined,
    compositionDir: null,
    imageRef: null,
    videoRef: null,
    lastFrameRef: null,
    ...overrides,
  };
}

function makeCreds(overrides: Partial<ProviderConfig> = {}): ProviderConfig {
  return { apiKey: 'test-elevenlabs-key', baseUrl: 'https://api.elevenlabs.io', ...overrides };
}

describe('renderElevenLabsTTS', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws when no API key', async () => {
    const ctx = makeCtx();
    await expect(renderElevenLabsTTS(ctx, { apiKey: '' })).rejects.toThrow('no ElevenLabs API key');
  });

  it('sends correct request to TTS endpoint', async () => {
    const fakeBytes = new Uint8Array([0xff, 0xfb, 0x90, 0x44]);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeBytes.buffer),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeCtx({ prompt: 'Xin chào', voice: 'vi-VN-NamMinhNeural' });
    const result = await renderElevenLabsTTS(ctx, makeCreds());

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/v1/text-to-speech/');
    expect(options.method).toBe('POST');
    expect(options.headers['xi-api-key']).toBe('test-elevenlabs-key');
    expect(options.headers['Accept']).toBe('audio/mpeg');

    const body = JSON.parse(options.body);
    expect(body.text).toBe('Xin chào');
    expect(body.model_id).toBe('eleven_v3');

    expect(result.bytes).toBeInstanceOf(Buffer);
    expect(result.suggestedExt).toBe('.mp3');
    expect(result.providerNote).toContain('elevenlabs/');
  });

  it('uses default voice when none specified', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeCtx({ voice: '' });
    await renderElevenLabsTTS(ctx, makeCreds());
    const url = mockFetch.mock.calls[0][0];
    // Should use default voice ID (21m00Tcm4TlvDq8ikWAM)
    expect(url).toContain('/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM');
  });

  it('throws on non-OK response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('rate limited'),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeCtx();
    await expect(renderElevenLabsTTS(ctx, makeCreds())).rejects.toThrow('elevenlabs tts 429');
  });

  it('throws on empty response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeCtx();
    await expect(renderElevenLabsTTS(ctx, makeCreds())).rejects.toThrow('zero bytes');
  });
});

describe('renderElevenLabsSFX', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws when no API key', async () => {
    const ctx = makeCtx({ model: 'elevenlabs-sfx', wireModel: 'elevenlabs-sfx' });
    await expect(renderElevenLabsSFX(ctx, { apiKey: '' })).rejects.toThrow('no ElevenLabs API key');
  });

  it('throws when prompt is empty', async () => {
    const ctx = makeCtx({ prompt: '', model: 'elevenlabs-sfx', wireModel: 'elevenlabs-sfx' });
    await expect(renderElevenLabsSFX(ctx, makeCreds())).rejects.toThrow('prompt must not be empty');
  });

  it('sends correct request to sound-generation endpoint', async () => {
    const fakeBytes = new Uint8Array([0xff, 0xfb, 0x90, 0x44]);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeBytes.buffer),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeCtx({
      prompt: 'thunder rumbling',
      model: 'elevenlabs-sfx',
      wireModel: 'elevenlabs-sfx',
      duration: 5,
    });
    const result = await renderElevenLabsSFX(ctx, makeCreds());

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/v1/sound-generation');

    const body = JSON.parse(options.body);
    expect(body.text).toBe('thunder rumbling');
    expect(body.duration_seconds).toBe(5);

    expect(result.bytes).toBeInstanceOf(Buffer);
    expect(result.suggestedExt).toBe('.mp3');
  });

  it('throws on non-OK response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('internal error'),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeCtx({ prompt: 'test', model: 'elevenlabs-sfx', wireModel: 'elevenlabs-sfx' });
    await expect(renderElevenLabsSFX(ctx, makeCreds())).rejects.toThrow('elevenlabs sfx 500');
  });
});

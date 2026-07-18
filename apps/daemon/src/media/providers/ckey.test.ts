import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderCKeyTTS, renderCKeyImage } from './ckey.js';
import type { MediaContext, ProviderConfig } from '../types.js';

function makeCtx(overrides: Partial<MediaContext> = {}): MediaContext {
  return {
    surface: 'image',
    model: 'test-model',
    wireModel: 'gpt-image-2',
    modelDef: { id: 'test', label: 'Test', hint: '', provider: 'ckey', caps: ['t2i'] },
    provider: null,
    prompt: 'a beautiful sunset',
    aspect: '1:1',
    length: undefined,
    duration: undefined,
    voice: '',
    audioKind: undefined,
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
  return { apiKey: 'test-api-key', baseUrl: 'https://ckey.vn/v1', ...overrides };
}

describe('renderCKeyTTS', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws when no API key', async () => {
    const ctx = makeCtx({ surface: 'audio' });
    await expect(renderCKeyTTS(ctx, { apiKey: '' })).rejects.toThrow('no CKey API key');
  });

  it('sends correct request body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeCtx({ surface: 'audio', voice: 'vi-VN-NamMinhNeural', prompt: 'Xin chào' });
    await renderCKeyTTS(ctx, makeCreds());

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://ckey.vn/v1/audio/speech');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body);
    expect(body.model).toBe('vi-VN-NamMinhNeural');
    expect(body.input).toBe('Xin chào');
    expect(body.format).toBe('mp3');
  });

  it('returns bytes and provider note on success', async () => {
    const fakeBytes = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeBytes.buffer),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeCtx({ surface: 'audio' });
    const result = await renderCKeyTTS(ctx, makeCreds());
    expect(result.bytes).toBeInstanceOf(Buffer);
    expect(result.bytes.length).toBe(4);
    expect(result.providerNote).toContain('ckey/');
    expect(result.suggestedExt).toBe('.mp3');
  });

  it('throws on non-OK response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('unauthorized'),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeCtx({ surface: 'audio' });
    await expect(renderCKeyTTS(ctx, makeCreds())).rejects.toThrow('ckey tts 401');
  });

  it('throws on empty response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeCtx({ surface: 'audio' });
    await expect(renderCKeyTTS(ctx, makeCreds())).rejects.toThrow('zero bytes');
  });

  it('defaults voice to vi-VN-NamMinhNeural', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeCtx({ surface: 'audio', voice: '' });
    await renderCKeyTTS(ctx, makeCreds());
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('vi-VN-NamMinhNeural');
  });
});

describe('renderCKeyImage', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws when no API key', async () => {
    const ctx = makeCtx();
    await expect(renderCKeyImage(ctx, { apiKey: '' })).rejects.toThrow('no CKey API key');
  });

  it('sends correct request for t2i', async () => {
    const fakeB64 = Buffer.from('fake-image-data').toString('base64');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: [{ b64_json: fakeB64 }] })),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeCtx({ aspect: '16:9' });
    const result = await renderCKeyImage(ctx, makeCreds());
    expect(result.bytes).toBeInstanceOf(Buffer);
    expect(result.suggestedExt).toBe('.png');
  });

  it('maps aspect ratio to size correctly', async () => {
    const fakeB64 = Buffer.from('data').toString('base64');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: [{ b64_json: fakeB64 }] })),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeCtx({ aspect: '9:16' });
    await renderCKeyImage(ctx, makeCreds());
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.size).toBe('1024x1792');
  });

  it('handles URL response by fetching image', async () => {
    const fakeImageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: [{ url: 'https://example.com/img.png' }] })),
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeImageBytes.buffer),
      });
    globalThis.fetch = mockFetch;

    const ctx = makeCtx();
    const result = await renderCKeyImage(ctx, makeCreds());
    expect(result.bytes).toBeInstanceOf(Buffer);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws on non-OK response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('server error'),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeCtx();
    await expect(renderCKeyImage(ctx, makeCreds())).rejects.toThrow('ckey image 500');
  });

  it('throws when response missing image data', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: [{}] })),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeCtx();
    await expect(renderCKeyImage(ctx, makeCreds())).rejects.toThrow('missing image data');
  });
});

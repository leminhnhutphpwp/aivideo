import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderCloudflareImage } from './cloudflare.js';
import type { MediaContext, ProviderConfig } from '../types.js';

function makeCtx(overrides: Partial<MediaContext> = {}): MediaContext {
  return {
    surface: 'image',
    model: 'cf-sdxl-lightning',
    wireModel: 'cf-sdxl-lightning',
    modelDef: {
      id: 'cf-sdxl-lightning', label: 'cf-sdxl-lightning', hint: '',
      provider: 'cloudflare', caps: ['t2i'],
    },
    provider: null,
    prompt: 'a beautiful mountain landscape',
    aspect: '16:9',
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
  return {
    apiKey: 'test-cf-key',
    baseUrl: 'https://image-generation.minhnhut1999nb.workers.dev',
    ...overrides,
  };
}

describe('renderCloudflareImage', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws when no API key', async () => {
    const ctx = makeCtx();
    await expect(renderCloudflareImage(ctx, { apiKey: '' })).rejects.toThrow('no Cloudflare API key');
  });

  it('sends JSON body for t2i request', async () => {
    const fakeBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // JPEG header
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeBytes.buffer),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeCtx({ prompt: 'mountain sunset' });
    const result = await renderCloudflareImage(ctx, makeCreds());

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('image-generation');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('Bearer test-cf-key');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body);
    expect(body.prompt).toBe('mountain sunset');
    expect(body.model).toBe('cf-sdxl-lightning');

    expect(result.bytes).toBeInstanceOf(Buffer);
    expect(result.suggestedExt).toBe('.jpg');
    expect(result.providerNote).toContain('cloudflare/cf-sdxl-lightning');
  });

  it('defaults prompt when empty', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeCtx({ prompt: '' });
    await renderCloudflareImage(ctx, makeCreds());
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.prompt).toBe('A beautiful image');
  });

  it('throws on non-OK response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve('forbidden'),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeCtx();
    await expect(renderCloudflareImage(ctx, makeCreds())).rejects.toThrow('cloudflare t2i 403');
  });

  it('throws on empty response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    });
    globalThis.fetch = mockFetch;

    const ctx = makeCtx();
    await expect(renderCloudflareImage(ctx, makeCreds())).rejects.toThrow('zero bytes');
  });
});

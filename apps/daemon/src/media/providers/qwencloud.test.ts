import { describe, it, expect, vi, afterEach } from 'vitest';
import { batchQueryTasks, renderQwenCloudImage, renderQwenCloudVideo, pollTaskBatched } from './qwencloud.js';
import type { ProviderConfig, MediaContext } from '../types.js';

vi.mock('../render-utils.js', () => ({
  truncate: (s: string, _max: number) => s,
  sleep: vi.fn().mockResolvedValue(undefined),
}));

function makeCreds(overrides: Partial<ProviderConfig> = {}): ProviderConfig {
  return {
    apiKey: 'test-qwen-key',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/api/v1',
    ...overrides,
  };
}

function makeVideoCtx(overrides: Partial<MediaContext> = {}): MediaContext {
  return {
    surface: 'video',
    model: 'wan2.1-t2v-720p',
    wireModel: 'wan2.1-t2v-720p',
    modelDef: {} as any,
    provider: null,
    prompt: 'A cat walking',
    aspect: '16:9',
    length: 5,
    duration: 5,
    voice: '',
    audioKind: undefined,
    language: 'vi',
    loop: false,
    promptInfluence: undefined,
    compositionDir: null,
    imageRef: null,
    videoRef: null,
    lastFrameRef: null,
    ...overrides,
  };
}

function makeImageCtx(overrides: Partial<MediaContext> = {}): MediaContext {
  return {
    surface: 'image',
    model: 'qwen-image-v1',
    wireModel: 'qwen-image-v1',
    modelDef: {} as any,
    provider: null,
    prompt: 'A scenic mountain',
    aspect: '16:9',
    length: undefined,
    duration: undefined,
    voice: '',
    audioKind: undefined,
    language: 'vi',
    loop: false,
    promptInfluence: undefined,
    compositionDir: null,
    imageRef: null,
    videoRef: null,
    lastFrameRef: null,
    ...overrides,
  };
}

function jsonResponse(data: any) {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
  };
}

function errorResponse(status: number, data: any = {}) {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
  };
}

function downloadResponse(sizeBytes = 1024) {
  return {
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(sizeBytes)),
  };
}

describe('batchQueryTasks', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches batch task results', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({
      output: {
        results: [
          { task_id: 'task-1', task_status: 'SUCCEEDED', task_output: { video_url: 'http://example.com/v1.mp4' } },
          { task_id: 'task-2', task_status: 'RUNNING' },
        ],
      },
    }));

    const results = await batchQueryTasks(['task-1', 'task-2'], makeCreds());
    expect(results.size).toBe(2);
    expect(results.get('task-1')?.status).toBe('SUCCEEDED');
    expect(results.get('task-2')?.status).toBe('RUNNING');

    const [url, options] = (globalThis.fetch as any).mock.calls[0];
    expect(url).toContain('tasks/?task_id=task-1,task-2');
    expect(options.headers['Authorization']).toBe('Bearer test-qwen-key');
  });

  it('throws on non-OK response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(errorResponse(401));
    await expect(batchQueryTasks(['task-1'], makeCreds())).rejects.toThrow('batch query failed: 401');
  });

  it('returns empty map when no results', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ output: { results: [] } }));
    const results = await batchQueryTasks([], makeCreds());
    expect(results.size).toBe(0);
  });
});

describe('renderQwenCloudImage', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws when no API key is provided', async () => {
    const ctx = makeImageCtx();
    await expect(renderQwenCloudImage(ctx, makeCreds({ apiKey: '' }))).rejects.toThrow('no Qwen Cloud API key');
  });

  it('calls sync multimodal endpoint for qwen-image models', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        output: {
          choices: [{ message: { content: [{ image: 'http://example.com/generated.png' }] } }],
        },
      }))
      .mockResolvedValueOnce(downloadResponse());

    const ctx = makeImageCtx({ model: 'qwen-image-v1', wireModel: 'qwen-image-v1' });
    const result = await renderQwenCloudImage(ctx, makeCreds());

    expect(result.bytes).toBeDefined();
    expect(result.bytes.length).toBeGreaterThan(0);
    expect(result.suggestedExt).toBe('.png');

    const [url, options] = (globalThis.fetch as any).mock.calls[0];
    expect(url).toContain('/services/aigc/multimodal-generation/generation');
    expect(options.method).toBe('POST');
    expect(options.headers['authorization']).toBe('Bearer test-qwen-key');
  });

  it('sends correct size parameter based on aspect ratio', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        output: {
          choices: [{ message: { content: [{ image: 'http://example.com/img.png' }] } }],
        },
      }))
      .mockResolvedValueOnce(downloadResponse());

    const ctx = makeImageCtx({ model: 'qwen-image-v1', wireModel: 'qwen-image-v1', aspect: '16:9' });
    await renderQwenCloudImage(ctx, makeCreds());

    const [, options] = (globalThis.fetch as any).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.parameters.size).toBe('1664*928');
  });

  it('throws on API error response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(errorResponse(500, { message: 'Internal error' }));
    const ctx = makeImageCtx({ model: 'qwen-image-v1', wireModel: 'qwen-image-v1' });
    await expect(renderQwenCloudImage(ctx, makeCreds())).rejects.toThrow('qwencloud image 500');
  });

  it('throws on non-JSON response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('not-json'),
    });
    const ctx = makeImageCtx({ model: 'qwen-image-v1', wireModel: 'qwen-image-v1' });
    await expect(renderQwenCloudImage(ctx, makeCreds())).rejects.toThrow('qwencloud image non-JSON');
  });

  it('throws when image URL is missing from response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({
      output: { choices: [{ message: { content: [] } }] },
    }));
    const ctx = makeImageCtx({ model: 'qwen-image-v1', wireModel: 'qwen-image-v1' });
    await expect(renderQwenCloudImage(ctx, makeCreds())).rejects.toThrow('qwencloud image response missing image URL');
  });

  it('throws for unsupported model', async () => {
    const ctx = makeImageCtx({ model: 'unknown-model', wireModel: 'unknown-model' });
    await expect(renderQwenCloudImage(ctx, makeCreds())).rejects.toThrow('unsupported model');
  });
});

describe('renderQwenCloudVideo', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws when no API key is provided', async () => {
    const ctx = makeVideoCtx();
    await expect(renderQwenCloudVideo(ctx, makeCreds({ apiKey: '' }))).rejects.toThrow('no Qwen Cloud API key');
  });

  it('creates async task and polls for completion', async () => {
    let callIdx = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return jsonResponse({ output: { task_id: 'task-abc-123' } });
      if (callIdx === 2) return jsonResponse({ output: { task_status: 'RUNNING' } });
      if (callIdx <= 4) return jsonResponse({ output: { task_status: 'SUCCEEDED', video_url: 'http://example.com/video.mp4' } });
      return downloadResponse(2048);
    });

    const ctx = makeVideoCtx();
    const result = await renderQwenCloudVideo(ctx, makeCreds());

    expect(result.bytes).toBeDefined();
    expect(result.suggestedExt).toBe('.mp4');
    const [createUrl] = (globalThis.fetch as any).mock.calls[0];
    expect(createUrl).toContain('/services/aigc/video-generation/video-synthesis');
  }, 10000);

  it('sends correct parameters for wan2.1 t2v model', async () => {
    let callIdx = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return jsonResponse({ output: { task_id: 'task-xyz' } });
      if (callIdx <= 3) return jsonResponse({ output: { task_status: 'SUCCEEDED', video_url: 'http://example.com/v.mp4' } });
      return downloadResponse(1024);
    });

    const ctx = makeVideoCtx({ model: 'wan2.1-t2v-720p', wireModel: 'wan2.1-t2v-720p', aspect: '16:9', length: 5 });
    await renderQwenCloudVideo(ctx, makeCreds());

    const [, options] = (globalThis.fetch as any).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.model).toBe('wan2.1-t2v-720p');
    expect(body.parameters.resolution).toBe('720P');
    expect(body.parameters.duration).toBe(5);
    expect(body.input.prompt).toBe('A cat walking');
    expect(options.headers['x-dashscope-async']).toBe('enable');
  }, 10000);

  it('throws on task creation failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(errorResponse(403, { message: 'Forbidden' }));
    const ctx = makeVideoCtx();
    await expect(renderQwenCloudVideo(ctx, makeCreds())).rejects.toThrow('qwencloud task create 403');
  });

  it('throws when task_id is missing from response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ output: {} }));
    const ctx = makeVideoCtx();
    await expect(renderQwenCloudVideo(ctx, makeCreds())).rejects.toThrow('qwencloud task response missing output.task_id');
  });

  it('throws on non-JSON task response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('html-error-page'),
    });
    const ctx = makeVideoCtx();
    await expect(renderQwenCloudVideo(ctx, makeCreds())).rejects.toThrow('qwencloud non-JSON');
  });

  it('throws when task fails with error message', async () => {
    let callIdx = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return jsonResponse({ output: { task_id: 'task-fail' } });
      return jsonResponse({ output: { task_status: 'FAILED', message: 'Content safety violation' } });
    });

    const ctx = makeVideoCtx();
    await expect(renderQwenCloudVideo(ctx, makeCreds())).rejects.toThrow('qwencloud task FAILED');
  }, 10000);

  it('includes negative prompt when provided', async () => {
    let callIdx = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return jsonResponse({ output: { task_id: 'task-neg' } });
      if (callIdx <= 3) return jsonResponse({ output: { task_status: 'SUCCEEDED', video_url: 'http://example.com/v.mp4' } });
      return downloadResponse(1024);
    });

    const ctx = makeVideoCtx({ negativePrompt: 'blurry, low quality' });
    await renderQwenCloudVideo(ctx, makeCreds());

    const [, options] = (globalThis.fetch as any).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.input.negative_prompt).toBe('blurry, low quality');
  }, 10000);

  it('sets seed parameter when provided', async () => {
    let callIdx = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return jsonResponse({ output: { task_id: 'task-seed' } });
      if (callIdx <= 3) return jsonResponse({ output: { task_status: 'SUCCEEDED', video_url: 'http://example.com/v.mp4' } });
      return downloadResponse(1024);
    });

    const ctx = makeVideoCtx({ seed: 42 });
    await renderQwenCloudVideo(ctx, makeCreds());

    const [, options] = (globalThis.fetch as any).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.parameters.seed).toBe(42);
  }, 10000);
});

describe('renderQwenCloudVideo — FLF (first/last frame) contract', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function makeRef(overrides: Partial<import('../types.js').ImageRef> = {}): import('../types.js').ImageRef {
    return {
      path: 'first.png',
      abs: 'https://cdn.example.com/first.png',
      mime: 'image/png',
      size: 1234,
      ...overrides,
    };
  }

  // Mock: call 1 = task create, subsequent = SUCCEEDED poll, then download.
  function mockCreateAndSucceed(videoUrl = 'http://example.com/flf.mp4') {
    let callIdx = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return jsonResponse({ output: { task_id: 'task-flf' } });
      if (callIdx <= 3) return jsonResponse({ output: { task_status: 'SUCCEEDED', video_url: videoUrl } });
      return downloadResponse(2048);
    });
  }

  function createBody() {
    const [, options] = (globalThis.fetch as any).mock.calls[0];
    return JSON.parse(options.body);
  }

  it('wan2.7-i2v: sends BOTH first_frame and last_frame in input.media with correct URLs', async () => {
    mockCreateAndSucceed();
    const firstRef = makeRef({ abs: 'https://cdn.example.com/old-house.png' });
    const lastRef = makeRef({ path: 'last.png', abs: 'https://cdn.example.com/restored-house.png' });

    const ctx = makeVideoCtx({
      model: 'wan2.7-i2v-2026-04-25',
      wireModel: 'wan2.7-i2v-2026-04-25',
      imageRef: firstRef,
      lastFrameRef: lastRef,
    });
    const result = await renderQwenCloudVideo(ctx, makeCreds());

    expect(result.suggestedExt).toBe('.mp4');
    const body = createBody();
    expect(body.model).toBe('wan2.7-i2v-2026-04-25');
    expect(Array.isArray(body.input.media)).toBe(true);

    const first = body.input.media.find((m: any) => m.type === 'first_frame');
    const last = body.input.media.find((m: any) => m.type === 'last_frame');
    expect(first).toBeDefined();
    expect(first.url).toBe('https://cdn.example.com/old-house.png');
    expect(last).toBeDefined();
    expect(last.url).toBe('https://cdn.example.com/restored-house.png');

    // Endpoint = standard video-generation synthesis (not image2video)
    const [createUrl] = (globalThis.fetch as any).mock.calls[0];
    expect(createUrl).toContain('/services/aigc/video-generation/video-synthesis');
  }, 10000);

  it('wan2.7-i2v: prefers dataUrl over abs for frame URLs', async () => {
    mockCreateAndSucceed();
    const firstRef = makeRef({ abs: 'https://cdn.example.com/first.png', dataUrl: 'data:image/png;base64,FIRST' });
    const lastRef = makeRef({ abs: 'https://cdn.example.com/last.png', dataUrl: 'data:image/png;base64,LAST' });

    const ctx = makeVideoCtx({
      model: 'wan2.7-i2v-2026-04-25',
      wireModel: 'wan2.7-i2v-2026-04-25',
      imageRef: firstRef,
      lastFrameRef: lastRef,
    });
    await renderQwenCloudVideo(ctx, makeCreds());

    const body = createBody();
    expect(body.input.media.find((m: any) => m.type === 'first_frame').url).toBe('data:image/png;base64,FIRST');
    expect(body.input.media.find((m: any) => m.type === 'last_frame').url).toBe('data:image/png;base64,LAST');
  }, 10000);

  it('wan2.7-i2v: omits last_frame when only first frame is provided (i2v, not FLF)', async () => {
    mockCreateAndSucceed();
    const ctx = makeVideoCtx({
      model: 'wan2.7-i2v-2026-04-25',
      wireModel: 'wan2.7-i2v-2026-04-25',
      imageRef: makeRef(),
      lastFrameRef: null,
    });
    await renderQwenCloudVideo(ctx, makeCreds());

    const body = createBody();
    expect(body.input.media).toHaveLength(1);
    expect(body.input.media[0].type).toBe('first_frame');
    expect(body.input.media.some((m: any) => m.type === 'last_frame')).toBe(false);
  }, 10000);

  it('wan2.2 kf2v: sends first_frame_url and last_frame_url via image2video endpoint', async () => {
    mockCreateAndSucceed();
    const firstRef = makeRef({ abs: 'https://cdn.example.com/kf-first.png' });
    const lastRef = makeRef({ path: 'last.png', abs: 'https://cdn.example.com/kf-last.png' });

    const ctx = makeVideoCtx({
      model: 'wan2.2-kf2v-flf-1080p',
      wireModel: 'wan2.2-kf2v-flf-1080p',
      imageRef: firstRef,
      lastFrameRef: lastRef,
    });
    await renderQwenCloudVideo(ctx, makeCreds());

    const body = createBody();
    expect(body.input.first_frame_url).toBe('https://cdn.example.com/kf-first.png');
    expect(body.input.last_frame_url).toBe('https://cdn.example.com/kf-last.png');

    // kf2v uses the image2video synthesis endpoint
    const [createUrl] = (globalThis.fetch as any).mock.calls[0];
    expect(createUrl).toContain('/services/aigc/image2video/video-synthesis');
  }, 10000);

  it('wan2.6-i2v: sends first frame via input.img_url (first-frame-only branch)', async () => {
    mockCreateAndSucceed();
    const firstRef = makeRef({ abs: 'https://cdn.example.com/w26-first.png' });
    const lastRef = makeRef({ path: 'last.png', abs: 'https://cdn.example.com/w26-last.png' });

    const ctx = makeVideoCtx({
      model: 'wan2.6-i2v',
      wireModel: 'wan2.6-i2v',
      imageRef: firstRef,
      lastFrameRef: lastRef,
    });
    await renderQwenCloudVideo(ctx, makeCreds());

    const body = createBody();
    expect(body.input.img_url).toBe('https://cdn.example.com/w26-first.png');
    // wan2.6 i2v supports first frame only — no last_frame plumbing on this branch
    expect(body.input.media).toBeUndefined();
    expect(body.input.last_frame_url).toBeUndefined();
  }, 10000);
});

describe('pollTaskBatched', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('resolves with task status from batch query', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({
      output: {
        results: [
          { task_id: 'batch-task-1', task_status: 'SUCCEEDED' },
        ],
      },
    }));

    const result = await pollTaskBatched('batch-task-1', makeCreds());
    expect(result.status).toBe('SUCCEEDED');
  });
});

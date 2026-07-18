import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { handleModerateImage, verifySkillStyle, isSkillAutoVerifyEnabled, createMediaRoutes } from './media.js';

// Controllable stand-in for generateMedia so skill-author auto-verify can be
// driven without hitting a real image provider. `h.genImpl` is swapped per test.
// (vi.mock is hoisted above the imports, so ./media.js binds to the mock.)
const h = vi.hoisted(() => ({ genImpl: null as null | ((args: any) => any) }));
vi.mock('../media/index.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, generateMedia: (args: any) => h.genImpl!(args) };
});

/** Minimal Express res double capturing status + json body. */
function fakeRes() {
  const out: { status: number; body: any } = { status: 200, body: undefined };
  const res: any = {
    status(code: number) { out.status = code; return res; },
    json(body: any) { out.body = body; return res; },
  };
  return { res, out };
}

async function run(body: any) {
  const { res, out } = fakeRes();
  await handleModerateImage({ body } as any, res);
  return out;
}

/** Build a fake fetch returning an OpenAI-style chat completion with given content. */
function mockChatContent(content: string, ok = true, status = 200) {
  return vi.fn(async () => ({
    ok,
    status,
    async json() { return { choices: [{ message: { content } }] }; },
    async text() { return content; },
  })) as unknown as typeof fetch;
}

describe('handleModerateImage', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    process.env.SIMULATION_MODE = '0';            // never hit the simulation short-circuit
    process.env.IMAGE_MODERATION_API_KEY = 'test-key';
    process.env.IMAGE_MODERATION_MODEL = 'openai/gpt-5.6-luna';
    // Empty → default fallback == primary → de-duped to [] (single-model tests are deterministic).
    process.env.IMAGE_MODERATION_FALLBACK_MODELS = '';
    delete process.env.IMAGE_MODERATION_ENABLED;
    delete process.env.IMAGE_MODERATION_BASE_URL;
  });
  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.SIMULATION_MODE;
    delete process.env.IMAGE_MODERATION_API_KEY;
    delete process.env.IMAGE_MODERATION_MODEL;
    delete process.env.IMAGE_MODERATION_FALLBACK_MODELS;
    delete process.env.IMAGE_MODERATION_ENABLED;
    delete process.env.OPENAI_API_KEY;
    vi.restoreAllMocks();
  });

  it('rejects a missing/invalid imageUrl with 400', async () => {
    expect((await run({})).status).toBe(400);
    expect((await run({ imageUrl: 'ftp://x/y.png' })).status).toBe(400);
    expect((await run({ imageUrl: 'not a url' })).status).toBe(400);
  });

  it('short-circuits in simulation mode', async () => {
    process.env.SIMULATION_MODE = '1';
    const out = await run({ imageUrl: 'https://cdn.example/a.png' });
    expect(out.status).toBe(200);
    expect(out.body).toMatchObject({ safe: true, simulated: true });
  });

  it('fails open (degraded) when moderation is unconfigured', async () => {
    delete process.env.IMAGE_MODERATION_API_KEY; // no key + no OPENAI_API_KEY fallback
    const out = await run({ imageUrl: 'https://cdn.example/a.png' });
    expect(out.body).toMatchObject({ safe: true, degraded: true });
  });

  it('fails open (degraded) when explicitly disabled', async () => {
    process.env.IMAGE_MODERATION_ENABLED = '0';
    const out = await run({ imageUrl: 'https://cdn.example/a.png' });
    expect(out.body).toMatchObject({ safe: true, degraded: true });
  });

  it('returns safe:true for a clean image', async () => {
    global.fetch = mockChatContent('{"safe":true,"reason":"phong cảnh núi rừng"}');
    const out = await run({ imageUrl: 'https://cdn.example/landscape.png' });
    expect(out.body).toMatchObject({ safe: true, model: 'openai/gpt-5.6-luna' });
    expect(out.body.reason).toContain('phong cảnh');
  });

  it('sends response_format json_object + an image_url part to the vision provider', async () => {
    const fetchMock = mockChatContent('{"safe":true}');
    global.fetch = fetchMock;
    await run({ imageUrl: 'https://cdn.example/a.png' });
    const [, init] = (fetchMock as any).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.temperature).toBe(0);
    const parts = body.messages[0].content;
    expect(parts.some((p: any) => p.type === 'image_url' && p.image_url?.url === 'https://cdn.example/a.png')).toBe(true);
  });

  it('falls back to a second model when the primary returns refusal prose', async () => {
    process.env.IMAGE_MODERATION_MODEL = 'claude-haiku-4.5';       // the "Kiro" refuser
    process.env.IMAGE_MODERATION_FALLBACK_MODELS = 'openai/gpt-5.6-luna';
    // First call (primary): prose refusal. Second call (fallback): valid JSON, safe:false.
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, async json() { return { choices: [{ message: { content: 'I appreciate you reaching out, but I am Kiro…' } }] }; }, async text() { return ''; } })
      .mockResolvedValueOnce({ ok: true, status: 200, async json() { return { choices: [{ message: { content: '{"safe":false,"reason":"khiêu dâm"}' } }] }; }, async text() { return ''; } });
    global.fetch = fetchMock as unknown as typeof fetch;
    const out = await run({ imageUrl: 'https://cdn.example/nsfw.png' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(out.body).toMatchObject({ safe: false, model: 'openai/gpt-5.6-luna' });
    expect(out.body.degraded).toBeUndefined();          // a real verdict, not degraded
    expect(out.body.reason).toContain('khiêu dâm');
  });

  it('marks degraded (fail-open) only after ALL models return prose', async () => {
    process.env.IMAGE_MODERATION_MODEL = 'primary';
    process.env.IMAGE_MODERATION_FALLBACK_MODELS = 'secondary';
    const fetchMock = mockChatContent('I appreciate you reaching out, but I cannot analyze images.');
    global.fetch = fetchMock;
    const out = await run({ imageUrl: 'https://cdn.example/a.png' });
    expect((fetchMock as any).mock.calls.length).toBe(2);   // primary + fallback both tried
    expect(out.body).toMatchObject({ safe: true, degraded: true });
  });

  it('returns safe:false for flagged content (tolerates markdown fences)', async () => {
    global.fetch = mockChatContent('```json\n{"safe":false,"reason":"nội dung khiêu dâm"}\n```');
    const out = await run({ imageUrl: 'https://cdn.example/nsfw.png' });
    expect(out.body.safe).toBe(false);
    expect(out.body.reason).toContain('khiêu dâm');
  });

  it('accepts image_url alias image_url (snake_case) and data: URIs', async () => {
    global.fetch = mockChatContent('{"safe":true}');
    const out = await run({ image_url: 'data:image/png;base64,iVBORw0KGgo=' });
    expect(out.body.safe).toBe(true);
  });

  it('fails open on an upstream (non-2xx) vision error', async () => {
    global.fetch = mockChatContent('rate limited', false, 429);
    const out = await run({ imageUrl: 'https://cdn.example/a.png' });
    expect(out.body).toMatchObject({ safe: true, degraded: true });
  });

  it('fails open when the vision reply is unparseable', async () => {
    global.fetch = mockChatContent('I cannot help with that.');
    const out = await run({ imageUrl: 'https://cdn.example/a.png' });
    expect(out.body).toMatchObject({ safe: true, degraded: true });
  });

  it('fails open when fetch throws', async () => {
    global.fetch = vi.fn(async () => { throw new Error('network down'); }) as unknown as typeof fetch;
    const out = await run({ imageUrl: 'https://cdn.example/a.png' });
    expect(out.body).toMatchObject({ safe: true, degraded: true });
    expect(out.body.reason).toContain('network down');
  });
});

// --- Skill-author AUTO-VERIFY ------------------------------------------------

describe('isSkillAutoVerifyEnabled', () => {
  const KEYS = ['SKILL_AUTHOR_AUTOVERIFY_ENABLED', 'QWENCLOUD_API_KEY', 'OPENAI_API_KEY'] as const;
  afterEach(() => { for (const k of KEYS) delete process.env[k]; });

  it('explicit on/off wins over key presence', () => {
    process.env.SKILL_AUTHOR_AUTOVERIFY_ENABLED = 'off';
    process.env.QWENCLOUD_API_KEY = 'k';
    expect(isSkillAutoVerifyEnabled()).toBe(false);
    process.env.SKILL_AUTHOR_AUTOVERIFY_ENABLED = 'on';
    delete process.env.QWENCLOUD_API_KEY;
    expect(isSkillAutoVerifyEnabled()).toBe(true);
  });

  it('defaults ON when an image key exists, OFF otherwise', () => {
    expect(isSkillAutoVerifyEnabled()).toBe(false);
    process.env.OPENAI_API_KEY = 'k';
    expect(isSkillAutoVerifyEnabled()).toBe(true);
  });
});

describe('verifySkillStyle', () => {
  const realFetch = global.fetch;
  let tmp: string;
  let projectsRoot: string;

  /** A fake generateMedia that WRITES a real sample file so the SUT can read it back. */
  function genOk(name = 'sample.png', flags: Partial<Record<string, any>> = {}) {
    return (_args: any) => {
      const dir = path.join(projectsRoot, '__skill_verify__');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, name), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      return { name, mime: 'image/png', usedStubFallback: false, intentionalStub: false, providerNote: 'ok', providerError: null, ...flags };
    };
  }

  const visionCfg = { model: 'openai/gpt-5.6-luna', apiKey: 'k', baseUrl: 'https://vision.example/v1', fallbackModels: [] };
  const skill = { id: 'neon-noir', label: 'Neon Noir', description: 'rainy neon cyberpunk street', style_keywords: ['neon', 'cyberpunk'], prompt_template: '{subject}, {style}, {mood}', default_negative: 'blurry' };

  beforeEach(() => {
    process.env.SIMULATION_MODE = '0';
    delete process.env.SKILL_AUTHOR_VERIFY_MODEL;
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skillverify-'));
    projectsRoot = path.join(tmp, 'projects');
    fs.mkdirSync(projectsRoot, { recursive: true });
    h.genImpl = genOk();
  });
  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.SIMULATION_MODE;
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* noop */ }
    vi.restoreAllMocks();
  });

  it('renders a sample + returns a style-match verdict', async () => {
    const fetchFn = mockChatContent('{"match":true,"score":0.87,"notes":"neon rim light, wet asphalt"}');
    const out = await verifySkillStyle(skill, { projectRoot: tmp, projectsRoot }, { fetchFn, visionCfg });
    expect(out.imageUrl).toBe('/api/projects/__skill_verify__/raw/sample.png');
    expect(out.styleMatch).toMatchObject({ match: true });
    expect(out.styleMatch!.score).toBeCloseTo(0.87);
    expect(out.styleMatch!.notes).toContain('neon');
    expect(out.degraded).toBeUndefined();
  });

  it('derives match from score when the model omits the boolean, and clamps score', async () => {
    const fetchFn = mockChatContent('{"score":9,"notes":"off style"}'); // no match key, score out of range
    const out = await verifySkillStyle({ ...skill }, { projectRoot: tmp, projectsRoot }, { fetchFn, visionCfg });
    expect(out.styleMatch).toEqual({ match: true, score: 1, notes: 'off style' });
    const fetchLow = mockChatContent('{"score":0.2,"notes":"weak"}');
    const low = await verifySkillStyle({ ...skill }, { projectRoot: tmp, projectsRoot }, { fetchFn: fetchLow, visionCfg });
    expect(low.styleMatch).toMatchObject({ match: false, score: 0.2 });
  });

  it('degrades (no styleMatch) when image generation throws', async () => {
    h.genImpl = () => { throw new Error('provider 500'); };
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const out = await verifySkillStyle(skill, { projectRoot: tmp, projectsRoot }, { fetchFn, visionCfg });
    expect(out.degraded).toBe(true);
    expect(out.error).toContain('image gen failed');
    expect(out.styleMatch).toBeUndefined();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('degrades when generation stub-fell-back (no real provider)', async () => {
    h.genImpl = genOk('sample.png', { usedStubFallback: true, providerError: 'no key' });
    const out = await verifySkillStyle(skill, { projectRoot: tmp, projectsRoot }, { fetchFn: mockChatContent('{}'), visionCfg });
    expect(out.degraded).toBe(true);
    expect(out.error).toContain('stub');
    expect(out.styleMatch).toBeUndefined();
  });

  it('keeps imageUrl but degrades when the vision reply is unparseable', async () => {
    const out = await verifySkillStyle(skill, { projectRoot: tmp, projectsRoot }, { fetchFn: mockChatContent('sorry, no'), visionCfg });
    expect(out.imageUrl).toContain('__skill_verify__');
    expect(out.degraded).toBe(true);
    expect(out.styleMatch).toBeUndefined();
  });

  it('degrades when the vision model is unconfigured', async () => {
    const out = await verifySkillStyle(skill, { projectRoot: tmp, projectsRoot }, { fetchFn: mockChatContent('{}'), visionCfg: null });
    expect(out.degraded).toBe(true);
    expect(out.error).toContain('unconfigured');
  });

  it('short-circuits in simulation mode (no gen/vision)', async () => {
    process.env.SIMULATION_MODE = '1';
    h.genImpl = () => { throw new Error('should not be called'); };
    const out = await verifySkillStyle(skill, { projectRoot: tmp, projectsRoot }, { fetchFn: mockChatContent('{}'), visionCfg });
    expect(out.simulated).toBe(true);
    expect(out.styleMatch).toMatchObject({ match: true });
  });
});

describe('POST /skills/author (auto-verify integration)', () => {
  const realFetch = global.fetch;
  let tmp: string;
  let projectsRoot: string;
  let authorHandler: (req: any, res: any) => Promise<any>;

  function findHandler(router: any, method: string, routePath: string) {
    for (const layer of router.stack) {
      const route = layer.route;
      if (route && route.path === routePath && route.methods[method]) {
        const stack = route.stack;
        return stack[stack.length - 1].handle;
      }
    }
    throw new Error(`route ${method} ${routePath} not found`);
  }

  const AUTHORED = { id: 'neon-street', label: 'Neon Street', description: 'wet neon cyberpunk alley', status: 'draft', style_keywords: ['neon', 'cyberpunk'], prompt_template: '{subject}, {style}' };

  /** Route fetch double: LLM endpoint returns the authored skill; vision endpoint returns a verdict. */
  function routeFetch(visionContent: string) {
    return vi.fn(async (url: string) => {
      const u = String(url);
      const content = u.includes('vision.example')
        ? visionContent
        : JSON.stringify(AUTHORED); // LLM (author) call
      return { ok: true, status: 200, async json() { return { choices: [{ message: { content } }] }; }, async text() { return content; } };
    }) as unknown as typeof fetch;
  }

  beforeEach(() => {
    process.env.SIMULATION_MODE = '0';
    process.env.SKILL_AUTHOR_AUTOVERIFY_ENABLED = '1';
    process.env.IMAGE_MODERATION_API_KEY = 'k';
    process.env.IMAGE_MODERATION_BASE_URL = 'https://vision.example/v1';
    delete process.env.SEARCH_PROVIDER;
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skillauthor-'));
    projectsRoot = path.join(tmp, 'projects');
    fs.mkdirSync(projectsRoot, { recursive: true });
    h.genImpl = (_args: any) => {
      const dir = path.join(projectsRoot, '__skill_verify__');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'sample.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      return { name: 'sample.png', mime: 'image/png', usedStubFallback: false, intentionalStub: false, providerNote: 'ok', providerError: null };
    };
    const db = new Database(':memory:');
    const router = createMediaRoutes(db as any, tmp, projectsRoot, () => {});
    authorHandler = findHandler(router, 'post', '/skills/author');
  });
  afterEach(() => {
    global.fetch = realFetch;
    for (const k of ['SIMULATION_MODE', 'SKILL_AUTHOR_AUTOVERIFY_ENABLED', 'IMAGE_MODERATION_API_KEY', 'IMAGE_MODERATION_BASE_URL']) delete process.env[k];
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* noop */ }
    vi.restoreAllMocks();
  });

  function fakeRes() {
    const out: { status: number; body: any } = { status: 200, body: undefined };
    const res: any = { status(c: number) { out.status = c; return res; }, json(b: any) { out.body = b; return res; } };
    return { res, out };
  }

  const body = (extra: any = {}) => ({
    category: 'video-direction',
    brief: 'neon cyberpunk street at night',
    llm: { apiKey: 'k', baseUrl: 'https://llm.example', model: 'test-model', providerId: 'custom' },
    ...extra,
  });

  it('returns skill + a sample with a style-match verdict', async () => {
    global.fetch = routeFetch('{"match":true,"score":0.9,"notes":"neon everywhere"}');
    const { res, out } = fakeRes();
    await authorHandler({ body: body() }, res);
    expect(out.status).toBe(200);
    expect(out.body.skill).toMatchObject({ id: 'neon-street', label: 'Neon Street' });
    expect(out.body.sample.styleMatch).toMatchObject({ match: true, score: 0.9 });
    expect(out.body.sample.imageUrl).toContain('__skill_verify__');
  });

  it('still returns the skill draft when image gen fails (sample degraded)', async () => {
    global.fetch = routeFetch('{"match":true,"score":1}');
    h.genImpl = () => { throw new Error('image provider down'); };
    const { res, out } = fakeRes();
    await authorHandler({ body: body() }, res);
    expect(out.status).toBe(200);
    expect(out.body.skill.id).toBe('neon-street'); // contract intact
    expect(out.body.sample.degraded).toBe(true);
    expect(out.body.sample.styleMatch).toBeUndefined();
  });

  it('omits sample when auto-verify is disabled', async () => {
    process.env.SKILL_AUTHOR_AUTOVERIFY_ENABLED = '0';
    global.fetch = routeFetch('{"match":true}');
    const { res, out } = fakeRes();
    await authorHandler({ body: body() }, res);
    expect(out.body.skill.id).toBe('neon-street');
    expect(out.body.sample).toBeUndefined();
  });
});

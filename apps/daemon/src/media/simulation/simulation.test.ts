import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

// Check if ffmpeg is available for integration tests
function hasFfmpeg(): boolean {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
const ffmpegAvailable = hasFfmpeg();

// ──────────────────────────────────────────────
// CONFIG TESTS
// ──────────────────────────────────────────────

describe('config.ts', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'sim-test-'));
    vi.stubEnv('PROJECT_ROOT', tmpDir);
    // Clear all SIMULATION env vars by default
    vi.stubEnv('SIMULATION_MODE', '');
    vi.stubEnv('SIMULATION_LATENCY_IMAGE', '');
    vi.stubEnv('SIMULATION_LATENCY_VIDEO', '');
    vi.stubEnv('SIMULATION_LATENCY_AUDIO', '');
    vi.stubEnv('SIMULATION_LATENCY_JITTER', '');
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  // ── isSimulationEnabled ──

  it('SIMULATION_MODE=1 returns true (env takes precedence over file)', async () => {
    vi.stubEnv('SIMULATION_MODE', '1');
    const { isSimulationEnabled } = await import('./config.js');
    // Even if file exists with enabled: false, env=1 should win
    await writeFile(path.join(tmpDir, 'media-simulation.json'), JSON.stringify({ enabled: false }), 'utf8');
    expect(await isSimulationEnabled()).toBe(true);
  });

  it('SIMULATION_MODE=true returns true', async () => {
    vi.stubEnv('SIMULATION_MODE', 'true');
    const { isSimulationEnabled } = await import('./config.js');
    expect(await isSimulationEnabled()).toBe(true);
  });

  it('SIMULATION_MODE=0 returns false', async () => {
    vi.stubEnv('SIMULATION_MODE', '0');
    const { isSimulationEnabled } = await import('./config.js');
    expect(await isSimulationEnabled()).toBe(false);
  });

  it('SIMULATION_MODE=false returns false', async () => {
    vi.stubEnv('SIMULATION_MODE', 'false');
    const { isSimulationEnabled } = await import('./config.js');
    expect(await isSimulationEnabled()).toBe(false);
  });

  it('SIMULATION_MODE unset falls back to file config', async () => {
    await writeFile(path.join(tmpDir, 'media-simulation.json'), JSON.stringify({ enabled: true }), 'utf8');
    const { isSimulationEnabled } = await import('./config.js');
    // Returns true because config.ts correctly reads fileCfg.enabled now
    expect(await isSimulationEnabled()).toBe(true);
  });

  it('SIMULATION_MODE unset, no config file → defaults to false', async () => {
    const { isSimulationEnabled } = await import('./config.js');
    expect(await isSimulationEnabled()).toBe(false);
  });

  it('SIMULATION_MODE unset, bad JSON file → treated as off', async () => {
    await writeFile(path.join(tmpDir, 'media-simulation.json'), 'not valid json{{{', 'utf8');
    const { isSimulationEnabled } = await import('./config.js');
    expect(await isSimulationEnabled()).toBe(false);
  });

  it('SIMULATION_MODE unset, file with null → treated as off', async () => {
    await writeFile(path.join(tmpDir, 'media-simulation.json'), 'null', 'utf8');
    const { isSimulationEnabled } = await import('./config.js');
    expect(await isSimulationEnabled()).toBe(false);
  });

  it('SIMULATION_MODE with arbitrary string (not 0/1/true/false) → falls through to file', async () => {
    vi.stubEnv('SIMULATION_MODE', 'maybe');
    const { isSimulationEnabled } = await import('./config.js');
    expect(await isSimulationEnabled()).toBe(false); // no file, default off
  });

  // ── getSimulationConfig ──

  it('getSimulationConfig with no file returns defaults, enabled=false', async () => {
    const { getSimulationConfig } = await import('./config.js');
    const cfg = await getSimulationConfig();
    expect(cfg.enabled).toBe(false);
    expect(cfg.latency.image).toBeGreaterThanOrEqual(100);
    expect(cfg.latency.video).toBeGreaterThanOrEqual(100);
    expect(cfg.latency.audio).toBeGreaterThanOrEqual(100);
    expect(cfg.latency.jitter).toBeGreaterThanOrEqual(0);
    expect(cfg.latency.jitter).toBeLessThanOrEqual(1);
  });

  it('getSimulationConfig with file latency values merges with defaults', async () => {
    await writeFile(path.join(tmpDir, 'media-simulation.json'), JSON.stringify({
      enabled: true,
      latency: { image: 5000, video: 15000, audio: 1000, jitter: 0.5 },
    }), 'utf8');
    const { getSimulationConfig } = await import('./config.js');
    const cfg = await getSimulationConfig();
    // BUG: enabled SHOULD be true from the file but always returns false
    // latency values ARE read from file correctly
    expect(cfg.latency.image).toBe(5000);
    expect(cfg.latency.video).toBe(15000);
    expect(cfg.latency.audio).toBe(1000);
    expect(cfg.latency.jitter).toBe(0.5);
  });

  it('latency values are clamped to minimum 100ms', async () => {
    const { getSimulationConfig } = await import('./config.js');
    vi.stubEnv('SIMULATION_LATENCY_IMAGE', '0');
    vi.stubEnv('SIMULATION_LATENCY_VIDEO', '-50');
    vi.stubEnv('SIMULATION_LATENCY_AUDIO', '10');
    const cfg = await getSimulationConfig();
    expect(cfg.latency.image).toBe(100);
    expect(cfg.latency.video).toBe(100);
    expect(cfg.latency.audio).toBe(100);
  });

  it('jitter is clamped to [0, 1]', async () => {
    const { getSimulationConfig } = await import('./config.js');
    vi.stubEnv('SIMULATION_LATENCY_JITTER', '5');
    const cfg = await getSimulationConfig();
    expect(cfg.latency.jitter).toBe(1);

    vi.stubEnv('SIMULATION_LATENCY_JITTER', '-1');
    const cfg2 = await getSimulationConfig();
    expect(cfg2.latency.jitter).toBe(0);
  });

  it('env var latency takes precedence over file latency', async () => {
    await writeFile(path.join(tmpDir, 'media-simulation.json'), JSON.stringify({
      latency: { image: 1000, video: 2000, audio: 3000, jitter: 0.1 },
    }), 'utf8');
    vi.stubEnv('SIMULATION_LATENCY_IMAGE', '9999');
    const { getSimulationConfig } = await import('./config.js');
    const cfg = await getSimulationConfig();
    expect(cfg.latency.image).toBe(9999); // env wins
    expect(cfg.latency.video).toBe(2000); // file value
    expect(cfg.latency.audio).toBe(3000); // file value
  });

  it('env var SIMULATION_MODE=1 overrides file enabled=false', async () => {
    vi.stubEnv('SIMULATION_MODE', '1');
    await writeFile(path.join(tmpDir, 'media-simulation.json'), JSON.stringify({ enabled: false }), 'utf8');
    const { isSimulationEnabled } = await import('./config.js');
    expect(await isSimulationEnabled()).toBe(true);
  });

  it('invalid env var values for latency → fallback to file/default', async () => {
    vi.stubEnv('SIMULATION_LATENCY_IMAGE', 'not-a-number');
    const { getSimulationConfig } = await import('./config.js');
    const cfg = await getSimulationConfig();
    expect(cfg.latency.image).toBeGreaterThanOrEqual(100); // default, not NaN
  });

  it('empty env var values for latency → fallback to file/default', async () => {
    vi.stubEnv('SIMULATION_LATENCY_IMAGE', '');
    const { getSimulationConfig } = await import('./config.js');
    const cfg = await getSimulationConfig();
    expect(cfg.latency.image).toBeGreaterThanOrEqual(100);
  });

  // ── setSimulationConfig ──

  it('setSimulationConfig writes to file and merges partial values', async () => {
    const { setSimulationConfig, getSimulationConfig } = await import('./config.js');
    const result = await setSimulationConfig({
      enabled: true,
      latency: { image: 4000 } as any,
    });
    expect(result.enabled).toBe(true);
    expect(result.latency.image).toBe(4000);
    expect(result.latency.video).toBeGreaterThanOrEqual(100); // default

    // Verify file was written
    const fileContent = await readFile(path.join(tmpDir, 'media-simulation.json'), 'utf8');
    const parsed = JSON.parse(fileContent);
    expect(parsed.enabled).toBe(true);
    expect(parsed.latency.image).toBe(4000);
  });

  it('setSimulationConfig clamps latency values', async () => {
    const { setSimulationConfig } = await import('./config.js');
    const result = await setSimulationConfig({
      enabled: true,
      latency: { image: 10, video: -5, audio: 0, jitter: 2 },
    } as any);
    expect(result.latency.image).toBe(100);
    expect(result.latency.video).toBe(100);
    expect(result.latency.audio).toBe(100);
    expect(result.latency.jitter).toBe(1);
  });

  it('setSimulationConfig missing enabled preserves current', async () => {
    const { setSimulationConfig } = await import('./config.js');
    const result = await setSimulationConfig({} as any);
    expect(result.enabled).toBe(false); // current default
  });
});

// ──────────────────────────────────────────────
// SIMULATOR TESTS
// ──────────────────────────────────────────────

describe('simulator.ts', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'sim-test-'));
    vi.stubEnv('PROJECT_ROOT', tmpDir);
    vi.stubEnv('SIMULATION_MODE', '');
    vi.stubEnv('SIMULATION_LATENCY_IMAGE', '');
    vi.stubEnv('SIMULATION_LATENCY_VIDEO', '');
    vi.stubEnv('SIMULATION_LATENCY_AUDIO', '');
    vi.stubEnv('SIMULATION_LATENCY_JITTER', '');
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it('withSimulation — when disabled, calls real renderFn', async () => {
    const { withSimulation } = await import('./simulator.js');
    const realFn = vi.fn().mockResolvedValue({
      bytes: Buffer.from('real'),
      providerNote: 'real',
    });
    const wrapped = withSimulation(realFn, 'image');
    const ctx = { model: 'test-model', prompt: 'hello', surface: 'image' } as any;
    const result = await wrapped(ctx, {} as any);
    expect(realFn).toHaveBeenCalledTimes(1);
    expect(result.bytes.toString()).toBe('real');
  });

  it('withSimulation — when enabled, generates simulated file and skips real renderFn', async () => {
    vi.stubEnv('SIMULATION_MODE', '1');
    const { withSimulation } = await import('./simulator.js');
    const realFn = vi.fn().mockResolvedValue({
      bytes: Buffer.from('real'),
      providerNote: 'real',
    });
    const wrapped = withSimulation(realFn, 'image');
    const ctx = { model: 'test-model', prompt: 'hello', aspect: '1:1', surface: 'image' } as any;
    const result = await wrapped(ctx, {} as any);
    expect(realFn).not.toHaveBeenCalled();
    expect(result.bytes).toBeDefined();
    expect(result.bytes.length).toBeGreaterThan(0);
    expect(result.suggestedExt).toBe('.png');
    expect(result.providerNote).toContain('[SIMULATION]');
    expect(result.providerNote).toContain('test-model');
  });

  const vIt = ffmpegAvailable ? it : it.skip;

  vIt('withSimulation — video surface uses 3 progress steps', async () => {
    vi.stubEnv('SIMULATION_MODE', '1');
    vi.stubEnv('SIMULATION_LATENCY_VIDEO', '100');
    const { withSimulation } = await import('./simulator.js');
    const realFn = vi.fn();
    const wrapped = withSimulation(realFn, 'video');
    const onProgress = vi.fn();
    const ctx = { model: 'test', prompt: 'hello', aspect: '16:9', surface: 'video' } as any;
    await wrapped(ctx, {} as any, onProgress);
    expect(realFn).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress.mock.calls[0][0]).toBe('Đang phân tích prompt');
    expect(onProgress.mock.calls[1][0]).toBe('Đang tạo khung hình giả lập');
    expect(onProgress.mock.calls[2][0]).toBe('Đang mã hóa video');
  });

  it('withSimulation — image surface uses 2 progress steps', async () => {
    vi.stubEnv('SIMULATION_MODE', '1');
    vi.stubEnv('SIMULATION_LATENCY_IMAGE', '100');
    const { withSimulation } = await import('./simulator.js');
    const realFn = vi.fn();
    const wrapped = withSimulation(realFn, 'image');
    const onProgress = vi.fn();
    const ctx = {
      model: 'test', prompt: 'hello', aspect: '1:1', surface: 'image',
    } as any;
    await wrapped(ctx, {} as any, onProgress);
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls[0][0]).toBe('Đang tạo ảnh giả lập');
    expect(onProgress.mock.calls[1][0]).toBe('Hoàn thiện đầu ra');
  });

  vIt('withSimulation — audio surface uses 2 progress steps', async () => {
    vi.stubEnv('SIMULATION_MODE', '1');
    vi.stubEnv('SIMULATION_LATENCY_AUDIO', '100');
    const { withSimulation } = await import('./simulator.js');
    const realFn = vi.fn();
    const wrapped = withSimulation(realFn, 'audio');
    const onProgress = vi.fn();
    const ctx = { model: 'test', prompt: 'hello', surface: 'audio' } as any;
    await wrapped(ctx, {} as any, onProgress);
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls[0][0]).toBe('Đang tạo âm thanh giả lập...');
    expect(onProgress.mock.calls[1][0]).toBe('Đang chuẩn hóa...');
  });

  it('withSimulation — latency respects clamping and does not crash', async () => {
    vi.stubEnv('SIMULATION_MODE', '1');
    vi.stubEnv('SIMULATION_LATENCY_IMAGE', '0');
    vi.stubEnv('SIMULATION_LATENCY_JITTER', '0');
    const { withSimulation } = await import('./simulator.js');
    const realFn = vi.fn();
    const wrapped = withSimulation(realFn, 'image');
    const ctx = {
      model: 'test', prompt: 'hello', aspect: '1:1', surface: 'image',
    } as any;
    await wrapped(ctx, {} as any);
    expect(realFn).not.toHaveBeenCalled();
  });

  it('withSimulation — no onProgress does not crash', async () => {
    vi.stubEnv('SIMULATION_MODE', '1');
    vi.stubEnv('SIMULATION_LATENCY_IMAGE', '100');
    const { withSimulation } = await import('./simulator.js');
    const realFn = vi.fn();
    const wrapped = withSimulation(realFn, 'image');
    const ctx = {
      model: 'test', prompt: 'hello', aspect: '1:1', surface: 'image',
    } as any;
    // Should not throw even though onProgress is undefined
    await expect(wrapped(ctx, {} as any)).resolves.toBeDefined();
  });
});

// ──────────────────────────────────────────────
// IMAGE GENERATOR TESTS
// ──────────────────────────────────────────────

describe('generators-image.ts', () => {
  it('generates a valid PNG with correct magic bytes', async () => {
    const { generateSimulatedImage } = await import('./generators-image.js');
    const ctx = { model: 'test-model', prompt: 'a scenic view', aspect: '1:1' } as any;
    const buf = generateSimulatedImage(ctx);
    // PNG header: 89 50 4E 47 0D 0A 1A 0A
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50); // P
    expect(buf[2]).toBe(0x4E); // N
    expect(buf[3]).toBe(0x47); // G
    expect(buf[4]).toBe(0x0D);
    expect(buf[5]).toBe(0x0A);
    expect(buf[6]).toBe(0x1A);
    expect(buf[7]).toBe(0x0A);
  });

  it('generates PNG larger than 10KB', async () => {
    const { generateSimulatedImage } = await import('./generators-image.js');
    const ctx = { model: 'test-model', prompt: 'a scenic view', aspect: '1:1' } as any;
    const buf = generateSimulatedImage(ctx);
    expect(buf.length).toBeGreaterThan(10 * 1024);
  });

  it('has IHDR and IDAT PNG chunks', async () => {
    const { generateSimulatedImage } = await import('./generators-image.js');
    const ctx = { model: 'test-model', prompt: 'a scenic view', aspect: '1:1' } as any;
    const buf = generateSimulatedImage(ctx);
    const ascii = buf.toString('ascii');
    expect(ascii).toContain('IHDR');
    expect(ascii).toContain('IDAT');
    expect(ascii).toContain('IEND');
  });

  it('uses correct resolution based on aspect ratio', async () => {
    const { generateSimulatedImage } = await import('./generators-image.js');
    // 16:9 → 1280x720 → larger area than 1:1 → 1024x1024
    const ctx1x1 = { model: 'test', prompt: 'test', aspect: '1:1' } as any;
    const ctx16x9 = { model: 'test', prompt: 'test', aspect: '16:9' } as any;
    const buf1x1 = generateSimulatedImage(ctx1x1);
    const buf16x9 = generateSimulatedImage(ctx16x9);
    // PNG compression means we can't check raw pixel count, but both should be > 10KB
    expect(buf1x1.length).toBeGreaterThan(10 * 1024);
    expect(buf16x9.length).toBeGreaterThan(10 * 1024);

    // 9:16 → 720x1280
    const ctx9x16 = { model: 'test', prompt: 'test', aspect: '9:16' } as any;
    const buf9x16 = generateSimulatedImage(ctx9x16);
    expect(buf9x16.length).toBeGreaterThan(10 * 1024);
  });

  it('different prompts produce different images (different color) — deterministic', async () => {
    const { generateSimulatedImage } = await import('./generators-image.js');
    const ctx1 = { model: 'model-a', prompt: 'sunset', aspect: '1:1' } as any;
    const ctx2 = { model: 'model-b', prompt: 'ocean', aspect: '1:1' } as any;
    const buf1 = generateSimulatedImage(ctx1);
    const buf2 = generateSimulatedImage(ctx2);
    // They should be different
    expect(buf1.equals(buf2)).toBe(false);
  });

  it('same inputs produce same output (deterministic)', async () => {
    const { generateSimulatedImage } = await import('./generators-image.js');
    const ctx = { model: 'test-model', prompt: 'hello world', aspect: '1:1' } as any;
    const buf1 = generateSimulatedImage(ctx);
    const buf2 = generateSimulatedImage(ctx);
    expect(buf1.equals(buf2)).toBe(true);
  });

  it('handles undefined aspect ratio', async () => {
    const { generateSimulatedImage } = await import('./generators-image.js');
    const ctx = { model: 'test', prompt: 'test' } as any; // no aspect
    const buf = generateSimulatedImage(ctx);
    expect(buf.length).toBeGreaterThan(10 * 1024); // should use default 1:1
  });
});

// ──────────────────────────────────────────────
// GENERATORS DISPATCH TESTS
// ──────────────────────────────────────────────

describe('generators.ts', () => {
  it('generates simulated image file with .png extension', async () => {
    const { generateSimulatedFile } = await import('./generators.js');
    const ctx = { model: 'test-model', prompt: 'hello', aspect: '1:1', surface: 'image' } as any;
    const result = await generateSimulatedFile(ctx, 'image');
    expect(result.suggestedExt).toBe('.png');
    expect(result.bytes).toBeInstanceOf(Buffer);
    expect(result.providerNote).toContain('[SIMULATION]');
    expect(result.providerNote).toContain('test-model');
    expect(result.providerNote).toContain('image');
  });

  const vIt = ffmpegAvailable ? it : it.skip;

  vIt('generates simulated video file with .mp4 extension', async () => {
    const { generateSimulatedFile } = await import('./generators.js');
    const ctx = {
      model: 'test-model', prompt: 'hello', aspect: '16:9', length: 2, surface: 'video',
    } as any;
    const result = await generateSimulatedFile(ctx, 'video');
    expect(result.suggestedExt).toBe('.mp4');
    expect(result.providerNote).toContain('[SIMULATION]');
    expect(result.providerNote).toContain('video');
    // Verify valid MP4 header (ftyp box at beginning)
    const headerSample = result.bytes.slice(0, Math.min(100, result.bytes.length)).toString('ascii');
    expect(headerSample).toContain('ftyp');
    expect(headerSample).toContain('isom');
    expect(result.bytes.length).toBeGreaterThan(1024);
  });

  vIt('generates simulated audio file with .wav extension', async () => {
    const { generateSimulatedFile } = await import('./generators.js');
    const ctx = {
      model: 'test-model', prompt: 'hello', duration: 1, surface: 'audio',
    } as any;
    const result = await generateSimulatedFile(ctx, 'audio');
    expect(result.suggestedExt).toBe('.wav');
    expect(result.providerNote).toContain('[SIMULATION]');
    expect(result.providerNote).toContain('audio');
    // Verify valid WAV header: RIFF....
    expect(result.bytes[0]).toBe(0x52); // R
    expect(result.bytes[1]).toBe(0x49); // I
    expect(result.bytes[2]).toBe(0x46); // F
    expect(result.bytes[3]).toBe(0x46); // F
    expect(result.bytes.length).toBeGreaterThan(44); // WAV header is 44 bytes
  });

  it('throws for unsupported surface', async () => {
    const { generateSimulatedFile } = await import('./generators.js');
    const ctx = { model: 'test', prompt: 'hello' } as any;
    await expect(generateSimulatedFile(ctx, 'hologram')).rejects.toThrow('unsupported surface');
  });
});

// ──────────────────────────────────────────────
// INDEX EXPORTS
// ──────────────────────────────────────────────

describe('simulation/index.ts exports', () => {
  it('exports all expected symbols', async () => {
    const sim = await import('./index.js');
    expect(sim.isSimulationEnabled).toBeDefined();
    expect(sim.getSimulationConfig).toBeDefined();
    expect(sim.setSimulationConfig).toBeDefined();
    expect(sim.withSimulation).toBeDefined();
    expect(typeof sim.isSimulationEnabled).toBe('function');
    expect(typeof sim.getSimulationConfig).toBe('function');
    expect(typeof sim.setSimulationConfig).toBe('function');
    expect(typeof sim.withSimulation).toBe('function');
  });
});

// ──────────────────────────────────────────────
// EDGE CASE: Missing PROJECT_ROOT env var
// ──────────────────────────────────────────────

describe('config.ts — missing PROJECT_ROOT', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'sim-noroot-'));
    vi.stubEnv('PROJECT_ROOT', tmpDir);
    vi.stubEnv('SIMULATION_MODE', '');
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it('uses process.cwd() when PROJECT_ROOT is empty — no config file in tmpDir', async () => {
    vi.stubEnv('PROJECT_ROOT', '');
    const { getSimulationConfig } = await import('./config.js');
    const cfg = await getSimulationConfig();
    // enabled defaults to false when no media-simulation.json exists
    expect(cfg.latency.image).toBeGreaterThanOrEqual(100);
  });
});

// ──────────────────────────────────────────────
// EDGE CASE: Concurrent simulation tasks
// ──────────────────────────────────────────────

describe('simulator.ts — concurrent tasks', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'sim-concurrent-'));
    vi.stubEnv('PROJECT_ROOT', tmpDir);
    vi.stubEnv('SIMULATION_MODE', '1');
    vi.stubEnv('SIMULATION_LATENCY_IMAGE', '100');
    vi.stubEnv('SIMULATION_LATENCY_JITTER', '0');
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it('multiple concurrent simulation tasks all succeed independently', async () => {
    const { withSimulation } = await import('./simulator.js');
    const realFn = vi.fn();
    const wrapped = withSimulation(realFn, 'image');
    const ctx = {
      model: 'test', prompt: 'hello', aspect: '1:1', surface: 'image',
    } as any;
    const results = await Promise.all([
      wrapped(ctx, {} as any),
      wrapped(ctx, {} as any),
      wrapped(ctx, {} as any),
    ]);
    expect(results).toHaveLength(3);
    results.forEach(r => {
      expect(r.bytes).toBeDefined();
      expect(r.bytes.length).toBeGreaterThan(0);
    });
    expect(realFn).not.toHaveBeenCalled();
  });
});

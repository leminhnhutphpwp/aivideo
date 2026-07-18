import { describe, it, expect } from 'vitest';
import { renderStub, svgPlaceholder, aspectToBox, silentWav } from './stub.js';
import type { MediaContext } from '../types.js';

function makeCtx(overrides: Partial<MediaContext> = {}): MediaContext {
  return {
    surface: 'image',
    model: 'test-model',
    wireModel: 'test-model',
    modelDef: { id: 'test', label: 'Test', hint: '', provider: 'stub', caps: ['t2i'] },
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

describe('renderStub', () => {
  describe('image surface', () => {
    it('returns PNG bytes for image surface', async () => {
      const ctx = makeCtx({ surface: 'image' });
      const result = await renderStub(ctx, 'output.png');
      expect(result.bytes).toBeInstanceOf(Buffer);
      expect(result.bytes.length).toBeGreaterThan(0);
      expect(result.providerNote).toContain('stub-image');
      expect(result.providerNote).toContain('test-model');
    });

    it('returns valid PNG header', async () => {
      const ctx = makeCtx({ surface: 'image' });
      const result = await renderStub(ctx, 'output.png');
      // PNG magic: 89 50 4E 47
      expect(result.bytes[0]).toBe(0x89);
      expect(result.bytes[1]).toBe(0x50);
      expect(result.bytes[2]).toBe(0x4e);
      expect(result.bytes[3]).toBe(0x47);
    });

    it('returns SVG for .svg filename', async () => {
      const ctx = makeCtx({ surface: 'image' });
      const result = await renderStub(ctx, 'output.svg');
      const str = result.bytes.toString('utf8');
      expect(str).toContain('<svg');
      expect(str).toContain('xmlns');
    });

    it('includes aspect ratio in provider note', async () => {
      const ctx = makeCtx({ surface: 'image', aspect: '16:9' });
      const result = await renderStub(ctx, 'output.png');
      expect(result.providerNote).toContain('aspect=16:9');
    });

    it('includes truncated prompt in provider note', async () => {
      const ctx = makeCtx({ surface: 'image', prompt: 'a very long prompt that should be truncated' });
      const result = await renderStub(ctx, 'output.png');
      expect(result.providerNote).toContain('prompt=');
    });
  });

  describe('video surface', () => {
    it('returns MP4 bytes for video surface', async () => {
      const ctx = makeCtx({ surface: 'video', length: 5 });
      const result = await renderStub(ctx, 'output.mp4');
      expect(result.bytes).toBeInstanceOf(Buffer);
      expect(result.providerNote).toContain('stub-video');
      expect(result.providerNote).toContain('length=5s');
    });

    it('contains ftyp box header', async () => {
      const ctx = makeCtx({ surface: 'video' });
      const result = await renderStub(ctx, 'output.mp4');
      const header = result.bytes.slice(0, 24).toString('ascii');
      expect(header).toContain('ftyp');
      expect(header).toContain('isom');
    });
  });

  describe('audio surface', () => {
    it('returns MP3 bytes for audio surface', async () => {
      const ctx = makeCtx({ surface: 'audio', audioKind: 'speech' });
      const result = await renderStub(ctx, 'output.mp3');
      expect(result.bytes).toBeInstanceOf(Buffer);
      expect(result.providerNote).toContain('stub-audio');
      expect(result.providerNote).toContain('kind=speech');
    });

    it('returns WAV for .wav filename', async () => {
      const ctx = makeCtx({ surface: 'audio', audioKind: 'music', duration: 10 });
      const result = await renderStub(ctx, 'output.wav');
      // WAV header: RIFF
      expect(result.bytes[0]).toBe(0x52);
      expect(result.bytes[1]).toBe(0x49);
      expect(result.bytes[2]).toBe(0x46);
      expect(result.bytes[3]).toBe(0x46);
    });

    it('includes voice in note when set', async () => {
      const ctx = makeCtx({ surface: 'audio', audioKind: 'speech', voice: 'vi-VN-NamMinhNeural' });
      const result = await renderStub(ctx, 'output.mp3');
      expect(result.providerNote).toContain('voice=vi-VN-NamMinhNeural');
    });
  });
});

describe('svgPlaceholder', () => {
  it('generates valid SVG', () => {
    const ctx = makeCtx();
    const svg = svgPlaceholder(ctx);
    expect(svg).toContain('<svg');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('</svg>');
  });

  it('escapes HTML in model and prompt', () => {
    const ctx = makeCtx({ model: '<script>', prompt: 'test prompt' });
    const svg = svgPlaceholder(ctx);
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('test prompt');
  });
});

describe('aspectToBox', () => {
  it('returns base x base for 1:1', () => {
    expect(aspectToBox('1:1', 800)).toEqual([800, 800]);
  });

  it('returns wider box for 16:9', () => {
    const [w, h] = aspectToBox('16:9', 800);
    expect(w).toBe(800);
    expect(h).toBeLessThan(800);
  });

  it('returns taller box for 9:16', () => {
    const [w, h] = aspectToBox('9:16', 800);
    expect(h).toBe(800);
    expect(w).toBeLessThan(800);
  });

  it('handles undefined aspect', () => {
    expect(aspectToBox(undefined, 800)).toEqual([800, 800]);
  });

  it('handles empty string', () => {
    expect(aspectToBox('', 800)).toEqual([800, 800]);
  });
});

describe('silentWav', () => {
  it('generates valid WAV buffer', () => {
    const buf = silentWav(1);
    expect(buf[0]).toBe(0x52); // R
    expect(buf[1]).toBe(0x49); // I
    expect(buf[2]).toBe(0x46); // F
    expect(buf[3]).toBe(0x46); // F
    expect(buf.slice(8, 12).toString('ascii')).toBe('WAVE');
    expect(buf.slice(12, 16).toString('ascii')).toBe('fmt ');
    expect(buf.slice(36, 40).toString('ascii')).toBe('data');
  });

  it('has correct data size for duration', () => {
    const buf = silentWav(1);
    // 8000 samples/sec * 1 sec * 2 bytes/sample = 16000 data bytes
    const dataSize = buf.readUInt32LE(40);
    expect(dataSize).toBe(16000);
  });

  it('handles 0.5 second duration', () => {
    const buf = silentWav(0.5);
    const dataSize = buf.readUInt32LE(40);
    expect(dataSize).toBe(8000);
  });
});

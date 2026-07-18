import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import type { MediaContext } from '../types.js';

function aspectToResolution(aspect: string | undefined): { width: number; height: number } {
  const map: Record<string, { width: number; height: number }> = {
    '1:1': { width: 1024, height: 1024 },
    '16:9': { width: 1280, height: 720 },
    '9:16': { width: 720, height: 1280 },
    '4:3': { width: 1024, height: 768 },
    '3:4': { width: 768, height: 1024 },
  };
  return map[aspect ?? '1:1'] ?? { width: 1024, height: 1024 };
}

function hashColor(seed: string): [number, number, number] {
  const h = createHash('md5').update(seed).digest();
  return [h[0], h[1], h[2]];
}

function writeU32(buf: Buffer, offset: number, val: number): void {
  buf.writeUInt32BE(val, offset);
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let t = n;
    for (let k = 0; k < 8; k++) {
      t = (t & 1) ? (0xedb88320 ^ (t >>> 1)) : (t >>> 1);
    }
    table[n] = t;
  }
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function buildPixelData(width: number, height: number, r: number, g: number, b: number): Buffer {
  const raw = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const gradientY = Math.round((y / height) * 60);
      const grid = (x % 64 === 0 || y % 64 === 0) ? 20 : 0;
      raw[i] = Math.min(255, r + gradientY + grid);
      raw[i + 1] = Math.min(255, g + gradientY);
      raw[i + 2] = Math.min(255, b + gradientY + grid);
      raw[i + 3] = 255;
    }
  }
  return raw;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  writeU32(len, 0, data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  writeU32(crcBuf, 0, crc32(crcData));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const IHDR = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function makePNG(width: number, height: number, pixelData: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  writeU32(ihdr, 0, width);
  writeU32(ihdr, 4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const scanlines: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    pixelData.copy(row, 1, y * width * 4, (y + 1) * width * 4);
    scanlines.push(row);
  }
  const raw = Buffer.concat(scanlines);
  const compressed = deflateRawSync(raw);

  const chunks: Buffer[] = [IHDR];
  chunks.push(chunk('IHDR', ihdr));
  chunks.push(chunk('IDAT', compressed));

  const iend = Buffer.alloc(0);
  chunks.push(chunk('IEND', iend));

  return Buffer.concat(chunks);
}

export function generateSimulatedImage(ctx: MediaContext): Buffer {
  const { width, height } = aspectToResolution(ctx.aspect);
  const [r, g, b] = hashColor(ctx.model + ctx.prompt);
  const pixels = buildPixelData(width, height, r, g, b);
  return makePNG(width, height, pixels);
}

import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { MediaContext } from '../types.js';

function aspectToResolution(aspect: string | undefined): { width: number; height: number } {
  const map: Record<string, { width: number; height: number }> = {
    '1:1': { width: 1024, height: 1024 },
    '16:9': { width: 1280, height: 720 },
    '9:16': { width: 720, height: 1280 },
    '4:3': { width: 1024, height: 768 },
    '3:4': { width: 768, height: 1024 },
  };
  return map[aspect ?? '16:9'] ?? { width: 1280, height: 720 };
}

export async function generateSimulatedVideo(ctx: MediaContext): Promise<Buffer> {
  const { width, height } = aspectToResolution(ctx.aspect);
  const duration = Number.isFinite(ctx.length) && (ctx.length as number) > 0 ? (ctx.length as number) : 5;
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'sim-video-'));
  const outputPath = path.join(tmpDir, 'output.mp4');
  try {
    await new Promise<void>((resolve, reject) => {
      const args = [
        '-y',
        '-f', 'lavfi',
        '-i', `color=c=blue:size=${width}x${height}:d=${duration}`,
        '-shortest',
        outputPath,
      ];
      execFile('ffmpeg', args, { timeout: 30000 }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    const { readFile } = await import('node:fs/promises');
    const bytes = await readFile(outputPath);
    return bytes;
  } finally {
    rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

import { execFile } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { MediaContext } from '../types.js';

export async function generateSimulatedAudio(ctx: MediaContext): Promise<Buffer> {
  const duration = ctx.duration ?? 3;

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'sim-audio-'));
  const outputPath = path.join(tmpDir, 'output.wav');
  try {
    await new Promise<void>((resolve, reject) => {
      const args = [
        '-y',
        '-f', 'lavfi',
        '-i', `sine=frequency=440:duration=${duration}`,
        '-ac', '1',
        outputPath,
      ];
      execFile('ffmpeg', args, { timeout: 15000 }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    const bytes = await readFile(outputPath);
    return bytes;
  } finally {
    rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

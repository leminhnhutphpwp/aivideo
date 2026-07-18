import { spawn, spawnSync } from 'child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface MergedFileMeta {
  name: string;
  size: number;
  mtime: number;
  kind: string;
  mime: string;
  model: string;
  surface: string;
  providerNote: string;
  providerId: string;
  providerError: string | null;
  usedStubFallback: boolean;
  intentionalStub: boolean;
  warnings: string[];
}

export function checkFfmpeg(): boolean {
  try {
    const result = spawnSync('ffmpeg', ['-version'], { stdio: 'pipe' });
    return result.status === 0;
  } catch {
    return false;
  }
}

export function mergeAudioVideo(videoPath: string, audioPath: string, outputPath: string): Promise<MergedFileMeta> {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-i', videoPath, '-i', audioPath, '-c:v', 'copy', '-c:a', 'aac', '-map', '0:v:0', '-map', '1:a:0', '-shortest', '-y', outputPath]);
    let stderr = '';
    ff.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    ff.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-200)}`));
      try {
        const stat = fs.statSync(outputPath);
        const name = path.basename(outputPath);
        resolve({ name, size: stat.size, mtime: stat.mtimeMs, kind: 'video', mime: 'video/mp4', model: 'voiceover', surface: 'video', providerNote: `video + voiceover · ${(stat.size / 1024 / 1024).toFixed(1)} MB`, providerId: 'ffmpeg', providerError: null, usedStubFallback: false, intentionalStub: false, warnings: [] });
      } catch (err: any) {
        reject(new Error(`Failed to stat merged file: ${err.message}`));
      }
    });
    ff.on('error', (err) => reject(new Error(`ffmpeg spawn failed: ${err.message}`)));
  });
}

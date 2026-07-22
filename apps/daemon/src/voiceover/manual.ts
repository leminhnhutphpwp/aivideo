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

const MERGE_TIMEOUT_MS = 5 * 60 * 1000;

export function mergeAudioVideo(videoPath: string, audioPath: string, outputPath: string): Promise<MergedFileMeta> {
  // A SIGKILL timeout or non-zero exit can leave a partial/corrupt output file on disk, which the
  // backend would surface as a broken asset. Remove it on every failure path so no half-merged file survives.
  const cleanupPartial = () => { try { fs.rmSync(outputPath, { force: true }); } catch {/* best-effort */} };
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-i', videoPath, '-i', audioPath, '-c:v', 'copy', '-c:a', 'aac', '-map', '0:v:0', '-map', '1:a:0', '-shortest', '-y', outputPath]);
    let stderr = '';
    // Guard against a hung ffmpeg: without this the promise never settles, leaving the
    // task stuck 'running' with no webhook and a leaked liveTasks entry.
    const timer = setTimeout(() => {
      try { ff.kill('SIGKILL'); } catch {/* already gone */}
      cleanupPartial();
      reject(new Error(`ffmpeg merge timed out after ${Math.round(MERGE_TIMEOUT_MS / 1000)}s`));
    }, MERGE_TIMEOUT_MS);
    timer.unref?.();
    ff.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    ff.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) { cleanupPartial(); return reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-200)}`)); }
      try {
        const stat = fs.statSync(outputPath);
        const name = path.basename(outputPath);
        resolve({ name, size: stat.size, mtime: stat.mtimeMs, kind: 'video', mime: 'video/mp4', model: 'voiceover', surface: 'video', providerNote: `video + voiceover · ${(stat.size / 1024 / 1024).toFixed(1)} MB`, providerId: 'ffmpeg', providerError: null, usedStubFallback: false, intentionalStub: false, warnings: [] });
      } catch (err: any) {
        cleanupPartial();
        reject(new Error(`Failed to stat merged file: ${err.message}`));
      }
    });
    ff.on('error', (err) => { clearTimeout(timer); cleanupPartial(); reject(new Error(`ffmpeg spawn failed: ${err.message}`)); });
  });
}

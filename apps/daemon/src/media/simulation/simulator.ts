import { sleep } from '../render-utils.js';
import type { MediaContext, ProviderConfig, ProgressFn, RenderResult } from '../types.js';
import { isSimulationEnabled, getSimulationConfig } from './config.js';
import { generateSimulatedFile } from './generators.js';

type RenderFn = (ctx: MediaContext, credentials: ProviderConfig, onProgress?: ProgressFn) => Promise<RenderResult>;

const PROGRESS_MESSAGES: Record<string, string[]> = {
  image: ['Đang tạo ảnh giả lập', 'Hoàn thiện đầu ra'],
  video: ['Đang phân tích prompt', 'Đang tạo khung hình giả lập', 'Đang mã hóa video'],
  audio: ['Đang tạo âm thanh giả lập', 'Đang chuẩn hóa'],
};

export function withSimulation(renderFn: RenderFn, surface: string): RenderFn {
  return async (ctx: MediaContext, credentials: ProviderConfig, onProgress?: ProgressFn): Promise<RenderResult> => {
    const enabled = await isSimulationEnabled();
    if (!enabled) {
      return renderFn(ctx, credentials, onProgress);
    }

    const cfg = await getSimulationConfig();
    const baseLatency = cfg.latency[surface as keyof typeof cfg.latency] ?? 3000;
    const jitter = cfg.latency.jitter;
    const jitterAmount = Math.round(baseLatency * jitter * (Math.random() * 2 - 1));
    const totalLatency = Math.max(100, baseLatency + jitterAmount);

    const steps = surface === 'video' ? 3 : 2;
    const stepMs = Math.round(totalLatency / steps);
    const messages = PROGRESS_MESSAGES[surface] ?? [];

    for (let i = 0; i < steps; i++) {
      await sleep(stepMs);
      if (onProgress && messages[i]) {
        onProgress(messages[i]);
      }
    }

    const result = await generateSimulatedFile(ctx, surface);
    return result;
  };
}

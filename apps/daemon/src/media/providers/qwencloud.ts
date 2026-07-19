import type { MediaContext, ProviderConfig, RenderResult, ProgressFn, ImageRef } from '../types.js';
import { truncate, sleep } from '../render-utils.js';
import { logger } from '../../utils/index.js';

// --- Fetch with Exponential Backoff + Jitter for 429 ---

async function fetchWithBackoff(
  url: string,
  options: RequestInit,
  maxRetries = 6,
  baseDelay = 1000,
  maxDelay = 60000,
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const resp = await fetch(url, options);
    if (resp.status !== 429) return resp;

    const retryAfter = resp.headers.get('retry-after');
    const baseWait = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 2000 - 1000; // ±1s jitter
    const wait = Math.min(maxDelay, Math.max(0, baseWait + jitter));

    logger.warn('QWENCLOUD', `rate limited (attempt ${attempt + 1}/${maxRetries}), waiting ${wait}ms`);
    await sleep(wait);
  }
  throw new Error('max retries exceeded for rate limiting');
}

// --- Batch Polling Coordinator ---
// Reduces QPS by batching multiple task polls into a single API call.
// Active when ≥2 tasks are being polled concurrently.

interface PollEntry {
  taskId: string;
  credentials: ProviderConfig;
  resolve: (result: any) => void;
  reject: (err: Error) => void;
}

const activePolls = new Map<string, PollEntry>();
let batchTimer: ReturnType<typeof setTimeout> | null = null;
const BATCH_WINDOW_MS = 2000;

export async function batchQueryTasks(
  taskIds: string[],
  credentials: ProviderConfig,
): Promise<Map<string, { status: string; output?: any }>> {
  if (!credentials.baseUrl) throw new Error('no Qwen Cloud base URL');
  const baseUrl = credentials.baseUrl.replace(/\/$/, '');
  const url = `${baseUrl}/tasks/?task_id=${taskIds.join(',')}`;
  const resp = await fetchWithBackoff(url, {
    headers: {
      'Authorization': `Bearer ${credentials.apiKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) throw new Error(`batch query failed: ${resp.status}`);
  const data: any = await resp.json();
  const results = new Map<string, { status: string; output?: any }>();
  for (const task of data.output?.results || []) {
    results.set(task.task_id, { status: task.task_status, output: task });
  }
  return results;
}

function scheduleBatch(): void {
  if (batchTimer) return;
  batchTimer = setTimeout(() => {
    batchTimer = null;
    flushBatch();
  }, BATCH_WINDOW_MS);
}

async function flushBatch(): Promise<void> {
  if (activePolls.size === 0) return;

  // Group by credentials (different providers = different batches)
  const groups = new Map<string, { entries: PollEntry[]; credentials: ProviderConfig }>();
  for (const [key, entry] of activePolls) {
    const groupKey = entry.credentials.apiKey || 'default';
    if (!groups.has(groupKey)) groups.set(groupKey, { entries: [], credentials: entry.credentials });
    groups.get(groupKey)!.entries.push(entry);
  }

  for (const { entries, credentials } of groups.values()) {
    if (entries.length === 0) continue;
    const taskIds = entries.map(e => e.taskId);
    try {
      const results = await batchQueryTasks(taskIds, credentials);
      for (const entry of entries) {
        const result = results.get(entry.taskId);
        if (result) {
          entry.resolve(result);
        } else {
          // Task not found in batch response — resolve with empty so poller falls back to single
          entry.resolve({ status: 'UNKNOWN', output: null });
        }
      }
    } catch (err: any) {
      logger.warn('QWENCLOUD', `batch poll failed for ${taskIds.length} tasks`, { error: err.message });
      for (const entry of entries) {
        entry.resolve({ status: 'BATCH_ERROR', output: null });
      }
    }
  }
}

/**
 * Poll a single task, participating in batch when possible.
 * If ≥2 tasks are polling concurrently, batches them into one API call.
 * Falls back to single-poll on batch errors or when alone.
 */
export function pollTaskBatched(
  taskId: string,
  credentials: ProviderConfig,
): Promise<{ status: string; output?: any }> {
  return new Promise((resolve, reject) => {
    const key = taskId;
    activePolls.set(key, { taskId, credentials, resolve, reject });
    scheduleBatch();
    // Cleanup after resolution
    const cleanup = () => { activePolls.delete(key); };
    const origResolve = resolve;
    const wrappedResolve = (v: any) => { cleanup(); origResolve(v); };
    activePolls.get(key)!.resolve = wrappedResolve;
    activePolls.get(key)!.reject = (e: Error) => { cleanup(); reject(e); };
  });
}

function getAdaptivePollInterval(elapsedMs: number, taskStatus: string, errorCount: number): number {
  const base = taskStatus === 'PENDING' ? 15000 : 12000;
  const elapsedSec = elapsedMs / 1000;
  let multiplier = 1;
  if (taskStatus === 'RUNNING' && elapsedSec > 60) multiplier = 1.5;
  if (taskStatus === 'RUNNING' && elapsedSec > 180) multiplier = 2;
  if (errorCount > 0) multiplier *= Math.min(4, 1 + errorCount);
  const jitter = Math.random() * 6000 - 3000;
  return Math.max(8000, Math.min(60000, base * multiplier + jitter));
}

function checkSafetyError(resp: any, text: string): void {
  try {
    const data = JSON.parse(text);
    const code = data?.code || data?.error?.code || '';
    const msg = data?.message || data?.error?.message || '';
    if (code === 'DataInspectionFailed' || code === 'data_inspection_failed') {
      throw new Error(`Content blocked by safety filter: ${msg || 'Inappropriate content detected'}`);
    }
    if (code === 'IPInfringementSuspect' || code === 'ip_infringement_suspect') {
      throw new Error(`Content blocked: possible IP/copyright concern`);
    }
  } catch (e: any) {
    if (e.message?.includes('Content blocked')) throw e; // re-raise safety errors
    // ignore parse errors — not a safety response
  }
}

export async function renderQwenCloudVideo(ctx: MediaContext, credentials: ProviderConfig, onProgress?: ProgressFn): Promise<RenderResult> {
  if (!credentials.apiKey) {
    throw new Error('no Qwen Cloud API key');
  }
  if (!credentials.baseUrl) {
    throw new Error('no Qwen Cloud base URL');
  }
  const baseUrl = credentials.baseUrl.replace(/\/$/, '');
  const model = ctx.wireModel;
  const isWan27 = model.startsWith('wan2.7');
  const isWan26 = model.startsWith('wan2.6');
  const isWan22Kf2v = model.includes('kf2v');
  const isT2v = model.includes('t2v');
  const isI2v = model.includes('i2v') || isWan22Kf2v;
  const isR2v = model.includes('r2v');
  const isEdit = model.includes('edit') || model.includes('videoedit');
  const isAnimate = model.includes('animate-move') || model.includes('animate-mix');

  const params: Record<string, any> = {};
  if (isAnimate) {
    params.mode = ctx.mode === 'wan-pro' ? 'wan-pro' : 'wan-std';
    params.watermark = false;
  } else if (isWan27) {
      params.resolution = '1080P';
      if (ctx.aspect) params.ratio = ctx.aspect;
      params.watermark = false;
  } else if (isWan26) {
    params.size = ctx.aspect === '9:16' ? '720*1280' : ctx.aspect === '1:1' ? '720*720' : '1280*720';
  } else {
    params.resolution = '720P';
  }
  if (ctx.seed !== undefined) {
    params.seed = ctx.seed;
  }
  // prompt_extend: enabled for wan2.6/2.7 t2v (LLM rewrites short prompts for better quality)
  // disabled for i2v/r2v/edit (user provides specific creative direction)
  // respects promptInfluence=0 (user provides detailed prompt) unless model benefits from it
  if (isR2v) {
    params.prompt_extend = false;
  } else {
    const isVideoGen = (isWan26 || isWan27) && (isT2v);
    params.prompt_extend = isVideoGen ? true : ctx.promptInfluence !== 0;
  }
  if (isT2v || isI2v || isR2v || isEdit) {
    params.duration = ctx.length || 5;
  }
  // Animate models: duration is inferred from input video, not set via params.
  // prompt_extend makes no sense for animate (purely visual reference based).
  if (isAnimate) {
    delete params.prompt_extend;
  }

  const input: Record<string, any> = { prompt: ctx.prompt || '' };
  if (ctx.negativePrompt) {
    input.negative_prompt = ctx.negativePrompt;
  }

  // --- Image/Video input handling ---
  const refUrl = ctx.imageRef?.dataUrl || ctx.imageRef?.abs;
  const lastUrl = ctx.lastFrameRef?.dataUrl || ctx.lastFrameRef?.abs;
  // Wan2.7 R2V: uses reference_video / reference_image types (multi-ref up to 5 total including first_frame)
  if (isWan27 && isR2v) {
    let refs: ImageRef[];
    if (ctx.shotType === 'multi') {
      params.shot_type = 'multi';
      refs = [];
      if (ctx.multiPanelImage) refs.push(ctx.multiPanelImage);
      const entityRefs = (ctx.imageRefs && ctx.imageRefs.length > 0 ? ctx.imageRefs : (ctx.imageRef ? [ctx.imageRef] : []));
      for (const er of entityRefs) {
        if (er && !refs.some(r => r.abs === er.abs)) refs.push(er);
      }
    } else {
      refs = (ctx.imageRefs && ctx.imageRefs.length > 0 ? ctx.imageRefs : (ctx.imageRef ? [ctx.imageRef] : []));
    }
    const refUrls = refs.map(r => r.dataUrl || r.abs).filter(Boolean) as string[];
    if (refUrls.length > 0) {
      const media: any[] = [];
      for (let i = 0; i < refs.length && media.length < 5; i++) {
        const r = refs[i];
        const url = r.dataUrl || r.abs;
        if (!url) continue;
        const isVideoRef = r.mime?.startsWith('video/') || url.endsWith('.mp4');
        const entry: any = { type: isVideoRef ? 'reference_video' : 'reference_image', url };
        const voiceUrl = ctx.voiceRefs?.[i]?.dataUrl || ctx.voiceRefs?.[i]?.abs;
        if (voiceUrl) {
          entry.reference_voice = voiceUrl;
        }
        media.push(entry);
      }
      if (ctx.lastFrameRef && lastUrl && media.length < 5) {
        media.push({ type: 'first_frame', url: lastUrl });
      }
      input.media = media;
    }
  }
  // Wan2.7 I2V: uses first_frame / last_frame types
  else if (isWan27 && isI2v && ctx.imageRef && refUrl) {
    const media: any[] = [{ type: 'first_frame', url: refUrl }];
    if (ctx.lastFrameRef && lastUrl) {
      media.push({ type: 'last_frame', url: lastUrl });
    }
    input.media = media;
  }
  // Wan2.6: uses img_url for first frame only
  if (isWan26 && (isI2v || isR2v)) {
    const urls = ctx.imageRefs && ctx.imageRefs.length > 0
      ? ctx.imageRefs.map(r => r.dataUrl || r.abs).filter(Boolean) as string[]
      : (refUrl ? [refUrl] : []);
    if (urls.length > 0) {
      input.img_url = urls[0];
    }
  }
  // Wan2.2 kf2v: uses first_frame_url / last_frame_url
  if (isWan22Kf2v) {
    if (ctx.imageRef && refUrl) input.first_frame_url = refUrl;
    if (ctx.lastFrameRef && lastUrl) input.last_frame_url = lastUrl;
  }
  // Legacy fallback for older models
  if (!isWan27 && !isWan26 && !isWan22Kf2v && (isI2v || isR2v) && ctx.imageRef && refUrl) {
    input.image_url = refUrl;
  }
  // Character animation (animate-move / animate-mix): image_url (character) + video_url (motion reference)
  if (isAnimate) {
    const imgUrl = ctx.imageRef?.dataUrl || ctx.imageRef?.abs;
    if (imgUrl) {
      input.image_url = imgUrl;
    }
    const vidUrl = ctx.videoRef?.dataUrl || ctx.videoRef?.abs;
    if (vidUrl) {
      input.video_url = vidUrl;
    }
  }
  // Video-edit: use media array with video type (+ optional reference images, up to 4)
  if (isEdit) {
    const media: any[] = [];
    if (ctx.imageRef && (ctx.imageRef.dataUrl || ctx.imageRef.abs)) {
      media.push({ type: 'video', url: ctx.imageRef.dataUrl || ctx.imageRef.abs });
    }
    if (ctx.lastFrameRef && (ctx.lastFrameRef.dataUrl || ctx.lastFrameRef.abs)) {
      media.push({ type: 'reference_image', url: ctx.lastFrameRef.dataUrl || ctx.lastFrameRef.abs });
    }
    // Add multi-reference images (up to 4 total, API limit: 1 video + 4 images)
    if (ctx.referenceImageRefs && ctx.referenceImageRefs.length > 0) {
      for (const ref of ctx.referenceImageRefs) {
        const url = ref.dataUrl || ref.abs;
        if (url && media.length < 5) {
          media.push({ type: 'reference_image', url });
        }
      }
    }
    if (media.length > 0) {
      input.media = media;
    }
    if (!ctx.prompt) input.prompt = 'Edit this video';
    params.audio_setting = ctx.audioSetting || 'auto';
    // Don't override source video ratio — use the input video's aspect
    delete params.ratio;
  }

  const taskBody = { model, input, parameters: params };

  const endpoint = (isWan22Kf2v || isAnimate)
    ? `${baseUrl}/services/aigc/image2video/video-synthesis`
    : `${baseUrl}/services/aigc/video-generation/video-synthesis`;

  const taskResp = await fetchWithBackoff(endpoint, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${credentials.apiKey}`,
      'content-type': 'application/json',
      'x-dashscope-async': 'enable',
      'x-dashscope-wait-timeout': '30',
    },
    body: JSON.stringify(taskBody),
  });
  const taskText = await taskResp.text();
  if (!taskResp.ok) {
    checkSafetyError(null, taskText);
    throw new Error(`qwencloud task create ${taskResp.status}: ${truncate(taskText, 240)}`);
  }
  let taskData: any;
  try { taskData = JSON.parse(taskText); } catch { throw new Error(`qwencloud non-JSON: ${truncate(taskText, 200)}`); }
  const taskId = taskData?.output?.task_id;
  if (!taskId) throw new Error('qwencloud task response missing output.task_id');

  const startedAt = Date.now();
  const maxMs = 12 * 60 * 1000;
  let videoUrl: string | null = null;
  let lastStatus = '';
  let pollErrors = 0;

  if (typeof onProgress === 'function') {
    onProgress(`qwencloud task ${taskId} accepted; polling…`);
  }
  while (Date.now() - startedAt < maxMs) {
    const interval = getAdaptivePollInterval(Date.now() - startedAt, lastStatus, pollErrors);
    await sleep(interval);
    let pollData: any;
    try {
      // Use batched polling — batches with other concurrent tasks when possible
      const batchResult = await pollTaskBatched(taskId, credentials);
      if (batchResult.output) {
        pollData = { output: batchResult.output };
      } else {
        // Batch returned no data — fall back to single poll
        const pollResp = await fetchWithBackoff(`${baseUrl}/tasks/${encodeURIComponent(taskId)}`, {
          headers: { 'authorization': `Bearer ${credentials.apiKey}` },
        });
        const pollText = await pollResp.text();
        if (!pollResp.ok) {
          pollErrors++;
          logger.warn('QWENCLOUD', `poll ${taskId} failed (${pollErrors}x)`, { status: pollResp.status });
          continue;
        }
        try { pollData = JSON.parse(pollText); } catch { throw new Error(`qwencloud poll non-JSON: ${truncate(pollText, 200)}`); }
      }
      pollErrors = 0;
    } catch (e: any) {
      pollErrors++;
      if (pollErrors >= 5) throw e;
      logger.warn('QWENCLOUD', `poll ${taskId} error (${pollErrors}x)`, { error: e.message });
      continue;
    }
    lastStatus = pollData?.output?.task_status || '';
    if (typeof onProgress === 'function') {
      const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
      onProgress(`qwencloud task ${taskId} status=${lastStatus} (elapsed ${elapsedSec}s)`);
    }
    if (lastStatus === 'SUCCEEDED') {
      videoUrl = pollData?.output?.video_url || null;
      break;
    }
    if (lastStatus === 'FAILED' || lastStatus === 'CANCELLED') {
      const reason = pollData?.output?.message || pollData?.error?.message || lastStatus;
      throw new Error(`qwencloud task ${lastStatus}: ${reason}`);
    }
  }
  if (!videoUrl) {
    throw new Error(`qwencloud task did not finish in time (last status: ${lastStatus || 'unknown'})`);
  }

  const dlMaxRetries = 3;
  let bytes: Buffer | null = null;
  let lastDlError = '';
  for (let attempt = 1; attempt <= dlMaxRetries; attempt++) {
    try {
      const dlResp = await fetchWithBackoff(videoUrl, {});
      if (!dlResp.ok) {
        lastDlError = `qwencloud video fetch ${dlResp.status}`;
        if (dlResp.status === 403 || dlResp.status === 410) {
          logger.warn('QWENCLOUD', `video URL expired or forbidden (attempt ${attempt}/${dlMaxRetries})`, { status: dlResp.status });
        }
        if (attempt < dlMaxRetries) { await sleep(2000 * attempt); continue; }
        throw new Error(lastDlError);
      }
      const arr = await dlResp.arrayBuffer();
      bytes = Buffer.from(arr);
      break;
    } catch (e: any) {
      lastDlError = e.message;
      if (attempt < dlMaxRetries) {
        logger.warn('QWENCLOUD', `video download failed (attempt ${attempt}/${dlMaxRetries})`, { error: e.message });
        await sleep(2000 * attempt);
        continue;
      }
      throw e;
    }
  }
  if (!bytes) throw new Error(`qwencloud video download failed: ${lastDlError}`);

  return { bytes, providerNote: `qwencloud/${model} · ${ctx.aspect || '16:9'} · ${ctx.length || 5}s · ${bytes.length} bytes`, suggestedExt: '.mp4' };
}

export async function renderQwenCloudImage(ctx: MediaContext, credentials: ProviderConfig, onProgress?: ProgressFn): Promise<RenderResult> {
  if (!credentials.apiKey) {
    throw new Error('no Qwen Cloud API key');
  }
  if (!credentials.baseUrl) {
    throw new Error('no Qwen Cloud base URL');
  }
  const baseUrl = credentials.baseUrl.replace(/\/$/, '');
  const model = ctx.wireModel;
  const isWan = model.startsWith('wan2.');
  // Qwen-Image models: qwen-image-*, z-image-*, thanhnhan9023/gpt-image-2 handled by CKey
  const isQwenImage = model.startsWith('qwen-image') || model.startsWith('z-image');

  const input: Record<string, any> = { prompt: ctx.prompt || '' };
  if (ctx.negativePrompt) {
    input.negative_prompt = ctx.negativePrompt;
  }

  // Image editing: pass reference images
  const refs = ctx.imageRefs && ctx.imageRefs.length > 0
    ? ctx.imageRefs
    : (ctx.imageRef ? [ctx.imageRef] : []);
  const refUrls = refs
    .map(r => r.dataUrl || r.abs)
    .filter(Boolean) as string[];
  const refUrl = refUrls[0] || undefined;
  if (refUrls.length > 0 && isQwenImage) {
    input.images = refUrls;
  }

  const params: Record<string, any> = {};
  if (ctx.aspect) {
    if (isQwenImage) {
      params.size = ctx.aspect === '1:1' ? '1328*1328' : ctx.aspect === '16:9' ? '1664*928' : ctx.aspect === '9:16' ? '928*1664' : '1328*1328';
    } else {
      params.size = ctx.aspect === '1:1' ? '1024*1024' : ctx.aspect === '16:9' ? '1664*928' : ctx.aspect === '9:16' ? '928*1664' : '1024*768';
    }
  }

  if (isQwenImage) {
    // Qwen-Image: sync multimodal endpoint (messages array format)
    // API requires images FIRST, then text instruction for editing mode
    const content: any[] = [];
    for (const url of refUrls) {
      content.push({ image: url });
    }
    content.push({ text: ctx.prompt || 'A beautiful image' });
    // Qwen-Image (multimodal-generation) accepts negative_prompt + seed under `parameters`
    // (DashScope Model Studio: seed ∈ [0, 2147483647]). Only send when provided so the
    // default path stays byte-identical — this is what makes the restore studio's negative
    // prompt + seed-lock / multi-variant levers actually reach the model.
    if (ctx.negativePrompt) params.negative_prompt = ctx.negativePrompt;
    if (ctx.seed !== undefined) params.seed = ctx.seed;
    const body = {
      model,
      input: { messages: [{ role: 'user', content }] },
      parameters: params,
    };
    const resp = await fetchWithBackoff(`${baseUrl}/services/aigc/multimodal-generation/generation`, {
      method: 'POST',
      headers: { 'authorization': `Bearer ${credentials.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    if (!resp.ok) {
      checkSafetyError(null, text);
      throw new Error(`qwencloud image ${resp.status}: ${truncate(text, 240)}`);
    }
    let data: any;
    try { data = JSON.parse(text); } catch { throw new Error(`qwencloud image non-JSON: ${truncate(text, 200)}`); }
    const imgUrl = data?.output?.choices?.[0]?.message?.content?.find((c: any) => c.image)?.image;
    if (!imgUrl) throw new Error('qwencloud image response missing image URL');
    const dlResp = await fetchWithBackoff(imgUrl, {});
    if (!dlResp.ok) throw new Error(`qwencloud image fetch ${dlResp.status}`);
    const arr = await dlResp.arrayBuffer();
    const bytes = Buffer.from(arr);
    return { bytes, providerNote: `qwencloud/${model} · ${bytes.length} bytes`, suggestedExt: '.png' };
  } else if (isWan) {
    // Wan Image: async task — disable prompt rewriting since our skills pipeline enriches prompts
    if (typeof onProgress === 'function') onProgress('qwencloud wan image task submitted…');
    const imageParams: Record<string, any> = { prompt_extend: false, ...params };
    if (ctx.seed !== undefined) {
      imageParams.seed = ctx.seed;
    }
    // Build content array: text first, then images (text refers to "image 1", "image 2" etc.)
    const refs = ctx.imageRefs && ctx.imageRefs.length > 0
      ? ctx.imageRefs
      : (ctx.imageRef ? [ctx.imageRef] : []);
    const imageUrls = refs
      .map(r => r.dataUrl || r.abs)
      .filter(Boolean) as string[];
    const wanInput: Record<string, any> = {};
    if (imageUrls.length > 0) {
      const content: any[] = [{ text: ctx.prompt || '' }];
      for (const url of imageUrls) {
        content.push({ image: url });
      }
      wanInput.messages = [{ role: 'user', content }];
    } else {
      wanInput.prompt = ctx.prompt || '';
    }
    if (ctx.negativePrompt) {
      wanInput.negative_prompt = ctx.negativePrompt;
    }
    const body = { model, input: wanInput, parameters: imageParams };
    const taskResp = await fetchWithBackoff(`${baseUrl}/services/aigc/image-generation/generation`, {
      method: 'POST',
      headers: { 'authorization': `Bearer ${credentials.apiKey}`, 'content-type': 'application/json', 'x-dashscope-async': 'enable', 'x-dashscope-wait-timeout': '30' },
      body: JSON.stringify(body),
    });
    const taskText = await taskResp.text();
    if (!taskResp.ok) throw new Error(`qwencloud wan image ${taskResp.status}: ${truncate(taskText, 240)}`);
    let taskData: any;
    try { taskData = JSON.parse(taskText); } catch { throw new Error(`qwencloud wan image non-JSON: ${truncate(taskText, 200)}`); }
    const taskId = taskData?.output?.task_id;
    if (!taskId) throw new Error('qwencloud wan image task response missing task_id');

    const startedAt = Date.now();
    const maxMs = 5 * 60 * 1000;
    let imgUrl: string | null = null;
    let lastImgStatus = '';
    let imgPollErrors = 0;
    while (Date.now() - startedAt < maxMs) {
      const interval = getAdaptivePollInterval(Date.now() - startedAt, lastImgStatus, imgPollErrors);
      await sleep(interval);
      let pollData: any;
      try {
        const batchResult = await pollTaskBatched(taskId, credentials);
        if (batchResult.output) {
          pollData = { output: batchResult.output };
        } else {
          const pollResp = await fetchWithBackoff(`${baseUrl}/tasks/${encodeURIComponent(taskId)}`, {
            headers: { 'authorization': `Bearer ${credentials.apiKey}` },
          });
          const pollText = await pollResp.text();
          if (!pollResp.ok) { imgPollErrors++; continue; }
          try { pollData = JSON.parse(pollText); } catch { throw new Error(`qwencloud wan poll non-JSON`); }
        }
        imgPollErrors = 0;
      } catch (e: any) {
        imgPollErrors++;
        if (imgPollErrors >= 5) throw e;
        continue;
      }
      const status = pollData?.output?.task_status || '';
      lastImgStatus = status;
      if (typeof onProgress === 'function') {
        onProgress(`qwencloud wan image status=${status}`);
      }
      if (status === 'SUCCEEDED') {
        const results = pollData?.output?.results;
        imgUrl = Array.isArray(results) ? results[0]?.url : results?.url || null;
        break;
      }
      if (status === 'FAILED') {
        throw new Error(`qwencloud wan image FAILED: ${pollData?.output?.message || 'unknown'}`);
      }
    }
    if (!imgUrl) throw new Error('qwencloud wan image did not finish in time');
    const dlResp = await fetchWithBackoff(imgUrl, {});
    if (!dlResp.ok) throw new Error(`qwencloud wan image fetch ${dlResp.status}`);
    const arr = await dlResp.arrayBuffer();
    const bytes = Buffer.from(arr);
    return { bytes, providerNote: `qwencloud/${model} · ${bytes.length} bytes`, suggestedExt: '.png' };
  }
  throw new Error(`qwencloud image: unsupported model ${model}`);
}

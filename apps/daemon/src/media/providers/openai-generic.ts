import fs from 'fs/promises';
import type { MediaContext, ProviderConfig, RenderResult, ProgressFn } from '../types.js';
import { truncate } from '../render-utils.js';

/** Whether to speak DashScope's dialect (a nested `parameters` object) instead of the
 *  flat OpenAI images schema. Enable for OpenAI-compatible proxies backed by Alibaba
 *  DashScope (e.g. xah.io) via OPENAI_IMAGE_DASHSCOPE_PARAMS=1. Off = vanilla OpenAI body. */
function dashscopeParamsEnabled(): boolean {
  const v = process.env['OPENAI_IMAGE_DASHSCOPE_PARAMS'];
  return v === '1' || v === 'true';
}

/** DashScope `thinking_mode` adds a reasoning pass that noticeably slows image
 *  generation (~25-32s observed) for little quality gain on ordinary images, so it
 *  is OFF by default. Opt back in per-deployment via OPENAI_IMAGE_THINKING_MODE=1
 *  (or =true) when the extra deliberation is actually wanted. */
function thinkingModeEnabled(): boolean {
  const v = process.env['OPENAI_IMAGE_THINKING_MODE'];
  return v === '1' || v === 'true';
}

/** Map an aspect ratio to a pixel size. `sep` is '*' for DashScope, 'x' for OpenAI.
 *  A fixed OPENAI_IMAGE_SIZE (e.g. "2048*2048") overrides the aspect mapping. */
function imageSizeForAspect(aspect: string | undefined, sep: '*' | 'x'): string {
  const override = process.env['OPENAI_IMAGE_SIZE'];
  if (override && override.trim()) return override.trim().replace(/[*x]/, sep);
  const wh = aspect === '16:9' ? '2560,1440'
    : aspect === '9:16' ? '1440,2560'
    : aspect === '4:3' ? '2048,1536'
    : aspect === '3:4' ? '1536,2048'
    : '2048,2048'; // 1:1 / default
  const [w, h] = wh.split(',');
  return `${w}${sep}${h}`;
}

export async function renderOpenAIGenericImage(ctx: MediaContext, credentials: ProviderConfig, onProgress?: ProgressFn): Promise<RenderResult> {
  if (!credentials.apiKey) throw new Error('no API key for generic OpenAI provider');
  if (!credentials.baseUrl) throw new Error('no Base URL for generic OpenAI provider');

  const baseUrl = credentials.baseUrl.replace(/\/$/, '');

  let resp: Response;

  // thinking_mode is controllable per-request via ctx.thinkingMode; when the request
  // does not specify it, fall back to the env default (OPENAI_IMAGE_THINKING_MODE).
  const thinking = ctx.thinkingMode ?? thinkingModeEnabled();

  if (ctx.imageRef && ctx.imageRef.abs) {
    const url = `${baseUrl}/images/edits`;
    const formData = new FormData();
    formData.append('model', ctx.wireModel);
    formData.append('prompt', ctx.prompt || 'A beautiful image');
    formData.append('n', '1');
    formData.append('size', imageSizeForAspect(ctx.aspect, 'x'));
    formData.append('response_format', 'url');

    const fileBuf = await fs.readFile(ctx.imageRef.abs);
    const blob = new Blob([fileBuf], { type: 'image/png' });
    formData.append('image', blob, 'image.png');

    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
      },
      body: formData,
    });
  } else {
    const url = `${baseUrl}/images/generations`;
    // DashScope-backed proxies (xah.io) want controls in a nested `parameters` object
    // (size in W*H form, watermark, thinking_mode) — the flat OpenAI fields are ignored
    // for those knobs. Vanilla OpenAI endpoints get the standard flat body instead.
    const body: Record<string, unknown> = dashscopeParamsEnabled()
      ? {
          model: ctx.wireModel,
          prompt: ctx.prompt || 'A beautiful image',
          parameters: {
            size: imageSizeForAspect(ctx.aspect, '*'),
            n: 1,
            watermark: ctx.watermark === true,
            thinking_mode: thinking,
          },
        }
      : {
          model: ctx.wireModel,
          prompt: ctx.prompt || 'A beautiful image',
          n: 1,
          size: imageSizeForAspect(ctx.aspect, 'x'),
          response_format: 'url',
        };

    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenAI Generic Image Error: ${resp.status} ${truncate(text, 240)}`);
  }

  const data = await resp.json() as any;
  const imgUrl = data?.data?.[0]?.url;
  const b64 = data?.data?.[0]?.b64_json;

  let bytes: Buffer;
  if (b64) {
    bytes = Buffer.from(b64, 'base64');
  } else if (imgUrl) {
    const dlResp = await fetch(imgUrl, {});
    if (!dlResp.ok) throw new Error(`Failed to download image from ${imgUrl}`);
    const arr = await dlResp.arrayBuffer();
    bytes = Buffer.from(arr);
  } else {
    throw new Error('No url or b64_json returned in generic OpenAI response');
  }

  return { bytes, providerNote: `openai-generic/${ctx.wireModel} · ${bytes.length} bytes`, suggestedExt: '.png' };
}

export async function renderOpenAIGenericTTS(ctx: MediaContext, credentials: ProviderConfig, onProgress?: ProgressFn): Promise<RenderResult> {
  if (!credentials.apiKey) throw new Error('no API key for generic OpenAI provider');
  if (!credentials.baseUrl) throw new Error('no Base URL for generic OpenAI provider');

  const baseUrl = credentials.baseUrl.replace(/\/$/, '');
  const url = `${baseUrl}/audio/speech`;

  const body = {
    model: ctx.wireModel,
    input: ctx.prompt || 'Hello',
    voice: ctx.voice || 'alloy',
    response_format: 'mp3',
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${credentials.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenAI Generic TTS Error: ${resp.status} ${text}`);
  }

  const arr = await resp.arrayBuffer();
  const bytes = Buffer.from(arr);

  return { bytes, providerNote: `openai-generic/${ctx.wireModel} · ${bytes.length} bytes`, suggestedExt: '.mp3' };
}

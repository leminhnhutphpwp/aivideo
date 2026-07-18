import type { MediaContext, ProviderConfig, RenderResult } from '../types.js';
import { truncate } from '../render-utils.js';

export async function renderCloudflareImage(ctx: MediaContext, credentials: ProviderConfig): Promise<RenderResult> {
  if (!credentials.apiKey) {
    throw new Error('no Cloudflare API key');
  }
  if (!credentials.baseUrl) {
    throw new Error('no Cloudflare base URL');
  }
  const baseUrl = credentials.baseUrl.replace(/\/$/, '');
  const prompt = (ctx.prompt && ctx.prompt.trim()) || 'A beautiful image';
  const model = ctx.model;
  const isI2i = ctx.modelDef.caps.includes('i2i') && ctx.imageRef;

  if (isI2i) {
    const imageData = ctx.imageRef!;
    let imageBlob: Blob | null = null;
    if (imageData.dataUrl) {
      const resp = await fetch(imageData.dataUrl);
      if (!resp.ok) throw new Error(`cloudflare i2i: failed to fetch reference image (${resp.status})`);
      imageBlob = await resp.blob();
    } else if (imageData.abs) {
      const { readFile } = await import('node:fs/promises');
      const buf = await readFile(imageData.abs);
      imageBlob = new Blob([buf], { type: imageData.mime || 'image/png' });
    }
    if (!imageBlob) throw new Error('cloudflare i2i: no valid reference image');

    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('image', imageBlob, 'reference.png');
    formData.append('model', model);

    const resp = await fetch(baseUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${credentials.apiKey}` },
      body: formData,
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`cloudflare i2i ${resp.status}: ${truncate(errText, 240)}`);
    }
    const arr = await resp.arrayBuffer();
    const bytes = Buffer.from(arr);
    return { bytes, providerNote: `cloudflare/${model} · ${bytes.length} bytes`, suggestedExt: '.jpg' };
  }

  const body = JSON.stringify({ prompt, model });
  const resp = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
      'Content-Type': 'application/json',
    },
    body,
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`cloudflare t2i ${resp.status}: ${truncate(errText, 240)}`);
  }
  const arr = await resp.arrayBuffer();
  if (arr.byteLength === 0) throw new Error('cloudflare t2i returned zero bytes');
  const bytes = Buffer.from(arr);
  return { bytes, providerNote: `cloudflare/${model} · ${bytes.length} bytes`, suggestedExt: '.jpg' };
}

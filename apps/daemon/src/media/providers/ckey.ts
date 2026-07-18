import type { MediaContext, ProviderConfig, RenderResult } from '../types.js';
import { truncate, CKEY_DEFAULT_VOICE_ID } from '../render-utils.js';

export async function renderCKeyTTS(ctx: MediaContext, credentials: ProviderConfig): Promise<RenderResult> {
  if (!credentials.apiKey) {
    throw new Error('no CKey API key');
  }
  if (!credentials.baseUrl) {
    throw new Error('no CKey base URL');
  }
  const baseUrl = credentials.baseUrl.replace(/\/$/, '');
  // Voice is optional at the provider boundary (pipeline passes `voice || ''`) — fall back to
  // the default Vietnamese voice so a TTS render without an explicit voice still succeeds.
  const voiceId = (ctx.voice && ctx.voice.trim()) || CKEY_DEFAULT_VOICE_ID;
  const text = (ctx.prompt && ctx.prompt.trim()) || 'Xin chào';

  const body = { model: voiceId, input: text, format: 'mp3' };
  const resp = await fetch(`${baseUrl}/audio/speech`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${credentials.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`ckey tts ${resp.status}: ${truncate(err, 240)}`);
  }
  const arr = await resp.arrayBuffer();
  const bytes = Buffer.from(arr);
  if (bytes.length === 0) throw new Error('ckey tts returned zero bytes');
  return { bytes, providerNote: `ckey/${voiceId} · ${bytes.length} bytes`, suggestedExt: '.mp3' };
}

export async function renderCKeyImage(ctx: MediaContext, credentials: ProviderConfig): Promise<RenderResult> {
  if (!credentials.apiKey) {
    throw new Error('no CKey API key');
  }
  if (!credentials.baseUrl) {
    throw new Error('no CKey base URL');
  }
  const baseUrl = credentials.baseUrl.replace(/\/$/, '');
  const prompt = (ctx.prompt && ctx.prompt.trim()) || 'A beautiful image';
  const size = ctx.aspect === '1:1' ? '1024x1024' : ctx.aspect === '16:9' ? '1792x1024' : ctx.aspect === '9:16' ? '1024x1792' : '1024x1024';

  const body = { model: ctx.wireModel, prompt, n: 1, size, response_format: 'b64_json' };
  const resp = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${credentials.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`ckey image ${resp.status}: ${truncate(text, 240)}`);
  let data: any;
  try { data = JSON.parse(text); } catch { throw new Error(`ckey image non-JSON: ${truncate(text, 200)}`); }
  const b64 = data?.data?.[0]?.b64_json || data?.data?.[0]?.url;
  if (!b64) throw new Error('ckey image response missing image data');
  if (b64.startsWith('http')) {
    const dlResp = await fetch(b64);
    if (!dlResp.ok) throw new Error(`ckey image fetch ${dlResp.status}`);
    const arr = await dlResp.arrayBuffer();
    const bytes = Buffer.from(arr);
    return { bytes, providerNote: `ckey/${ctx.wireModel} · ${bytes.length} bytes`, suggestedExt: '.png' };
  }
  const bytes = Buffer.from(b64, 'base64');
  return { bytes, providerNote: `ckey/${ctx.wireModel} · ${bytes.length} bytes`, suggestedExt: '.png' };
}

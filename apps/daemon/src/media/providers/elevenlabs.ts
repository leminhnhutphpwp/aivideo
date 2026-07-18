import type { MediaContext, ProviderConfig, RenderResult } from '../types.js';
import {
  truncate, ELEVENLABS_DEFAULT_BASE_URL, ELEVENLABS_DEFAULT_VOICE_ID,
  ELEVENLABS_TTS_MODEL_MAP, ELEVENLABS_SFX_MODEL_MAP,
  ELEVENLABS_SFX_MAX_PROMPT_CHARS, ELEVENLABS_SFX_DEFAULT_PROMPT_INFLUENCE,
  clampElevenLabsSfxDuration, clampElevenLabsSfxPromptInfluence,
} from '../render-utils.js';

export async function renderElevenLabsTTS(ctx: MediaContext, credentials: ProviderConfig): Promise<RenderResult> {
  if (!credentials.apiKey) {
    throw new Error('no ElevenLabs API key');
  }
  if (!credentials.baseUrl) {
    throw new Error('no ElevenLabs base URL');
  }
  const baseUrl = credentials.baseUrl.replace(/\/$/, '');
  // Voice is optional at the provider boundary (pipeline passes `voice || ''`) — fall back to
  // the default voice so a TTS render without an explicit voice still succeeds.
  const voiceId = (ctx.voice && ctx.voice.trim()) || ELEVENLABS_DEFAULT_VOICE_ID;
  const text = (ctx.prompt && ctx.prompt.trim()) || 'Hello';
  const modelId = ELEVENLABS_TTS_MODEL_MAP[ctx.wireModel] || 'eleven_turbo_v2_5';

  const body: Record<string, unknown> = {
    text,
    model_id: modelId,
    voice_settings: { stability: 0.5, similarity_boost: 0.75 },
  };

  if (ctx.language) {
    body.language = ctx.language;
  }

  const resp = await fetch(`${baseUrl}/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: 'POST',
    headers: {
      'xi-api-key': credentials.apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`elevenlabs tts ${resp.status}: ${truncate(err, 240)}`);
  }

  const arr = await resp.arrayBuffer();
  const bytes = Buffer.from(arr);
  if (bytes.length === 0) throw new Error('elevenlabs tts returned zero bytes');
  return {
    bytes,
    providerNote: `elevenlabs/${voiceId} · ${modelId} · ${bytes.length} bytes`,
    suggestedExt: '.mp3',
  };
}

export async function renderElevenLabsSFX(ctx: MediaContext, credentials: ProviderConfig): Promise<RenderResult> {
  if (!credentials.apiKey) {
    throw new Error('no ElevenLabs API key');
  }
  if (!credentials.baseUrl) {
    throw new Error('no ElevenLabs base URL');
  }
  const baseUrl = credentials.baseUrl.replace(/\/$/, '');
  const text = (ctx.prompt && ctx.prompt.trim());
  if (!text) {
    throw new Error('ElevenLabs SFX prompt must not be empty');
  }
  const promptChars = Array.from(text).length;
  if (promptChars > ELEVENLABS_SFX_MAX_PROMPT_CHARS) {
    throw new Error(
      `ElevenLabs SFX prompt exceeds ${ELEVENLABS_SFX_MAX_PROMPT_CHARS} characters (${promptChars}). Shorten --prompt.`
    );
  }

  const duration = clampElevenLabsSfxDuration(ctx.duration);
  const promptInfluence = clampElevenLabsSfxPromptInfluence(ctx.promptInfluence);
  const modelId = ELEVENLABS_SFX_MODEL_MAP[ctx.wireModel] || 'eleven_text_to_sound_v2';

  const body = {
    text,
    duration_seconds: duration,
    prompt_influence: promptInfluence,
    model_id: modelId,
  };

  const resp = await fetch(`${baseUrl}/v1/sound-generation`, {
    method: 'POST',
    headers: {
      'xi-api-key': credentials.apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`elevenlabs sfx ${resp.status}: ${truncate(err, 240)}`);
  }

  const arr = await resp.arrayBuffer();
  const bytes = Buffer.from(arr);
  if (bytes.length === 0) throw new Error('elevenlabs sfx returned zero bytes');
  return {
    bytes,
    providerNote: `elevenlabs/sfx · ${modelId} · ${bytes.length} bytes`,
    suggestedExt: '.mp3',
  };
}

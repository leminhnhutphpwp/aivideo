import { mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { resolveModelAlias, resolveProviderConfig } from './config.js';
import { findMediaModel, findProvider, modelsForSurface } from './models.js';
import {
  VIDEO_LENGTHS_SEC, AUDIO_DURATIONS_SEC,
} from './models.js';
import type { MediaModel, MediaProvider, MediaSurface, AudioKind } from './models.js';
import { ensureProject, sanitizeName, kindFor, mimeFor } from '../projects/index.js';
import {
  autoOutputName, defaultAspectFor, clampWithWarning, resolveProjectImage,
  stubsAllowed, errorMessage, SURFACES, AUDIO_KINDS, StubProviderDisabledError,
} from './render-utils.js';
import type { MediaContext, RenderResult, ImageRef } from './types.js';
import type { ProgressFn } from './types.js';
import type { ProviderConfig } from './types.js';

import { renderQwenCloudVideo, renderQwenCloudImage } from './providers/qwencloud.js';
import { renderCKeyTTS, renderCKeyImage } from './providers/ckey.js';
import { renderCloudflareImage } from './providers/cloudflare.js';
import { renderStub } from './providers/stub.js';
import { renderElevenLabsTTS, renderElevenLabsSFX } from './providers/elevenlabs.js';
import { renderOpenAIGenericImage, renderOpenAIGenericTTS } from './providers/openai-generic.js';
import { withSimulation } from './simulation/index.js';

type RenderFn = (ctx: MediaContext, credentials: ProviderConfig, onProgress?: ProgressFn) => Promise<RenderResult>;

const RENDER_REGISTRY = new Map<string, RenderFn>([
  ['qwencloud:video:*', withSimulation(renderQwenCloudVideo, 'video')],
  ['qwencloud:image:*', withSimulation(renderQwenCloudImage, 'image')],
  ['ckey:audio:speech', withSimulation(renderCKeyTTS, 'audio')],
  ['ckey:image:*', withSimulation(renderCKeyImage, 'image')],
  ['elevenlabs:audio:speech', withSimulation(renderElevenLabsTTS, 'audio')],
  ['elevenlabs:audio:sfx', withSimulation(renderElevenLabsSFX, 'audio')],
  ['cloudflare:image:*', withSimulation(renderCloudflareImage, 'image')],
  ['openai:generic:image:*', withSimulation(renderOpenAIGenericImage, 'image')],
  ['openai:generic:audio:*', withSimulation(renderOpenAIGenericTTS, 'audio')],
  // First-class 'openai' provider (xah.io) — routes by provider id alone, so a
  // registered model (e.g. wan2.7-image) works without the caller passing protocol.
  ['openai:image:*', withSimulation(renderOpenAIGenericImage, 'image')],
  ['openai:audio:*', withSimulation(renderOpenAIGenericTTS, 'audio')],
]);

function resolveRenderer(providerId: string, surface: string, audioKind?: string, protocol?: string): RenderFn | null {
  if (protocol && protocol !== 'auto') {
    const genericRenderer = RENDER_REGISTRY.get(`${protocol}:generic:${surface}:${audioKind ?? '*'}`)
      ?? RENDER_REGISTRY.get(`${protocol}:generic:${surface}:*`);
    if (genericRenderer) return genericRenderer;
  }
  return RENDER_REGISTRY.get(`${providerId}:${surface}:${audioKind ?? '*'}`)
    ?? RENDER_REGISTRY.get(`${providerId}:${surface}:*`)
    ?? null;
}

export async function generateMedia(args: {
  projectRoot: string; projectsRoot: string; projectId: string; surface: MediaSurface; model: string;
  prompt?: string; negativePrompt?: string; output?: string; aspect?: string; length?: number; duration?: number; voice?: string;
  audioKind?: AudioKind; language?: string; loop?: boolean; promptInfluence?: number;
  compositionDir?: string; image?: string; images?: string[]; voices?: string[]; lastFrame?: string;
  videoRef?: string;
  referenceImages?: string[]; audioSetting?: string; mode?: string; watermark?: boolean; thinkingMode?: boolean; seed?: number; onProgress?: ProgressFn;
  shotType?: string; multiPanelImage?: string;
  providerId?: string;
  credentials?: { apiKey?: string | null; baseUrl?: string | null; providerId?: string | null };
  protocol?: string;
}) {
  const {
    projectRoot, projectsRoot, projectId, surface, model, prompt, negativePrompt, output, aspect,
    length, duration, voice, audioKind, language, loop, promptInfluence, compositionDir, image, images, voices,
    videoRef: videoRefFilename, referenceImages, audioSetting, mode, watermark, providerId, protocol,
  } = args;

  if (!projectRoot) throw new Error('projectRoot required');
  if (!projectsRoot) throw new Error('projectsRoot required');
  if (typeof projectId !== 'string' || !projectId) {
    throw new Error('projectId required');
  }
  if (!SURFACES.has(surface)) {
    throw new Error(`unsupported surface: ${surface}`);
  }
  if (typeof model !== 'string' || !model) {
    throw new Error('model required');
  }
  if (surface === 'audio' && audioKind && !AUDIO_KINDS.has(audioKind)) {
    throw new Error(`unsupported audioKind: ${audioKind}. Allowed: music | speech | sfx.`);
  }
  const resolvedModel = await resolveModelAlias(projectRoot, model);
  let def = findMediaModel(resolvedModel);
  if (!def && args.providerId) {
    def = {
      id: resolvedModel,
      label: resolvedModel,
      hint: 'Dynamic model from backend',
      provider: args.providerId,
      caps: [],
    };
  }
  if (!def) {
    throw new Error(`unknown model: ${resolvedModel}. Pass --model from the registered list (see /api/media/models) or supply provider_id.`);
  }
  const resolvedAudioKind = surface === 'audio' ? audioKind || 'music' : undefined;
  const allowed = modelsForSurface(surface, resolvedAudioKind);
  if (!allowed.some((m) => m.id === def.id) && !args.providerId) {
    const ids = allowed.map((m) => m.id).join(', ');
    const where = surface === 'audio' ? `audio · ${resolvedAudioKind}` : surface;
    throw new Error(`model "${model}" is not registered for surface "${where}". Allowed: ${ids}.`);
  }
  const wireModel = def.wireModel || def.id;

  const lengthClamp = surface === 'video'
    ? clampWithWarning(length, VIDEO_LENGTHS_SEC, 'length')
    : { value: undefined, warning: null };
  const usesProviderSpecificAudioDuration = def.provider === 'elevenlabs' && surface === 'audio' && resolvedAudioKind === 'sfx';
  const durationClamp = surface === 'audio' && !usesProviderSpecificAudioDuration
    ? clampWithWarning(duration, AUDIO_DURATIONS_SEC, 'duration')
    : { value: undefined, warning: null };
  const clampedLength = lengthClamp.value;
  const clampedDuration = usesProviderSpecificAudioDuration ? duration : durationClamp.value;
  const warnings = [lengthClamp.warning, durationClamp.warning].filter(Boolean);

  const dir = await ensureProject(projectsRoot, projectId);
  const safeOut = sanitizeName(output || autoOutputName(surface, model, resolvedAudioKind));
  const target = path.join(dir, safeOut);
  await mkdir(path.dirname(target), { recursive: true });

  const imageRef = await resolveProjectImage(image, dir);
  const videoRef = await resolveProjectImage(videoRefFilename, dir);
  const lastFrameRef = await resolveProjectImage(args.lastFrame, dir);
  const allImages = [...(images || [])];
  if (image && !allImages.includes(image)) {
    allImages.unshift(image);
  }
  const imageRefs = allImages.length > 0
    ? (await Promise.all(allImages.map(f => resolveProjectImage(f, dir)))).filter(Boolean) as ImageRef[]
    : undefined;
  const voiceRefs: (ImageRef | null)[] | undefined = voices && voices.length > 0
    ? (await Promise.all(voices.map(f => f ? resolveProjectImage(f, dir) : Promise.resolve(null))))
    : undefined;
  const referenceImageRefs = referenceImages && referenceImages.length > 0
    ? (await Promise.all(referenceImages.map(f => resolveProjectImage(f, dir)))).filter(Boolean) as ImageRef[]
    : undefined;
  const multiPanelImageRef = args.multiPanelImage ? await resolveProjectImage(args.multiPanelImage, dir) : null;

  const ctx = {
    surface, model, wireModel, modelDef: def, provider: findProvider(def.provider),
    prompt: prompt || '', negativePrompt: negativePrompt || undefined,
    aspect: aspect || defaultAspectFor(surface),
    length: clampedLength, duration: clampedDuration, voice: voice || '',
    audioKind: resolvedAudioKind, language: language || '', loop: loop === true,
    promptInfluence: typeof promptInfluence === 'number' && Number.isFinite(promptInfluence) ? promptInfluence : undefined,
    compositionDir: typeof compositionDir === 'string' ? compositionDir : null,
    imageRef, videoRef, imageRefs, voiceRefs, lastFrameRef, referenceImageRefs,
    audioSetting,
    mode,
    watermark: watermark === true,
    thinkingMode: args.thinkingMode,
    seed: typeof args.seed === 'number' && Number.isFinite(args.seed) ? args.seed : undefined,
    shotType: (args.shotType === 'multi' ? 'multi' : undefined) as 'single' | 'multi' | undefined,
    multiPanelImage: multiPanelImageRef || undefined,
  };

  let credentials = await resolveProviderConfig(projectRoot, def.provider);
  if (args.credentials?.apiKey) {
    credentials = {
      ...credentials,
      apiKey: args.credentials.apiKey,
      baseUrl: args.credentials.baseUrl || credentials.baseUrl,
    };
  }
  let bytes: Buffer;
  let providerNote: string;
  let suggestedExt: string | undefined;
  let activeProviderId = def.provider;
  let providerError: string | null = null;
  let usedStubFallback = false;
  let intentionalStub = false;
  try {
    const renderer = resolveRenderer(def.provider, surface, ctx.audioKind, protocol);
    if (renderer) {
      const result = await renderer(ctx, credentials, args.onProgress);
      bytes = result.bytes; providerNote = result.providerNote; suggestedExt = result.suggestedExt;
    } else {
      if (!stubsAllowed()) {
        throw new StubProviderDisabledError(model);
      }
      const result = await renderStub(ctx, safeOut);
      bytes = result.bytes; providerNote = result.providerNote; intentionalStub = true;
    }
  } catch (err) {
    if (err instanceof StubProviderDisabledError) { throw err; }
    if (!stubsAllowed()) { throw err; }
    const stub = await renderStub(ctx, safeOut);
    bytes = stub.bytes;
    const msg = errorMessage(err);
    providerNote = `[${activeProviderId} error → stub] ${msg}`;
    providerError = msg;
    usedStubFallback = true;
    intentionalStub = true;
    try { console.error(`[media] ${activeProviderId}/${surface}/${model} failed: ${msg}`); } catch {}
  }
  if (intentionalStub || usedStubFallback) {
    providerNote = `[stub] ${providerNote}`;
  }

  let finalOut = safeOut;
  if (suggestedExt) {
    const dot = safeOut.lastIndexOf('.');
    const stem = dot > 0 ? safeOut.slice(0, dot) : safeOut;
    finalOut = `${stem}${suggestedExt}`;
  }
  const finalTarget = path.join(dir, finalOut);
  await writeFile(finalTarget, bytes);
  const st = await stat(finalTarget);
  return {
    name: finalOut, size: st.size, mtime: st.mtimeMs, kind: kindFor(finalOut),
    mime: mimeFor(finalOut), model, surface, providerNote, providerId: activeProviderId, providerError,
    usedStubFallback, intentionalStub, warnings,
  };
}

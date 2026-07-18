// Derived from providers.ts — single source of truth.
// Backward-compatible exports maintained for existing consumers.

import { ALL_PROVIDERS, getProvider, type ProviderConfig } from './providers.js';

export type MediaSurface = 'image' | 'video' | 'audio';
export type AudioKind = 'music' | 'speech' | 'sfx';

// Re-export types from providers for backward compat
export type MediaProvider = Omit<ProviderConfig, 'apiKeyEnv' | 'models' | 'tts' | 'llm'>;

export type MediaModel = {
  id: string;
  label: string;
  hint: string;
  provider: string;
  caps: string[];
  default?: boolean;
  /** Wire identifier for the provider API when it differs from `id`. Falls back to `id`. */
  wireModel?: string;
  /** Aspect ratios this model accepts. Omit = all MEDIA_ASPECTS. */
  aspects?: string[];
};

export const MEDIA_PROVIDERS: MediaProvider[] = ALL_PROVIDERS.map(p => ({
  id: p.id,
  label: p.label,
  hint: p.hint,
  integrated: p.integrated,
  defaultBaseUrl: p.defaultBaseUrl,
  docsUrl: p.docsUrl,
  credentialsRequired: p.credentialsRequired,
  settingsVisible: p.settingsVisible,
  supportsCustomModel: p.supportsCustomModel,
  customModelPlaceholder: p.customModelPlaceholder,
}));

export const IMAGE_MODELS: MediaModel[] = ALL_PROVIDERS.flatMap(p =>
  p.models.filter(m => m.caps.some(c => ['t2i', 'i2i', 'inpaint'].includes(c)))
    .map(m => ({ ...m, provider: p.id }))
);

export const VIDEO_MODELS: MediaModel[] = ALL_PROVIDERS.flatMap(p =>
  p.models.filter(m => m.caps.some(c => ['t2v', 'i2v', 'r2v', 'video-edit', 'character-anim', 'audio'].includes(c)))
    .map(m => ({ ...m, provider: p.id }))
);

export const AUDIO_MODELS_BY_KIND: Record<AudioKind, MediaModel[]> = {
  music: ALL_PROVIDERS.flatMap(p =>
    p.models.filter(m => m.caps.includes('music')).map(m => ({ ...m, provider: p.id }))
  ),
  speech: ALL_PROVIDERS.flatMap(p =>
    p.models.filter(m => m.caps.includes('tts')).map(m => ({ ...m, provider: p.id }))
  ),
  sfx: ALL_PROVIDERS.flatMap(p =>
    p.models.filter(m => m.caps.includes('sfx')).map(m => ({ ...m, provider: p.id }))
  ),
};

export const MEDIA_ASPECTS = ['1:1', '16:9', '9:16', '4:3', '3:4'];
export const VIDEO_LENGTHS_SEC = [3, 5, 8, 10, 15, 30];
export const AUDIO_DURATIONS_SEC = [5, 10, 15, 30, 60, 120];

export function findMediaModel(id: string): MediaModel | null {
  const all = [
    ...IMAGE_MODELS, ...VIDEO_MODELS,
    ...AUDIO_MODELS_BY_KIND.music, ...AUDIO_MODELS_BY_KIND.speech, ...AUDIO_MODELS_BY_KIND.sfx,
  ];
  return all.find(m => m.id === id || m.label === id) || null;
}

export function findProvider(id: string): MediaProvider | null {
  return MEDIA_PROVIDERS.find(p => p.id === id) || null;
}

export function modelsForSurface(surface: MediaSurface, audioKind?: AudioKind): MediaModel[] {
  if (surface === 'image') return IMAGE_MODELS;
  if (surface === 'video') return VIDEO_MODELS;
  if (surface === 'audio') {
    const k = audioKind || 'music';
    return AUDIO_MODELS_BY_KIND[k] || AUDIO_MODELS_BY_KIND.music;
  }
  return [];
}

import type { MediaModel, MediaProvider, MediaSurface, AudioKind } from './models.js';

export type { MediaModel, MediaProvider, MediaSurface, AudioKind };

export type ProviderConfig = { apiKey?: string; baseUrl?: string; model?: string };
export type ProgressFn = (message: string) => void;
export type ImageRef = { path: string; abs: string; mime: string; size: number; dataUrl?: string };
export type MediaContext = {
  surface: MediaSurface;
  model: string;
  wireModel: string;
  modelDef: MediaModel;
  provider: MediaProvider | null;
  prompt: string;
  negativePrompt?: string;
  aspect: string | undefined;
  length: number | undefined;
  duration: number | undefined;
  voice: string;
  audioKind: AudioKind | undefined;
  language: string;
  loop: boolean;
  promptInfluence: number | undefined;
  compositionDir: string | null;
  imageRef: ImageRef | null;
  videoRef: ImageRef | null;
  imageRefs?: ImageRef[];
  voiceRefs?: (ImageRef | null)[];
  lastFrameRef: ImageRef | null;
  referenceImageRefs?: ImageRef[];
  audioSetting?: string;
  mode?: string;
  watermark?: boolean;
  thinkingMode?: boolean;
  seed?: number;
  shotType?: 'single' | 'multi';
  multiPanelImage?: ImageRef;
};
export type RenderResult = { bytes: Buffer; providerNote: string; suggestedExt?: string };
export type JsonRecord = Record<string, unknown>;

export class StubProviderDisabledError extends Error {
  code = 'STUB_PROVIDER_DISABLED';
  status = 503;
  constructor(model: string) {
    super(
      `provider not configured: ${model}. Add your API key in Settings -> Media Providers to enable real generation.`,
    );
    this.name = 'StubProviderDisabledError';
  }
}

export const DEFAULT_OUTPUT_BY_SURFACE: Record<string, string> = {
  image: 'image.png',
  video: 'video.mp4',
  audio: 'audio.mp3',
};

export const SURFACES = new Set(['image', 'video', 'audio']);
export const AUDIO_KINDS = new Set(['music', 'speech', 'sfx']);

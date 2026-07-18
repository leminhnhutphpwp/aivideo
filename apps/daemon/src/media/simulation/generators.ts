import type { MediaContext, RenderResult } from '../types.js';
import { generateSimulatedImage } from './generators-image.js';
import { generateSimulatedVideo } from './generators-video.js';
import { generateSimulatedAudio } from './generators-audio.js';

export async function generateSimulatedFile(ctx: MediaContext, surface: string): Promise<RenderResult> {
  const note = `[SIMULATION] ${ctx.model} · ${surface} · ${(ctx.prompt || '').slice(0, 60)}`;

  if (surface === 'image') {
    const bytes = generateSimulatedImage(ctx);
    return { bytes, suggestedExt: '.png', providerNote: note };
  }

  if (surface === 'video') {
    const bytes = await generateSimulatedVideo(ctx);
    return { bytes, suggestedExt: '.mp4', providerNote: note };
  }

  if (surface === 'audio') {
    const bytes = await generateSimulatedAudio(ctx);
    return { bytes, suggestedExt: '.wav', providerNote: note };
  }

  throw new Error(`unsupported surface for simulation: ${surface}`);
}

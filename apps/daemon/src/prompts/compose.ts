/**
 * Video Prompt Composer
 *
 * Main entry point for the daemon's video prompt pipeline. Composes an
 * enriched, provider-ready prompt from structured user input by stacking
 * multiple enrichment layers in order:
 *
 *   1. Discovery     — validate inputs, identify missing fields
 *   2. Direction     — resolve preset, inject template + keywords
 *   3. Enrichment    — weave style/mood/camera/lighting into prompt
 *   4. Validation    — clamp parameters, anti-slop check
 *   5. Return        — enriched prompt text + metadata for the provider
 *
 * Inspired by Open Design's `system.ts` prompt composer — same layered
 * architecture, adapted for video generation instead of code-driven design.
 */

import {
  composeVideoPrompt,
  composeVideoPromptSimple,
  validateAspect,
  validateLength,
  type PromptEnrichInput,
  type EnrichedPrompt,
} from './video-contract.js';
import { runDiscovery, type DiscoveryInput, type DiscoveryResult } from './video-discovery.js';
import { findDirectionById, VIDEO_DIRECTIONS } from './video-directions.js';

// ============================================================================
// Re-export everything for convenience
// ============================================================================

export { VIDEO_DIRECTIONS, findDirectionById } from './video-directions.js';
export type { VideoDirection } from './video-directions.js';
export { composeVideoPrompt, composeVideoPromptSimple } from './video-contract.js';
export type { PromptEnrichInput, EnrichedPrompt } from './video-contract.js';
export { runDiscovery } from './video-discovery.js';
export type { DiscoveryInput, DiscoveryResult, DiscoveryQuestion } from './video-discovery.js';

// ============================================================================
// Composite result
// ============================================================================

export interface VideoGenerateParams {
  /** Enriched prompt text — ready to pass to the provider via generateMedia() */
  prompt: string;
  /** Validated aspect ratio */
  aspect: string;
  /** Clamped duration in seconds */
  length: number;
  /** Model ID */
  model: string;
  /** Surface type */
  surface: 'video';
  /** Image reference for i2v (project-relative path) */
  image?: string;
  /** Enrichment metadata for logging / debugging */
  metadata: EnrichedPrompt['metadata'] & {
    discoveryReady: boolean;
    directionApplied: boolean;
  };
}

export interface ComposeInput {
  prompt: string;
  model: string;
  provider: string;
  surface: string;
  aspect?: string;
  length?: number;
  style?: string;
  mood?: string;
  camera?: string;
  lighting?: string;
  negativePrompt?: string;
  direction?: string;
  image?: string;
  supportsI2v?: boolean;
}

// ============================================================================
// Main compose function
// ============================================================================

/**
 * Compose all layers and produce the final generateMedia() parameters.
 *
 * This is the function called by the server route handler. It takes the
 * raw request body fields and produces:
 *   - An enriched prompt text
 *   - Validated aspect ratio and duration
 *   - Metadata for logging
 *   - Discovery warnings if the input needs improvement
 */
export function compose(input: ComposeInput): {
  params: VideoGenerateParams;
  discovery: DiscoveryResult;
} {
  // 1. Run discovery
  const discovery = runDiscovery({
    prompt: input.prompt,
    direction: input.direction,
    style: input.style,
    mood: input.mood,
    camera: input.camera,
    lighting: input.lighting,
    negativePrompt: input.negativePrompt,
    model: input.model,
    aspect: input.aspect,
    length: input.length,
    surface: input.surface,
    provider: input.provider,
  });

  // 2. Validate parameters
  const aspectResult = validateAspect(input.aspect);
  const lengthResult = validateLength(input.length);

  // 3. Enrich the prompt
  const enriched = composeVideoPrompt({
    prompt: input.prompt,
    surface: input.surface as any,
    model: input.model,
    provider: input.provider,
    style: input.style,
    mood: input.mood,
    camera: input.camera,
    lighting: input.lighting,
    negativePrompt: input.negativePrompt,
    direction: input.direction,
    aspect: aspectResult.fallback,
    length: lengthResult.clamped,
    supportsI2v: input.supportsI2v,
    imageRef: input.image,
  });

  // 4. Build the output
  const params: VideoGenerateParams = {
    prompt: enriched.text,
    aspect: aspectResult.fallback,
    length: lengthResult.clamped,
    model: input.model,
    surface: 'video',
    image: input.image || undefined,
    metadata: {
      ...enriched.metadata,
      discoveryReady: discovery.ready,
      directionApplied: !!enriched.metadata.directionId,
    },
  };

  return { params, discovery };
}

/**
 * Minimal compose — just enriches prompt without discovery or validation.
 * For cases where the frontend has already validated all fields.
 */
export function composeMinimal(prompt: string, model: string, provider: string): VideoGenerateParams {
  const enriched = composeVideoPromptSimple(prompt);
  return {
    prompt: enriched.text,
    aspect: '16:9',
    length: 5,
    model,
    surface: 'video',
    metadata: {
      ...enriched.metadata,
      discoveryReady: true,
      directionApplied: false,
    },
  };
}

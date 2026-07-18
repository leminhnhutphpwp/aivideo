/**
 * Image Prompt Composer
 *
 * Main entry point for the daemon's image prompt pipeline. Composes an
 * enriched, provider-ready prompt from structured user input by stacking
 * multiple enrichment layers in order:
 *
 *   1. Direction     — resolve preset, inject template + keywords
 *   2. Enrichment    — weave style + mood + visual elements into prompt
 *   3. Anti-slop     — validate prompt quality
 *   4. Return        — enriched prompt text + metadata for the provider
 */

import {
  composeImagePrompt,
  composeImagePromptSimple,
  type ImagePromptEnrichInput,
  type ImageEnrichedPrompt,
} from './image-contract.js';
import { findDirectionById, IMAGE_DIRECTIONS } from './image-directions.js';

// ============================================================================
// Re-export everything
// ============================================================================

export { IMAGE_DIRECTIONS, findDirectionById } from './image-directions.js';
export type { ImageDirection } from './image-directions.js';
export { composeImagePrompt, composeImagePromptSimple } from './image-contract.js';
export type { ImagePromptEnrichInput, ImageEnrichedPrompt } from './image-contract.js';

// ============================================================================
// Types
// ============================================================================

export interface ImageGenerateParams {
  prompt: string;
  /** Terms for the provider's dedicated negative_prompt field (skill defaults + user). */
  negativePrompt?: string;
  aspect: string;
  model: string;
  surface: 'image';
  metadata: ImageEnrichedPrompt['metadata'] & {
    directionApplied: boolean;
  };
}

export interface ImageComposeInput {
  prompt: string;
  model: string;
  provider: string;
  aspect?: string;
  style?: string;
  negativePrompt?: string;
}

// ============================================================================
// Main compose function
// ============================================================================

export function composeImage(input: ImageComposeInput): {
  params: ImageGenerateParams;
} {
  // 1. Enrich the prompt
  const enriched = composeImagePrompt({
    prompt: input.prompt,
    model: input.model,
    provider: input.provider,
    style: input.style,
    negativePrompt: input.negativePrompt,
    aspect: input.aspect,
  });

  // 2. Build output
  const params: ImageGenerateParams = {
    prompt: enriched.text,
    negativePrompt: enriched.negative || undefined,
    aspect: input.aspect || '1:1',
    model: input.model,
    surface: 'image',
    metadata: {
      ...enriched.metadata,
      directionApplied: !!enriched.metadata.directionId,
    },
  };

  return { params };
}

/**
 * Minimal compose — just enriches prompt without model awareness.
 */
export function composeImageMinimal(prompt: string): ImageGenerateParams {
  const enriched = composeImagePromptSimple(prompt);
  return {
    prompt: enriched.text,
    aspect: '1:1',
    model: '',
    surface: 'image',
    metadata: {
      ...enriched.metadata,
      directionApplied: false,
    },
  };
}

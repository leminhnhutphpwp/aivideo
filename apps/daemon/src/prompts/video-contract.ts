/**
 * Video Generation Contract
 *
 * Core prompt enrichment engine + provider constraints + anti-slop rules.
 * Transforms raw user input (prompt + style/mood/camera/lighting/direction)
 * into a rich, provider-ready prompt that the AI video model can effectively
 * interpret.
 *
 * Architecture:
 *   1. Direction resolution — find preset or use custom values
 *   2. Prompt enrichment    — weave style/mood/camera/lighting into the prompt
 *   3. Provider adaptation  — add provider-specific flags/formatting
 *   4. Anti-slop validation — reject low-quality prompt patterns
 *   5. Parameter validation — clamp duration, validate aspect ratio
 *
 * Inspired by Open Design's media-contract.ts — hard rules that override
 * softer prompt-building instincts.
 */

import { VIDEO_DIRECTIONS, type VideoDirection, findDirectionById } from './video-directions.js';
import type { MediaSurface } from '../media/models.js';

// ============================================================================
// Types
// ============================================================================

export interface PromptEnrichInput {
  prompt: string;
  surface: MediaSurface;
  model: string;
  provider: string;
  style?: string;
  mood?: string;
  camera?: string;
  lighting?: string;
  negativePrompt?: string;
  direction?: string;
  aspect?: string;
  length?: number;
  supportsI2v?: boolean;
  imageRef?: string;
}

export interface EnrichedPrompt {
  text: string;
  warnings: string[];
  errors: string[];
  metadata: {
    directionId?: string;
    keywords: string[];
    antiSlopScore: number;
    estimatedQuality: 'low' | 'medium' | 'high';
    providerHints: string[];
  };
}

// ============================================================================
// Prompt enrichment engine
// ============================================================================

/**
 * Build a quality suffix from style/mood/camera/lighting/direction keywords.
 *
 * Strategy: quality keywords at the END of the prompt act as a "director's
 * note" — AI video models weight trailing keywords heavily. We sort them by
 * category so the model gets a coherent style brief, not a bag of random
 * words.
 */
function buildQualitySuffix(input: PromptEnrichInput, direction?: VideoDirection): string {
  const parts: string[] = [];

  // 1. Style layer — the primary visual identity
  if (input.style && input.style !== 'Cinematic') {
    parts.push(`${input.style.toLowerCase()} style`);
  }

  // 2. Mood layer — emotional tone
  if (input.mood && input.mood !== 'Dramatic') {
    parts.push(`${input.mood.toLowerCase()} atmosphere`);
  }

  // 3. Camera layer — movement and framing
  const cam = input.camera ?? 'Fixed';
  if (cam !== 'Fixed') {
    parts.push(`${cam.toLowerCase()} camera movement`);
  }

  // 4. Lighting layer — illumination quality
  const lit = input.lighting ?? 'Natural';
  if (lit !== 'Natural') {
    parts.push(`${lit.toLowerCase()} lighting`);
  }

  // 5. Direction keywords — curated presets
  if (direction) {
    for (const kw of direction.styleKeywords.slice(0, 3)) {
      if (!parts.some(p => p.includes(kw))) {
        parts.push(kw);
      }
    }
  }

  return parts.join(', ');
}

/**
 * Build a negative prompt block.
 * Some providers support negative prompts; for those that don't,
 * we weave avoidance terms into the positive prompt instead.
 */
function buildNegativeBlock(input: PromptEnrichInput): string {
  if (!input.negativePrompt?.trim()) return '';
  const negativeItems = input.negativePrompt
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(Boolean);
  if (negativeItems.length === 0) return '';
  return `avoid: ${negativeItems.join(', ')}`;
}

/**
 * Anti-slop validation rules.
 *
 * Returns an array of warnings detected in the prompt. Higher score = more
 * slop detected. Score 0 = perfectly clean.
 */
function runAntiSlopCheck(prompt: string): { score: number; warnings: string[] } {
  const warnings: string[] = [];
  let score = 0;

  // P0 — critical slop patterns
  const p0Patterns: Array<{ pattern: RegExp; label: string; weight: number }> = [
    { pattern: /^\s*$/, label: 'Prompt is empty', weight: 10 },
    { pattern: /^make.{0,20}video/i, label: 'Prompt is a meta-instruction, not a visual description', weight: 8 },
    { pattern: /^generate.{0,20}video/i, label: 'Prompt is a meta-instruction, not a visual description', weight: 8 },
    { pattern: /^create.{0,20}video/i, label: 'Prompt is a meta-instruction, not a visual description', weight: 8 },
    { pattern: /^\W{0,5}$/, label: 'Prompt contains only punctuation', weight: 7 },
    { pattern: /^test\b/i, label: 'Prompt is a test placeholder, not a real description', weight: 6 },
  ];

  for (const { pattern, label, weight } of p0Patterns) {
    if (pattern.test(prompt)) {
      warnings.push(`P0-CRITICAL: ${label}`);
      score += weight;
    }
  }

  // P1 — quality issues
  const p1Patterns: Array<{ pattern: RegExp; label: string; weight: number }> = [
    { pattern: /^.{1,15}$/, label: 'Prompt too short (< 15 characters) — add more visual detail', weight: 4 },
    { pattern: /lorem ipsum/i, label: 'Prompt contains placeholder text (lorem ipsum)', weight: 5 },
    { pattern: /placeholder/i, label: 'Prompt contains the word "placeholder"', weight: 3 },
    { pattern: /todo/i, label: 'Prompt contains "TODO" placeholder', weight: 3 },
    { pattern: /^[a-z\s]{1,30}$/, label: 'Very short, low-detail prompt — consider adding subject, action, setting', weight: 3 },
    { pattern: /beautiful|stunning|amazing|incredible|awesome|perfect/i, label: 'Prompt uses subjective adjectives — replace with concrete visual terms', weight: 2 },
    { pattern: /high quality|high definition|ultra hd|8k|4k/i, label: 'Prompt uses generic quality tags — the model already optimizes for quality', weight: 1 },
  ];

  for (const { pattern, label, weight } of p1Patterns) {
    if (pattern.test(prompt)) {
      warnings.push(`P1-QUALITY: ${label}`);
      score += weight;
    }
  }

  // P2 — style suggestions
  const p2Patterns: Array<{ pattern: RegExp; label: string; weight: number }> = [
    { pattern: /^.{1,80}$/, label: 'Prompt on the short side — more detail helps the model understand intent', weight: 1 },
  ];

  for (const { pattern, label, weight } of p2Patterns) {
    if (pattern.test(prompt)) {
      warnings.push(`P2-SUGGEST: ${label}`);
      score += weight;
    }
  }

  return { score: Math.min(score, 20), warnings };
}

/**
 * Estimate output quality based on prompt characteristics.
 */
function estimateQuality(prompt: string, antiSlopScore: number): 'low' | 'medium' | 'high' {
  if (antiSlopScore >= 6) return 'low';
  if (prompt.length < 30) return 'low';
  if (prompt.length < 80) return 'medium';
  return 'high';
}

// ============================================================================
// Provider-specific adaptations
// ============================================================================

/**
 * Providers that support CLI-style flag suffixes in the prompt text.
 * Volcengine parses --resolution, --duration, --ratio from the prompt.
 */
const FLAG_SUFFIX_PROVIDERS = new Set(['volcengine']);

/**
 * Providers that support negative prompts as a separate field.
 * Currently none in this daemon; we weave them into the positive prompt.
 */
const NEGATIVE_PROMPT_PROVIDERS = new Set<string>(['qwencloud']);

/**
 * Add provider-specific hints about what works well with this model.
 */
function getProviderHints(provider: string, model: string): string[] {
  const hints: string[] = [];
  const p = provider.toLowerCase();

  if (p === 'volcengine') {
    if (model.includes('seedance-2')) {
      hints.push('Seedance 2.0 handles complex scenes with multiple subjects better than v1');
      hints.push('Detailed prompts (80+ words) produce better results with this model');
    }
    if (model.includes('fast')) {
      hints.push('Fast variant trades some detail for speed — shorter prompts work well');
    }
    if (model.includes('i2v')) {
      hints.push('Image-to-video: the reference image acts as the first frame — prompt should describe what happens NEXT');
    }
  }

  if (p === 'grok') {
    hints.push('Grok Imagine works best with concise, vivid prompts (30-80 words)');
    hints.push('Describe the visual scene in present tense for best results');
  }

  if (p === 'kling') {
    hints.push('Kling produces cinematic output — describe camera framing and lighting explicitly');
    hints.push('Works well with Chinese-language prompts too');
  }

  if (p === 'hyperframes') {
    hints.push('HyperFrames is a motion graphics renderer — describe animation, not photoreal scenes');
    hints.push('Composition HTML is authored separately; the prompt sets the visual direction');
  }

  if (p === 'qwencloud') {
    hints.push('Use prompt_extend for short prompts (auto-rewrites for quality)');
    hints.push('Add negative prompt to exclude unwanted content');
    hints.push('wan2.7 for 1080P + multi-shot, wan2.6 for 720P + prompt_extend');
    hints.push('Use i2v mode for image-based generation with audio');
  }

  return hints;
}

// ============================================================================
// Main compose function
// ============================================================================

/**
 * Compose an enriched prompt from raw user input.
 *
 * This is the main entry point. Called by the daemon server route handler
 * BEFORE invoking `generateMedia()`. The returned `EnrichedPrompt.text` is
 * what gets passed as the `prompt` parameter to the provider.
 *
 * Layer order (matters — later layers refine earlier ones):
 *   1. Direction preset    — base template
 *   2. Quality suffix      — style/mood/camera/lighting keywords
 *   3. Negative block      — avoidance terms
 *   4. Provider adaptation — flags, formatting
 *   5. Anti-slop           — validation
 *   6. Provider hints      — model-specific advice
 */
export function composeVideoPrompt(input: PromptEnrichInput): EnrichedPrompt {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Resolve direction
  const direction = input.direction ? findDirectionById(input.direction) : undefined;

  // 2. Build quality suffix
  const qualitySuffix = buildQualitySuffix(input, direction);

  // 3. Build negative block
  const negativeBlock = buildNegativeBlock(input);

  // 4. Compose the enriched prompt
  const parts: string[] = [];

  // Core prompt — user's raw description
  const rawPrompt = input.prompt?.trim() ?? '';
  if (rawPrompt) {
    parts.push(rawPrompt);
  } else if (direction) {
    // Fallback: use direction prompt template with empty subject
    const fallback = direction.promptTemplate.replace('{subject}', 'a visual scene');
    parts.push(fallback);
  } else {
    errors.push('EMPTY_PROMPT: No prompt provided and no direction template available');
  }

  // Append quality keywords
  if (qualitySuffix) {
    parts.push(qualitySuffix);
  }

  // Append negative constraints
  if (negativeBlock) {
    parts.push(negativeBlock);
  }

  let text = parts.join(', ');

  // 5. Anti-slop check on the raw (pre-modifier) prompt
  const { score: slopScore, warnings: slopWarnings } = runAntiSlopCheck(rawPrompt);
  warnings.push(...slopWarnings);

  // 6. Estimate quality
  const quality = estimateQuality(rawPrompt, slopScore);

  // 7. Provider hints
  const providerHints = getProviderHints(input.provider, input.model);

  // 8. Collect direction keywords
  const keywords = direction?.styleKeywords?.slice(0, 5) ?? [];

  // 9. Add provider-specific adaptation note
  // (actual flag appending happens in the provider renderer — we just mark it)
  if (FLAG_SUFFIX_PROVIDERS.has(input.provider.toLowerCase())) {
    providerHints.push('Provider supports CLI-style flags: --resolution, --duration, --ratio will be auto-appended');
  }

  return {
    text,
    warnings,
    errors,
    metadata: {
      directionId: direction?.id,
      keywords,
      antiSlopScore: slopScore,
      estimatedQuality: quality,
      providerHints,
    },
  };
}

/**
 * Quick compose — lightweight version for when no direction/enrichment is needed.
 * Just runs anti-slop and returns the raw prompt with basic validation.
 */
export function composeVideoPromptSimple(prompt: string): EnrichedPrompt {
  const { score, warnings } = runAntiSlopCheck(prompt);
  return {
    text: prompt,
    warnings,
    errors: [],
    metadata: {
      keywords: [],
      antiSlopScore: score,
      estimatedQuality: estimateQuality(prompt, score),
      providerHints: [],
    },
  };
}

// ============================================================================
// Parameter validation
// ============================================================================

export const ALLOWED_ASPECTS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const;
export const ALLOWED_LENGTHS = [3, 5, 8, 10, 15, 30] as const;

export function validateAspect(aspect: string | undefined): { valid: boolean; fallback: string; warning?: string } {
  if (!aspect) return { valid: true, fallback: '16:9' };
  if (ALLOWED_ASPECTS.includes(aspect as any)) return { valid: true, fallback: aspect };
  return { valid: false, fallback: '16:9', warning: `Unsupported aspect ratio "${aspect}" — using 16:9` };
}

export function validateLength(length: number | undefined): { valid: boolean; clamped: number; warning?: string } {
  if (length == null) return { valid: true, clamped: 5 };
  if (ALLOWED_LENGTHS.includes(length as any)) return { valid: true, clamped: length };
  const clamped = ALLOWED_LENGTHS.reduce((prev, curr) =>
    Math.abs(curr - length) < Math.abs(prev - length) ? curr : prev,
  );
  return { valid: false, clamped, warning: `Duration ${length}s not supported — clamped to ${clamped}s` };
}

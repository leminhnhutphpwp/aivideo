/**
 * Image Generation Contract
 *
 * Core prompt enrichment engine + provider constraints + anti-slop rules.
 * Transforms raw user input (prompt + style/direction) into a rich,
 * provider-ready prompt that the AI image model can effectively interpret.
 *
 * Architecture:
 *   1. Direction resolution — find preset or use raw input
 *   2. Prompt enrichment    — weave style keywords + template substitution
 *   3. Quality suffix       — append mood tones + visual elements
 *   4. Negative block       — anti-patterns + explicit avoidance
 *   5. Anti-slop validation — reject low-quality prompt patterns
 *   6. Provider adaptation  — add provider-specific hints
 */

import { IMAGE_DIRECTIONS, type ImageDirection, findDirectionById } from './image-directions.js';

// ============================================================================
// Types
// ============================================================================

export interface ImagePromptEnrichInput {
  prompt: string;
  model: string;
  provider: string;
  style?: string;
  negativePrompt?: string;
  aspect?: string;
}

export interface ImageEnrichedPrompt {
  text: string;
  /** Negative terms for the provider's dedicated negative_prompt field (NOT woven into text). */
  negative: string;
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
 * Build a quality suffix from a direction's style keywords and mood tones.
 *
 * Strategy: quality keywords at the END of the prompt. Image models weight
 * trailing tokens heavily — we append the most impactful descriptors last.
 * Deduplicate against user's raw prompt to avoid redundancy.
 */
// Descriptors that most strongly break the "AI look" (texture, grain, candid,
// real optics). When a direction lists these, keep them even under the cap —
// they sit at the TAIL of most skill keyword lists and were being sliced off.
const REALISM_PRIORITY =
  /grain|candid|unposed|documentary|film|texture|pores|imperfect|natural|authentic|handheld|\d{2,3}mm|prime lens|skin/i;

function buildImageQualitySuffix(
  input: ImagePromptEnrichInput,
  direction?: ImageDirection,
): string {
  const parts: string[] = [];
  const rawPromptLower = input.prompt.toLowerCase();

  if (direction) {
    // Mood tones — emotional atmosphere
    const moods = direction.moodTones.filter(
      (m) => !rawPromptLower.includes(m.toLowerCase()),
    );
    if (moods.length > 0) {
      parts.push(...moods.slice(0, 2));
    }

    // Style keywords — surface the anti-"AI look" descriptors FIRST so they
    // survive the cap, then fill with the rest (limit to 6).
    const available = direction.styleKeywords.filter(
      (k) => !rawPromptLower.includes(k.toLowerCase()),
    );
    const priority = available.filter((k) => REALISM_PRIORITY.test(k));
    const rest = available.filter((k) => !REALISM_PRIORITY.test(k));
    const keywords = [...priority, ...rest].slice(0, 7);
    if (keywords.length > 0) {
      parts.push(...keywords);
    }

    // Style "do" rules — the realism techniques (subtle grain, candid posing,
    // natural skin). Strip the leading imperative verb so they read as
    // descriptors, not instructions (limit to 2).
    const doRules = direction.styleRulesDo
      .map((r) =>
        r
          .replace(/^(use|add|apply|employ|maintain|keep|prioritize|include)\s+/i, '')
          .replace(/[.\-]$/, '')
          .toLowerCase(),
      )
      .filter((r) => r && !rawPromptLower.includes(r.slice(0, 15)));
    if (doRules.length > 0) {
      parts.push(...doRules.slice(0, 2));
    }

    // Visual elements — scene composition hints (limit to 2)
    const visuals = direction.visualElements
      .filter((v) => !rawPromptLower.includes(v.toLowerCase().slice(0, 20)))
      .map((v) => v.toLowerCase());
    if (visuals.length > 0) {
      parts.push(...visuals.slice(0, 2));
    }
  }

  return parts.join(', ');
}

/**
 * Build the negative terms (anti-patterns + avoidance). Returned as a plain
 * comma list for the provider's dedicated negative_prompt field — NOT woven
 * into the positive prompt (where "avoid: x" risks the model weighting x).
 */
function buildImageNegativeBlock(input: ImagePromptEnrichInput, direction?: ImageDirection): string {
  const avoid: string[] = [];

  if (input.negativePrompt?.trim()) {
    const items = input.negativePrompt
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    avoid.push(...items);
  }

  if (direction?.defaultNegative) {
    const items = direction.defaultNegative
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const item of items) {
      if (!avoid.some((a) => a.toLowerCase().includes(item.toLowerCase()))) {
        avoid.push(item);
      }
    }
  }

  if (direction?.antiPatterns?.length) {
    for (const ap of direction.antiPatterns) {
      if (!avoid.some((a) => a.toLowerCase().includes(ap.toLowerCase()))) {
        avoid.push(ap);
      }
    }
  }

  if (direction?.styleRulesDont?.length) {
    for (const dont of direction.styleRulesDont) {
      const clean = dont
        .replace(/^(avoid|don'?t|do not|never|no)\s+(using\s+|use\s+|any\s+)?/i, '')
        .replace(/[.\-]$/, '');
      if (clean && !avoid.some((a) => a.toLowerCase().includes(clean.toLowerCase()))) {
        avoid.push(clean);
      }
    }
  }

  if (avoid.length === 0) return '';
  return avoid.join(', ');
}

/**
 * Anti-slop validation — identical rules to video-contract.ts (P0/P1/P2).
 */
function runAntiSlopCheck(prompt: string): { score: number; warnings: string[] } {
  const warnings: string[] = [];
  let score = 0;

  const p0Patterns: Array<{ pattern: RegExp; label: string; weight: number }> = [
    { pattern: /^\s*$/, label: 'Prompt is empty', weight: 10 },
    { pattern: /^make.{0,20}(image|picture|photo)/i, label: 'Prompt is a meta-instruction, not a visual description', weight: 8 },
    { pattern: /^generate.{0,20}(image|picture|photo)/i, label: 'Prompt is a meta-instruction, not a visual description', weight: 8 },
    { pattern: /^create.{0,20}(image|picture|photo)/i, label: 'Prompt is a meta-instruction, not a visual description', weight: 8 },
    { pattern: /^\W{0,5}$/, label: 'Prompt contains only punctuation', weight: 7 },
    { pattern: /^test\b/i, label: 'Prompt is a test placeholder', weight: 6 },
  ];

  for (const { pattern, label, weight } of p0Patterns) {
    if (pattern.test(prompt)) {
      warnings.push(`P0-CRITICAL: ${label}`);
      score += weight;
    }
  }

  const p1Patterns: Array<{ pattern: RegExp; label: string; weight: number }> = [
    { pattern: /^.{1,10}$/, label: 'Prompt too short (< 10 characters)', weight: 4 },
    { pattern: /lorem ipsum/i, label: 'Prompt contains placeholder text', weight: 5 },
    { pattern: /placeholder/i, label: 'Prompt contains the word "placeholder"', weight: 3 },
    { pattern: /todo/i, label: 'Prompt contains "TODO" placeholder', weight: 3 },
    { pattern: /beautiful|stunning|amazing|incredible|awesome|perfect/i, label: 'Uses subjective adjectives — replace with concrete visual terms', weight: 2 },
    { pattern: /high quality|ultra hd|8k|4k|high definition/i, label: 'Uses generic quality tags — the model already optimizes for quality', weight: 1 },
  ];

  for (const { pattern, label, weight } of p1Patterns) {
    if (pattern.test(prompt)) {
      warnings.push(`P1-QUALITY: ${label}`);
      score += weight;
    }
  }

  const p2Patterns: Array<{ pattern: RegExp; label: string; weight: number }> = [
    { pattern: /^.{1,30}$/, label: 'Prompt on the short side — more detail helps the model understand intent', weight: 1 },
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
  if (prompt.length < 20) return 'low';
  if (prompt.length < 60) return 'medium';
  return 'high';
}

// ============================================================================
// Provider-specific adaptations
// ============================================================================

/**
 * Add provider-specific hints about what works well with this image model.
 */
function getImageProviderHints(provider: string, model: string): string[] {
  const hints: string[] = [];
  const p = provider.toLowerCase();

  if (p === 'openai') {
    hints.push('DALL-E handles abstract and creative prompts well — be specific with visual details');
    hints.push('Natural language prompts work better than keyword lists for DALL-E');
  }

  if (p === 'leonardo') {
    hints.push('Leonardo excels at cinematic and fantasy styles — use film/photography terminology');
    hints.push('Negative prompts work well — specify what to avoid explicitly');
  }

  if (p === 'nano-banana') {
    hints.push('Nano Banana is optimized for fast generation — keep prompts concise');
    hints.push('Best results with clear subject + style + lighting description');
  }

  if (p === 'volcengine') {
    hints.push('Volcengine image models respond well to detailed scene descriptions');
    hints.push('Include camera angle, lighting, and atmosphere in your prompt');
  }

  if (p === 'grok') {
    hints.push('Grok Imagine works best with vivid, descriptive English prompts (30-80 words)');
    hints.push('Describe the visual scene in present tense for best results');
  }

  return hints;
}

// ============================================================================
// Main compose function
// ============================================================================

/**
 * Compose an enriched image prompt from raw user input.
 *
 * Layer order:
 *   1. Direction preset    — base template with style keywords
 *   2. Quality suffix      — mood tones + visual elements
 *   3. Negative block      — anti-patterns + avoidance
 *   4. Anti-slop           — validation
 *   5. Provider hints      — model-specific advice
 */
export function composeImagePrompt(input: ImagePromptEnrichInput): ImageEnrichedPrompt {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Resolve direction
  const direction = input.style && input.style !== 'none'
    ? findDirectionById(input.style)
    : undefined;

  // 2. Build quality suffix
  const qualitySuffix = buildImageQualitySuffix(input, direction);

  // 3. Build negative block
  const negativeBlock = buildImageNegativeBlock(input, direction);

  // 4. Compose the enriched prompt
  const parts: string[] = [];
  const rawPrompt = input.prompt?.trim() ?? '';

  if (rawPrompt) {
    parts.push(rawPrompt);
  } else if (direction) {
    const fallback = direction.promptTemplate
      .replace('{subject}', 'a visually striking image')
      .replace('{style}', direction.label)
      .replace('{mood}', direction.moodTones[0] || 'dramatic')
      .replace('{negative}', '');
    parts.push(fallback);
  } else {
    errors.push('EMPTY_PROMPT: No prompt provided and no direction template available');
  }

  if (qualitySuffix) {
    parts.push(qualitySuffix);
  }

  // NOTE: negativeBlock is intentionally NOT appended to the positive prompt —
  // it is returned separately for the provider's negative_prompt field.

  const text = parts.join(', ');

  // 5. Anti-slop check
  const { score: slopScore, warnings: slopWarnings } = runAntiSlopCheck(rawPrompt);
  warnings.push(...slopWarnings);

  // 6. Estimate quality
  const quality = estimateQuality(rawPrompt, slopScore);

  // 7. Provider hints
  const providerHints = getImageProviderHints(input.provider, input.model);

  // 8. Collect direction keywords
  const keywords = direction?.styleKeywords?.slice(0, 5) ?? [];

  return {
    text,
    negative: negativeBlock,
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
 * Quick compose — lightweight version for no-direction use.
 */
export function composeImagePromptSimple(prompt: string): ImageEnrichedPrompt {
  const { score, warnings } = runAntiSlopCheck(prompt);
  return {
    text: prompt,
    negative: '',
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

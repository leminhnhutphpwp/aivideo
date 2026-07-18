/**
 * Video Discovery Engine
 *
 * Validates project metadata, identifies missing/unknown fields, and
 * generates structured discovery questions for the frontend. Models the
 * "turn 1" discovery pattern from Open Design: before the daemon generates
 * anything, it validates that the user's intent is fully specified.
 *
 * Difference from Open Design: here the discovery happens in the web UI,
 * not in an agent conversation. The daemon generates a list of questions
 * the frontend should ask, and the frontend answers them before calling
 * the generate endpoint.
 */

import { VIDEO_DIRECTIONS, type VideoDirection, findDirectionById, findDirectionByLabel } from './video-directions.js';

// ============================================================================
// Types
// ============================================================================

export interface DiscoveryInput {
  prompt?: string;
  direction?: string;
  style?: string;
  mood?: string;
  camera?: string;
  lighting?: string;
  negativePrompt?: string;
  model?: string;
  aspect?: string;
  length?: number;
  surface?: string;
  provider?: string;
}

export type QuestionType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'select';

export interface DiscoveryQuestion {
  id: string;
  label: string;
  labelVi: string;
  type: QuestionType;
  required: boolean;
  options?: Array<string | { label: string; value: string }>;
  placeholder?: string;
  defaultValue?: string;
  maxSelections?: number;
}

export interface DiscoveryResult {
  ready: boolean;
  questions: DiscoveryQuestion[];
  warnings: string[];
  suggestions: string[];
  metadata: {
    directionId?: string;
    missingFields: string[];
    questionableDefaults: string[];
  };
}

// ============================================================================
// Discovery logic
// ============================================================================

/**
 * Run discovery check on the user's input.
 *
 * Returns:
 * - `ready: true`  — all required fields are specified, proceed to generate
 * - `ready: false` — one or more fields need clarification from the user
 */
export function runDiscovery(input: DiscoveryInput): DiscoveryResult {
  const questions: DiscoveryQuestion[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const missingFields: string[] = [];
  const questionableDefaults: string[] = [];

  // 1. Prompt is MANDATORY — the most important field
  if (!input.prompt?.trim()) {
    missingFields.push('prompt');
    questions.push({
      id: 'prompt',
      label: 'Video Description',
      labelVi: 'Mô tả video',
      type: 'textarea',
      required: true,
      placeholder: 'Describe your video: subject, action, setting, mood...',
    });
  } else if (input.prompt.trim().length < 20) {
    warnings.push('Your prompt is very short. More detail about subject, action, and setting helps produce better results.');
    questionableDefaults.push('prompt (too short)');
  }

  // 2. Model — strongly recommended
  if (!input.model?.trim()) {
    missingFields.push('model');
    questions.push({
      id: 'model',
      label: 'AI Model',
      labelVi: 'Mô hình AI',
      type: 'select',
      required: true,
      options: [
        { label: 'doubao-seedance-2-0-260128', value: 'doubao-seedance-2-0-260128' },
        { label: 'doubao-seedance-2-0-fast-260128', value: 'doubao-seedance-2-0-fast-260128' },
        { label: 'grok-imagine-video', value: 'grok-imagine-video' },
        { label: 'hyperframes-html', value: 'hyperframes-html' },
      ],
    });
  }

  // 3. Direction — helps with prompt structure
  if (!input.direction?.trim()) {
    suggestions.push('Pick a video direction for optimized prompt structure (cinematic, product-reveal, social-ad, etc.)');
    questions.push({
      id: 'direction',
      label: 'Video Direction',
      labelVi: 'Phong cách video',
      type: 'radio',
      required: false,
      options: VIDEO_DIRECTIONS.map((d) => ({
        label: d.label,
        value: d.id,
      })),
    });
  }

  // 4. Aspect ratio
  if (!input.aspect?.trim()) {
    questions.push({
      id: 'aspect',
      label: 'Aspect Ratio',
      labelVi: 'Tỷ lệ khung hình',
      type: 'radio',
      required: true,
      defaultValue: '16:9',
      options: [
        { label: '16:9 — Landscape / Desktop', value: '16:9' },
        { label: '9:16 — Portrait / Mobile', value: '9:16' },
        { label: '1:1 — Square / Social', value: '1:1' },
        { label: '4:3 — Classic', value: '4:3' },
        { label: '3:4 — Portrait social', value: '3:4' },
      ],
    });
  } else {
    questionableDefaults.push(`aspect (currently: ${input.aspect})`);
  }

  // 5. Duration
  if (!input.length || input.length <= 0) {
    questions.push({
      id: 'length',
      label: 'Duration (seconds)',
      labelVi: 'Thời lượng (giây)',
      type: 'radio',
      required: true,
      defaultValue: '5',
      options: [
        { label: '3s — Quick clip', value: '3' },
        { label: '5s — Standard short', value: '5' },
        { label: '8s — Detailed short', value: '8' },
        { label: '10s — Feature clip', value: '10' },
        { label: '15s — Full scene', value: '15' },
        { label: '30s — Extended', value: '30' },
      ],
    });
  }

  // 6. Style / mood / camera / lighting — optional but encouraged
  if (!input.style?.trim()) {
    suggestions.push('Choose a visual style to guide the AI (Cinematic, Anime, 3D Animation, etc.)');
  }
  if (!input.mood?.trim()) {
    suggestions.push('Set a mood tone to influence the atmosphere (Dramatic, Happy, Mysterious, etc.)');
  }
  if (!input.camera?.trim()) {
    suggestions.push('Pick a camera movement for dynamic shots (Dolly, Tracking, Zoom, etc.)');
  }
  if (!input.lighting?.trim()) {
    suggestions.push('Select lighting type for visual quality (Golden Hour, Studio, Neon, etc.)');
  }

  // 7. Resolve direction metadata
  let directionId: string | undefined;
  if (input.direction) {
    const d = findDirectionById(input.direction) ?? findDirectionByLabel(input.direction);
    if (d) {
      directionId = d.id;
      // Suggest aspects that work well with this direction
      if (d.aspectHints.length > 0 && !input.aspect) {
        suggestions.push(`Recommended aspect ratios for ${d.label}: ${d.aspectHints.join(', ')}`);
      }
    }
  }

  const ready = missingFields.length === 0 && warnings.every(w => !w.startsWith('P0-CRITICAL'));

  return {
    ready,
    questions,
    warnings,
    suggestions,
    metadata: {
      directionId,
      missingFields,
      questionableDefaults,
    },
  };
}

export function runDiscoveryQuick(prompt: string, direction?: string): DiscoveryResult {
  return runDiscovery({
    prompt,
    direction,
  });
}

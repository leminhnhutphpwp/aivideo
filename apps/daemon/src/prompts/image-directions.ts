/**
 * Image Direction Library
 *
 * Loaded from markdown skill files in `apps/skills/image-direction/`.
 * Each direction carries a concrete visual identity — prompt templates,
 * style keywords, mood tones, color palettes, and style rules. When
 * selected, values are injected into the image generation prompt
 * enrichment pipeline.
 *
 * Mirrors `video-directions.ts` — same loading pattern, different schema.
 */

import { loadImageDirections, isPublishedSkill, type LoadedSkill } from '../skills/loader.js';

export interface ImageDirection {
  id: string;
  label: string;
  styleKeywords: string[];
  moodTones: string[];
  promptTemplate: string;
  antiPatterns: string[];
  aspectHints: string[];
  defaultNegative: string;
  colorPalette: Array<{ name: string; hex: string; role: string }>;
  visualElements: string[];
  styleRulesDo: string[];
  styleRulesDont: string[];
  bestFor: string[];
}

let _loaded: ImageDirection[] | null = null;
let _loadedOnce = false;

function ensureLoaded(): ImageDirection[] {
  if (_loadedOnce) return _loaded ?? [];
  _loadedOnce = true;
  try {
    // Only published skills are consumed at generation time — a `status: draft`
    // skill stays hidden from the studio AND must never enrich a real prompt.
    const skills = loadImageDirections().filter(isPublishedSkill);
    _loaded = skills.map(skillToDirection);
  } catch (err) {
    console.warn('[image-directions] Failed to load skills:', err);
    _loaded = [];
  }
  return _loaded ?? [];
}

export function reloadDirections(): ImageDirection[] {
  _loadedOnce = false;
  return ensureLoaded();
}

function skillToDirection(skill: LoadedSkill): ImageDirection {
  const fm = skill.raw;
  return {
    id: fm.id,
    label: fm.label,
    styleKeywords: fm.style_keywords ?? [],
    moodTones: fm.mood_tones ?? [],
    promptTemplate: fm.prompt_template ?? '{subject}',
    antiPatterns: fm.anti_patterns ?? [],
    aspectHints: fm.aspect_hints ?? [],
    defaultNegative: fm.default_negative ?? '',
    colorPalette: fm.color_palette ?? [],
    visualElements: fm.visual_elements ?? [],
    styleRulesDo: fm.style_rules_do ?? [],
    styleRulesDont: fm.style_rules_dont ?? [],
    bestFor: fm.best_for ?? [],
  };
}

export const IMAGE_DIRECTIONS: ImageDirection[] = ensureLoaded();

export function findDirectionById(id: string): ImageDirection | undefined {
  return ensureLoaded().find((d) => d.id === id);
}

export function findDirectionByLabel(label: string): ImageDirection | undefined {
  const trimmed = label.trim();
  return ensureLoaded().find(
    (d) => d.label === trimmed || d.id === trimmed,
  );
}

export function getDirectionKeywords(id: string): string[] {
  const d = findDirectionById(id);
  return d?.styleKeywords ?? [];
}

export function getDirectionAspects(id: string): string[] {
  const d = findDirectionById(id);
  return d?.aspectHints ?? ['1:1'];
}

/**
 * Video Direction Library
 *
 * Loaded from markdown skill files in `apps/skills/video-direction/`.
 * Each direction carries a concrete visual identity — prompt templates,
 * camera presets, lighting presets, style keywords, mood tones, and
 * anti-patterns. When selected, values are injected into the video
 * generation prompt enrichment pipeline.
 *
 * Inspired by Open Design's `directions.ts` — folder-per-skill,
 * agent-readable markdown, deterministic data instead of model improvisation.
 */

import { loadVideoDirections, isPublishedSkill, type LoadedSkill } from '../skills/loader.js';

export interface VideoDirection {
  id: string;
  label: string;
  references: string[];
  styleKeywords: string[];
  cameraPresets: string[];
  lightingPresets: string[];
  moodTones: string[];
  promptTemplate: string;
  antiPatterns: string[];
  aspectHints: string[];
}

let _loaded: VideoDirection[] | null = null;
let _loadedOnce = false;

function ensureLoaded(): VideoDirection[] {
  if (_loadedOnce) return _loaded ?? [];
  _loadedOnce = true;
  try {
    // Only published skills are consumed at generation time — a `status: draft`
    // skill stays hidden from the studio AND must never enrich a real prompt.
    const skills = loadVideoDirections().filter(isPublishedSkill);
    _loaded = skills.map(skillToDirection);
  } catch (err) {
    console.warn('[video-directions] Failed to load skills:', err);
    _loaded = [];
  }
  return _loaded ?? [];
}

/** Force reload from disk. Useful after adding new skills during development. */
export function reloadDirections(): VideoDirection[] {
  _loadedOnce = false;
  return ensureLoaded();
}

function skillToDirection(skill: LoadedSkill): VideoDirection {
  const fm = skill.raw;
  // Default every array/string field (symmetry with image-directions.ts) so a
  // frontmatter that omits a key yields [] / '{subject}' instead of undefined.
  return {
    id: fm.id,
    label: fm.label,
    references: fm.references ?? [],
    styleKeywords: fm.style_keywords ?? [],
    cameraPresets: fm.camera_presets ?? [],
    lightingPresets: fm.lighting_presets ?? [],
    moodTones: fm.mood_tones ?? [],
    promptTemplate: fm.prompt_template ?? '{subject}',
    antiPatterns: fm.anti_patterns ?? [],
    aspectHints: fm.aspect_hints ?? [],
  };
}

export const VIDEO_DIRECTIONS: VideoDirection[] = ensureLoaded();

export function findDirectionById(id: string): VideoDirection | undefined {
  return (ensureLoaded()).find((d) => d.id === id);
}

export function findDirectionByLabel(label: string): VideoDirection | undefined {
  const trimmed = label.trim();
  return (ensureLoaded()).find(
    (d) => d.label === trimmed || d.id === trimmed,
  );
}

export function getDirectionAspects(id: string): string[] {
  const d = findDirectionById(id);
  return d?.aspectHints ?? ['16:9'];
}

export function getDirectionKeywords(id: string): string[] {
  const d = findDirectionById(id);
  return d?.styleKeywords ?? [];
}

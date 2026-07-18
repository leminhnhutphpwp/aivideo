import { describe, it, expect } from 'vitest';
import {
  loadVideoDirections,
  loadImageDirections,
  loadVideoMarketingPsychology,
  isPublishedSkill,
  type LoadedSkill,
} from './loader.js';
import { STUDIO_VOCAB } from '../media/vocab.js';

/**
 * Schema gate for the real skill corpus.
 *
 * These tests load EVERY style skill straight from SKILLS_DIR and assert the
 * frontmatter is well-formed. They exist to catch a broken/outdated skill before
 * it ships — a missing key silently empties a studio dropdown, an off-vocab
 * camera/lighting/mood preset filters the dropdown to nothing, and a stray
 * placeholder like `{details}` leaks an unresolved token into a real prompt.
 */

// Required frontmatter keys, per family. A missing key here is a hard failure.
const IMAGE_REQUIRED = [
  'mode', 'surface', 'id', 'label', 'label_en', 'description',
  'example_prompt', 'example_prompt_vi', 'aspect_hints', 'mood_tones',
  'style_keywords', 'prompt_template', 'anti_patterns', 'default_negative',
  'color_palette', 'visual_elements', 'style_rules_do', 'style_rules_dont',
  'best_for',
] as const;

const VIDEO_REQUIRED = [
  'mode', 'surface', 'id', 'label', 'label_en', 'aspect_hints',
  'camera_presets', 'lighting_presets', 'mood_tones', 'style_keywords',
  'prompt_template', 'anti_patterns', 'references', 'example_prompt',
  'example_prompt_vi',
] as const;

// Prompt templates may only reference these placeholders. `{subject}/{style}/
// {mood}/{negative}` are shared; video additionally resolves `{camera}/{lighting}`
// from the studio presets. Anything else (`{details}`, `{colors}`, …) is a bug —
// the compose step never substitutes it, so the token leaks verbatim.
const IMAGE_PLACEHOLDERS = new Set(['subject', 'style', 'mood', 'negative']);
const VIDEO_PLACEHOLDERS = new Set(['subject', 'style', 'mood', 'negative', 'camera', 'lighting']);

function placeholdersOf(template: unknown): string[] {
  return [...String(template ?? '').matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
}

const videoSkills = loadVideoDirections();
const imageSkills = loadImageDirections();

describe('skill corpus — loader integrity', () => {
  it('loads a non-empty corpus for both families', () => {
    expect(videoSkills.length).toBeGreaterThan(0);
    expect(imageSkills.length).toBeGreaterThan(0);
  });

  it('every loaded skill parsed valid, non-empty frontmatter', () => {
    for (const s of [...videoSkills, ...imageSkills]) {
      expect(s.raw, `${s.path} frontmatter`).toBeTypeOf('object');
      expect(Object.keys(s.raw).length, `${s.path} has empty frontmatter`).toBeGreaterThan(0);
      expect(s.id, `${s.path} id`).toBeTruthy();
    }
  });
});

describe('image-direction skills — schema', () => {
  it.each(imageSkills.map((s) => [s.id, s] as const))(
    '%s has all required keys',
    (_id, s: LoadedSkill) => {
      for (const key of IMAGE_REQUIRED) {
        expect(key in s.raw, `${s.id} missing "${key}"`).toBe(true);
      }
    },
  );

  it.each(imageSkills.map((s) => [s.id, s] as const))(
    '%s prompt_template uses only known placeholders',
    (_id, s: LoadedSkill) => {
      for (const p of placeholdersOf(s.raw.prompt_template)) {
        expect(IMAGE_PLACEHOLDERS.has(p), `${s.id} unknown placeholder {${p}}`).toBe(true);
      }
    },
  );
});

describe('video-direction skills — schema', () => {
  it.each(videoSkills.map((s) => [s.id, s] as const))(
    '%s has all required keys',
    (_id, s: LoadedSkill) => {
      for (const key of VIDEO_REQUIRED) {
        expect(key in s.raw, `${s.id} missing "${key}"`).toBe(true);
      }
    },
  );

  it.each(videoSkills.map((s) => [s.id, s] as const))(
    '%s camera/lighting/mood presets stay within studio vocab',
    (_id, s: LoadedSkill) => {
      for (const c of s.raw.camera_presets ?? []) {
        expect(STUDIO_VOCAB.camera, `${s.id} off-vocab camera "${c}"`).toContain(c);
      }
      for (const l of s.raw.lighting_presets ?? []) {
        expect(STUDIO_VOCAB.lighting, `${s.id} off-vocab lighting "${l}"`).toContain(l);
      }
      for (const m of s.raw.mood_tones ?? []) {
        expect(STUDIO_VOCAB.mood, `${s.id} off-vocab mood "${m}"`).toContain(m);
      }
    },
  );

  it.each(videoSkills.map((s) => [s.id, s] as const))(
    '%s prompt_template uses only known placeholders',
    (_id, s: LoadedSkill) => {
      for (const p of placeholdersOf(s.raw.prompt_template)) {
        expect(VIDEO_PLACEHOLDERS.has(p), `${s.id} unknown placeholder {${p}}`).toBe(true);
      }
    },
  );
});

describe('draft-leak guard', () => {
  it('isPublishedSkill hides status:draft, keeps absent-status and published', () => {
    const draft = { raw: { status: 'draft' } } as unknown as LoadedSkill;
    const published = { raw: { status: 'published' } } as unknown as LoadedSkill;
    const noStatus = { raw: {} } as unknown as LoadedSkill;
    expect(isPublishedSkill(draft)).toBe(false);
    expect(isPublishedSkill(published)).toBe(true);
    expect(isPublishedSkill(noStatus)).toBe(true);
  });
});

describe('video-marketing-psychology — wired single skill', () => {
  it('loads as a single skill and is not orphaned', () => {
    const skill = loadVideoMarketingPsychology();
    expect(skill, 'marketing-psychology skill must load').not.toBeNull();
    expect(skill!.id).toBe('video-marketing-psychology');
    expect(skill!.body.length, 'marketing-psychology body should be non-empty').toBeGreaterThan(0);
  });
});

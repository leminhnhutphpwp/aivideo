---
id: video-storyboard
label: Video Storyboard
label_en: Video Storyboard
category: storyboard
quality_tiers: ["standard", "premium", "ultra"]
voice_moods: ["energetic", "calm", "professional", "friendly", "dramatic"]
aspect_ratios: ["16:9", "9:16", "1:1", "4:3"]
resolutions: ["720p", "1080p"]
durations: [3, 5, 8, 10, 15, 30]
---

# Video Storyboard

## Purpose

Storyboard converts a textual idea into a structured sequence of video scenes that can be rendered by the daemon media engine. It bridges the gap between raw user intent and the `video-compose` pipeline by producing a multi-scene plan with per-shot parameters.

Unlike direct `/api/projects/:id/media/generate` which renders a single video shot, storyboard coordinates multiple scenes (2–20) into one cohesive video with consistent style, direction, and audio.

## Lifecycle

```
Draft ──► Analyze ──► Analyzed ──► Render ──► Completed
  │                    │
  └── Delete           └── Delete (if not terminal)
```

1. **Create (Draft)** — user defines scenes, picks video type / quality / voice mood
2. **Analyze** — AI evaluates prompt quality, consistency, anti-slop; sets credits cost
3. **Render** — each scene is dispatched to daemon via `POST /api/projects/:id/media/generate` with parameters from the scene + storyboard-level settings
4. **Download** — concatenated output available via signed URL when completed

## Data Model

### Storyboard (top-level)
| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Human-readable name |
| `video_type` | enum | Category of video (see `types/` sub-skills) |
| `quality_tier` | enum | Render quality (see `quality_tiers` in frontmatter) |
| `voice_mood` | enum | TTS voice emotion (see `voice_moods` in frontmatter) |
| `voice` | string | TTS voice ID for all-scene narration |
| `background_music` | string | Background music asset filename |
| `description` | string | Optional high-level brief for the AI |
| `style_guide` | object | Optional consistency hints across scenes |
| `status` | enum | `draft` → `analyzing` → `analyzed` → `rendering` → `completed` / `failed` |
| `credits_cost` | int | Calculated during analysis |

### Scene (per-shot)
| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `prompt` | string | User | Visual description of the shot |
| `duration_seconds` | int | User | 3–30s, pick from `durations` in frontmatter |
| `camera_movement` | string | User | From `video-direction` skills' `camera_presets` |
| `lighting` | string | User | From `video-direction` skills' `lighting_presets` |
| `style` | string | User | Visual style (Cinematic, Realistic, Anime, etc.) |
| `mood` | string | User | Tone/mood (Dramatic, Happy, Peaceful, etc.) |
| `negative_prompt` | string | User | Content to avoid in generation |
| `reference_image` | string | User | Per-scene reference image filename for i2v/r2v |
| `narration` | string | User | Per-scene voiceover/script text, sent as `voiceover` to daemon |
| `aspect_ratio` | enum | User | From `aspect_ratios` in frontmatter |
| `resolution` | enum | User | From `resolutions` in frontmatter |
| `status` | enum | System | `pending` → `processing` → `completed` / `failed` |

### Reference (optional consistency assets)
- `type`: `character` | `product` | `background`
- `media_path`: URL to reference image
- `description`: what to maintain across scenes

## Integration with Daemon Skills

### video-direction
Each direction (cinematic, product-reveal, explainer, etc.) defines camera_presets, lighting_presets, mood_tones, style_keywords, aspect_hints. When rendering, scene parameters feed into `video-compose` enrichment.

### video-discovery
Defines required fields (prompt, aspect, length) and optional fields (direction, style, mood, camera, lighting). Quality thresholds (prompt ≥ 15 chars) apply per-scene.

### video-contract
Enrichment rules apply per-scene: user prompt first, quality keywords appended (style → mood → camera → lighting). Anti-slop checks run per-scene.

## Parameter Constraints

- **Scenes**: 2–20 (minimum 2 meaningful prompts to submit)
- **Duration per scene**: 3–30s, clamped to nearest value in `durations`
- **Prompt length**: 15–2000 characters; < 80 chars triggers quality warning
- **Aspect ratios**: 16:9, 9:16, 1:1, 4:3 — unsupported values clamp to 16:9
- **Resolutions**: 720p, 1080p — subject to user's plan limits
- **Camera + Lighting**: Validated against selected direction's presets; free-form values accepted but may produce unexpected results

# Skills Upgrade + Storyboard Fixes + Responsive — Worklog

## Date
2026-05-29

## Overview
Major upgrade across all 3 layers: enriched 18 image + 13 video + 8 storyboard type skills with production-quality metadata, added image enrichment pipeline, fixed critical storyboard bugs, made all pages responsive, and added template flows with import functionality.

## Files Changed

### Backend (9 files)
| File | Change |
|------|--------|
| `backend/app/Services/StoryboardRenderer.php` | Remove duplicate isRenderable guard; fix compileFinalVideo with ffmpeg; fix handleSceneFailure; fix resolveReferences path extraction; fix checkStoryboardCompletion DB transaction; batch render in groups of 5 scenes; add submitSceneGenerate |
| `backend/app/Services/CreditService.php` | Add storyboard_id to reserve/capture/release methods; query by storyboard_id instead of fragile amount matching |
| `backend/app/Models/CreditTransaction.php` | Add storyboard_id fillable + relationship |
| `backend/app/Models/Storyboard.php` | Fix calculateCreditsCost with duration factor; add storyboard_video fallback for unknown types |
| `backend/app/Http/Controllers/API/StoryboardController.php` | Vietnamese credit error messages; fix analyze() to revert to draft on failure; re-reserve credits on update() when cost changes |
| `backend/database/migrations/2026_05_29_000008_add_storyboard_id_to_credit_transactions_table.php` | New migration for storyboard_id on credit_transactions |
| `backend/app/Console/Commands/CheckStoryboardTimeouts.php` | New command to auto-cancel hung storyboards |
| `backend/routes/console.php` | Register storyboard timeout check every 15min |
| `backend/app/Http/Controllers/API/DaemonWebhookController.php` | Storyboard scene webhook routing |

### Daemon (7 files)
| File | Change |
|------|--------|
| `apps/daemon/src/prompts/image-directions.ts` | NEW: ImageDirection interface + loader wrapper for 14+4 image skills |
| `apps/daemon/src/prompts/image-contract.ts` | NEW: Image prompt enrichment — anti-slop (P0/P1/P2), quality suffix with mood tones + visual elements, negative block with default_negative + anti_patterns + style_rules_dont, provider hints (OpenAI, Leonardo, NanoBanana, Volcengine, Grok) |
| `apps/daemon/src/prompts/image-compose.ts` | NEW: Image compose orchestrator — composeImage(input) → enriched prompt + metadata |
| `apps/daemon/src/routes/media.ts` | Replace 8-line keyword append with composeImage() call; add examplePrompt, examplePromptVi, defaultNegative to buildMeta() and buildTypeMeta(); add templateFlows to buildTypeMeta() |
| `apps/daemon/src/routes/projects.ts` | Add lastTaskFile + lastTaskStatus to project listing (join media_tasks) |
| `apps/daemon/src/media/providers/qwencloud.ts` | Wan Image: prompt_extend → false (3-5s saved per generation) |
| `apps/daemon/src/media/types.ts` | No changes needed (fields added by YAML frontmatter via raw) |

### Web (18+ files)
| File | Change |
|------|--------|
| `apps/web/src/app/(dashboard)/studio/image/page.tsx` | Fix skills "None" filter + default; add examplePrompt popup with EN+VI copy; add credit info icon + modal; responsive layout |
| `apps/web/src/app/(dashboard)/studio/audio/page.tsx` | Fix generate flow (setResult → router.push); responsive layout |
| `apps/web/src/app/(dashboard)/studio/image-editing/page.tsx` | Fix generate flow (setResult → router.push); responsive layout |
| `apps/web/src/app/(dashboard)/studio/page.tsx` | Responsive grid (1/2/3 cols) |
| `apps/web/src/app/(dashboard)/studio/video/[feature]/page.tsx` | Map examplePrompt + examplePromptVi in preset loading; default selectedPresetId='none'; newScene() default empty strings |
| `apps/web/src/app/(dashboard)/studio/multi-scene/page.tsx` | Responsive layout |
| `apps/web/src/app/(dashboard)/projects/page.tsx` | Add lastTaskFile preview images; status badge (done/running/production); responsive grid |
| `apps/web/src/app/(dashboard)/projects/[id]/page.tsx` | Responsive layout; add surface to ProjectRecord type |
| `apps/web/src/app/(builder)/studio/storyboard/flow/page.tsx` | Major: responsive mobile/tablet (toolbar, layers overlay, properties overlay); add cursor-pointers to all actions; add template picker with 30 production templates; add credit estimation via pricing API; tier badge portal tooltip; save button → "Bắt đầu" with Play icon; videoType + tier in mobile layers overlay; confirm modal for template import |
| `apps/web/src/components/studio/options.ts` | Add "None" option to STYLE/MOOD/CAMERA/LIGHTING; add examplePrompt + examplePromptVi to DirectionPreset |
| `apps/web/src/components/studio/rich-select.tsx` | Add examplePrompt + examplePromptVi to OptionDef; portal tooltip with fixed positioning; remove example from tooltip |
| `apps/web/src/components/studio/video/video-presets.tsx` | Add info icon + popup for example prompts; responsive grid; container bg |
| `apps/web/src/components/studio/video/video-scene-editor.tsx` | Responsive layout |
| `apps/web/src/components/studio/video/video-sidebar.tsx` | Sticky fix for mobile |
| `apps/web/src/components/studio/reference-picker.tsx` | Fix previewUrl: fetch via authenticated API instead of raw URL construction; add downloadUrl field; use LARAVEL_URL from client.ts |
| `apps/web/src/components/ui/select.tsx` | Portal-based dropdown to fix overflow clipping; add cursor-pointer to options |
| `apps/web/src/components/projects/types.ts` | Add surface + skillId + lastTaskFile to ProjectRecord |
| `apps/web/src/components/projects/task-card.tsx` | (Briefly) Before/after comparison for image editing |
| `apps/web/src/lib/api/client.ts` | Export LARAVEL_URL |
| `apps/web/src/app/(dashboard)/community/trending/page.tsx` | Add empty state boxes for assets + creators tabs |
| `apps/web/src/app/(dashboard)/community/page.tsx` | (Existing empty state verified) |

### Skills (31 SKILL.md files)
| Directory | Changes |
|-----------|---------|
| `apps/skills/image-direction/` (18 files) | Enhanced: 18 style_keywords each, default_negative, richer prompt_template, expanded visual_elements/best_for/style_rules. Added 4 new: photorealism, 3d-render, pixel-art, claymation. Added example_prompt + example_prompt_vi to all |
| `apps/skills/video-direction/` (13 files) | Added example_prompt_vi to all |
| `apps/skills/video-storyboard/types/` (8 files) | Full upgrade: style_keywords, prompt_template, anti_patterns, default_negative, example_prompt, example_prompt_vi, best_for, when_to_use. Added template_flows (30 templates total) |

## Key Decisions
1. Image enrichment now matches video pipeline quality (anti-slop, quality suffix, negative block, provider hints)
2. Storyboard template_flows stored in SKILL.md — no code changes needed to add new templates
3. Storyboard credits use `video_type: 'storyboard_video'` for DB compatibility (skill types are daemon-only)
4. RichSelect + tier tooltips render via portal to avoid overflow clipping
5. Mobile storyboard: layers + properties become overlay panels, toolbar keeps essential actions
6. Template import offers "Nối tiếp" (append) or "Thay thế" (replace) when canvas has existing scenes

## Verification
- [x] Web tsc --noEmit: pass (1 pre-existing error in genesis-section.tsx)
- [x] Daemon tsc --noEmit: pass
- [x] Backend tests: 18/18 pass
- [x] Daemon health: ok
- [x] Skills API: 18 image + 13 video + 8 storyboard types
- [x] Pricing API: 422 resolved (video_type + duration codes)

## Handoff Notes
- **@backend needs to know**: New migration `add_storyboard_id_to_credit_transactions`; StoryboardRenderer changes for batch + ffmpeg; CreditService storyboard_id queries
- **@daemon needs to know**: Image enrichment pipeline (3 new files); templateFlows in buildTypeMeta(); lastTaskFile in project listing
- **@web needs to know**: 30 template flows available via skills API; template import with merge/replace; pricing calculate for storyboard with storyboard_video type

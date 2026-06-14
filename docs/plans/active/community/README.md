# Community Feature Architecture

## Date
2026-06-13

## ⚠️ CRITICAL: RenderJob vs Storyboard

> **NEVER confuse RenderJob and Storyboard for community features.**
> Community feed, publish, like, trending — ALL operate on **RenderJobs** (individual assets).
> Storyboards are container projects, NOT the unit of publishing.

### Data Model

```
Storyboard (project container)
  ├── StoryboardScene 1 → RenderJob 1 (individual video asset)
  ├── StoryboardScene 2 → RenderJob 2
  └── StoryboardScene 3 → RenderJob 3
                           ↓
                    Published to Community
```

| Entity | Table | Published to Community? | Notes |
|--------|-------|------------------------|-------|
| **RenderJob** | `render_jobs` | ✅ YES — this is the unit of publish | Has `visibility`, `published_at`, `tags`, `like_count`, `usage_count` |
| **Storyboard** | `storyboards` | ❌ NO — container only | Has scenes, each scene has a RenderJob |
| **Asset** | `assets` | ❌ NO — file reference | Points to RenderJob or Storyboard |

### Publish Flow (CORRECT)

```
1. User creates Storyboard → multiple scenes
2. Each scene renders → creates a RenderJob
3. User goes to RenderJob detail / Job History / Project page
4. User clicks "Publish" on a specific RenderJob
5. RenderJob gets visibility='sharing'|'public', published_at=now()
6. Community Feed queries: RenderJob::published()
```

### Publish Flow (WRONG — do not do this)

```
❌ Publishing a Storyboard directly
❌ Community feed querying Storyboards
❌ Storyboard viewer having a single "Publish" button
```

## Community API Endpoints

### RenderJob Publish (EXISTING — use this)
```
PATCH /render-jobs/{uuid}/publish    — Publish asset to community
PATCH /render-jobs/{uuid}/unpublish  — Unpublish asset
```

### Storyboard Publish (DO NOT USE — removed)
```
~~PATCH /storyboards/{uuid}/publish~~    — WRONG: community doesn't query storyboards
~~PATCH /storyboards/{uuid}/unpublish~~  — WRONG: same issue
```

## Community Feed Query

```php
// CommunityController::assets() — the ONLY source of community content
$query = RenderJob::published()
    ->with('user:id,uuid,name,username,avatar_media_id,reputation_level')
    ->whereIn('visibility', ['sharing', 'public']);
```

## Where to Place Publish Button

### ✅ CORRECT locations:
1. **Job History page** — list of user's render_jobs with publish action
2. **RenderJob detail page** — individual asset view with publish button
3. **Project detail page** — list of project's render_jobs with publish actions

### ❌ WRONG locations:
1. ~~Storyboard viewer page~~ — storyboard is not the publish unit
2. ~~Community feed page~~ — this is for viewing, not publishing

## Security Features

### Comment Protection
- **Rate limiting**: 50 comments per user per day
- **Content filter**: `ContentFilterService` blocks Vietnamese profanity and spam
- **Max length**: 1000 characters per comment
- **Delete permission**: Only comment owner can delete their comments

### Spam Prevention
- Sensitive keyword filter (Vietnamese + English)
- URL detection (blocks http/https links in comments)
- Daily comment limit per user

## Related Docs
- `docs/plans/community/missing-features.md` — Feature implementation plan
- `backend/app/Http/Controllers/API/CommunityController.php` — Backend API
- `backend/app/Http/Controllers/API/CommentController.php` — Comment API
- `backend/app/Services/ContentFilterService.php` — Content filter
- `apps/web/src/components/community/` — Frontend components
- `apps/web/src/hooks/use-scroll-lock.ts` — Scroll lock hook

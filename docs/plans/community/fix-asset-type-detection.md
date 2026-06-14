# Fix Asset Type Detection — Community Cards

## Date
2026-06-14

## Overview
The frontend uses `duration_seconds > 0` to determine whether an asset is a video or image. This is unreliable because image projects can have non-zero `duration_seconds`. The backend `formatAssetCard()` method also doesn't include an explicit `asset_type` field, forcing the frontend to guess.

## User Stories
- As a user, I want image projects to render as images (not videos) in the community feed
- As a user, I want video projects to render as videos with playback controls in the community feed

## Root Cause
- **Frontend**: `community-card.tsx:36` and `remix-modal.tsx:95` use `duration_seconds > 0` as the video indicator
- **Backend**: `CommunityController::formatAssetCard()` doesn't include an explicit `asset_type` field

## Technical Design

### Data Flow
```
Backend: formatAssetCard()
  ├── Check linked Asset.type ('image' | 'video')     ← PRIMARY
  ├── Fallback: RenderJob.video_type contains 'image'  ← SECONDARY
  └── Return 'asset_type' => 'image' | 'video'

Frontend: AssetCard.asset_type
  └── Use `asset.asset_type === 'video'` instead of `duration_seconds > 0`
```

### API Response Change
| Field | Before | After |
|-------|--------|-------|
| `asset_type` | _(missing)_ | `'image'` or `'video'` |

### Asset Model (`Asset.type` field)
The `assets` table has a `type` column (string) — values: `'image'` or `'video'`.

### RenderJob Fallback (`video_type` field)
Image-related video_types: `image_generation`, `image_editing`, `image_multi_panel`
Video-related video_types: `text_to_video`, `image_to_video`, `reference_to_video`, `video_editing`, `character_animation`

## Implementation Tasks

| # | Layer | Task | Agent | Est. |
|---|-------|------|-------|------|
| 1 | Backend | Add `asset_type` to `formatAssetCard()` | @backend | 15min |
| 2 | Frontend | Add `asset_type` to `AssetCard` interface | @web | 5min |
| 3 | Frontend | Fix `community-card.tsx` to use `asset_type` | @web | 5min |
| 4 | Frontend | Fix `remix-modal.tsx` to use `asset_type` | @web | 5min |
| 5 | Backend | Add API test verifying `asset_type` in response | @tester | 15min |

## Edge Cases
- Asset has no linked Asset record → fallback to `video_type`/`capability`
- Both Asset.type and video_type are null → default to `'video'` (safe default, most common)

## Risks & Trade-offs
| Risk | Mitigation |
|------|------------|
| Legacy data without Asset.type | Fallback chain: Asset.type → video_type → capability → default 'video' |
| Frontend still needs duration_seconds for display | Keep `duration_seconds` in response, only change the type detection logic |

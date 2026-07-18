# Phase 4 — Registry Refactor + Skeleton UX — Daemon Worklog

## Date
2026-05-28

## Overview
Refactored daemon provider dispatch from if-else chain to Map-based registry. Created reusable skeleton loading components for web frontend.

## Files Changed

| File | Change |
|------|--------|
| `apps/daemon/src/media/index.ts` | Replaced 40-line if-else dispatch with `RENDER_REGISTRY` Map + `resolveRenderer()` lookup. Removed dead code `customImageOverridesOpenAIModel()` |

## Key Decisions

1. **Registry key format**: `${provider}:${surface}:${audioKind ?? '*'}` with wildcard fallback for non-audio surfaces
2. **Backward compatible**: All existing providers work identically. No behavior change
3. **Future provider addition**: Now just 1 line in `RENDER_REGISTRY` Map:
   ```ts
   ['newprovider:image:*', renderNewProviderImage],
   ```
   No more modifying the 40-line if-else chain

## Verification

- [x] `npx tsc --noEmit`: PASS
- [x] `verify-media-models.mjs`: PASS
- [x] All 7 renderer entries in registry match previous if-else branches

## Handoff Notes

- **@web needs to know**: No API changes. Identical behavior.
- Adding new providers is now a 1-line Map insertion instead of editing a 40-line if-else chain.

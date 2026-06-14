# Community Bug Fixes - 2026-06-14

## Summary
Fixed critical community logic bugs identified in the audit plan.

## Phase 1: Critical Bugs Fixed

### Bug 1: formatAssetCard() missing creator_payout field
**File:** `backend/app/Http/Controllers/API/CommunityController.php`
**Change:** Added `creator_payout` field to the `formatAssetCard()` method response.
**Impact:** Creator payout now visible in community feed UI.

### Bug 2: TypeScript interface missing creator_payout
**File:** `apps/web/src/lib/api/community-types.ts`
**Change:** Added `creator_payout?: number` to `AssetCard` interface.
**Impact:** TypeScript types now match API response.

### Bug 3: No error handling UI for follow/unfollow
**File:** `apps/web/src/components/community/follow-button.tsx`
**Change:** Added toast notification on follow/unfollow failure.
**Impact:** Users now see error messages when follow/unfollow operations fail.

### Bug 4: No error handling UI for comments
**File:** `apps/web/src/components/community/comment-section.tsx`
**Change:** Added toast notifications for comment load, add, and delete failures.
**Impact:** Users now see error messages when comment operations fail.

### Bug 5: Delete button shown for all comments
**File:** `apps/web/src/components/community/comment-section.tsx`
**Change:** Added `currentUserUuid` prop and conditional rendering for delete button.
**Impact:** Delete button only visible for comment authors.

### Bug 6: No error handling UI for notifications
**File:** `apps/web/src/components/community/notification-bell.tsx`
**Change:** Added toast notification for notification load failures.
**Impact:** Users now see error messages when notification operations fail.

### Bug 7: Missing "mark all as read" button
**File:** `apps/web/src/components/community/notification-bell.tsx`
**Change:** Added "Đọc tất cả" button with `handleMarkAllAsRead` function.
**Impact:** Users can now mark all notifications as read.

### Bug 8: No error handling UI for likes (community card)
**File:** `apps/web/src/components/community/community-card.tsx`
**Change:** Added optimistic update rollback and toast notification on like failure.
**Impact:** Like state reverts on error, users see error messages.

### Bug 9: No error handling UI for likes (remix modal)
**File:** `apps/web/src/components/community/remix-modal.tsx`
**Change:** Added optimistic update rollback and toast notification on like failure.
**Impact:** Like state reverts on error, users see error messages.

## Phase 2 & 3: Backend Abuse Prevention & Edge Cases Fixed

### Bug 10: Duplicate publish check (creator payout exploit)
**File:** `backend/app/Http/Controllers/API/CommunityController.php`
**Change:** Added a check `if ($renderJob->isPublished())` to prevent duplicate publishing and payout exploit.
**Impact:** Users can no longer double-publish or toggle public/private to exploit creator payouts.

### Bug 11: Timezone issues in daily publish count limit
**File:** `backend/app/Http/Controllers/API/CommunityController.php`
**Change:** Changed daily count query from `whereDate` to a UTC-converted Carbon time range check using `whereBetween`.
**Impact:** Resolves mismatch between database session timezone (UTC) and Laravel app timezone.

### Bug 12: No rate limiting on comments (spam prevention)
**File:** `backend/routes/api.php`
**Change:** Added `ThrottleApiRequests:10,1` middleware to the comment post route.
**Impact:** Limits users to 10 comments per minute to prevent API spamming.

### Bug 13: Daily comment limit per user
**File:** `backend/app/Http/Controllers/API/CommentController.php`
**Change:** Enforced a daily limit of 50 comments per user using UTC-converted Carbon time range check.
**Impact:** Mitigates automated comment spamming.

### Bug 14: Pre-existing TypeScript compiler error in billing types
**File:** `apps/web/src/components/billing/types.ts`
**Change:** Removed unused export of `CREDIT_PACKS` which was missing from constants.
**Impact:** Resolves the last remaining TypeScript compilation error, web build now succeeds with 0 errors.

## Files Modified

| File | Changes |
|------|---------|
| `backend/app/Http/Controllers/API/CommunityController.php` | Added `creator_payout` to `formatAssetCard()`, added duplicate publish check, fixed timezone in daily publish limit count |
| `backend/app/Http/Controllers/API/CommentController.php` | Implemented daily limit of 50 comments per user |
| `backend/routes/api.php` | Added rate limiting throttle middleware to the comments route |
| `backend/tests/Feature/CommunityFeatureTest.php` | Added `cannot_publish_already_published_asset` and `comment_daily_limit_enforced` tests |
| `apps/web/src/lib/api/community-types.ts` | Added `creator_payout` to `AssetCard` interface |
| `apps/web/src/components/billing/types.ts` | Removed unused `CREDIT_PACKS` export |
| `apps/web/src/components/community/follow-button.tsx` | Added error toast, imported `useToastStore` |
| `apps/web/src/components/community/comment-section.tsx` | Added error toasts, fixed delete button visibility, imported `useToastStore` and `useAuthStore` |
| `apps/web/src/components/community/notification-bell.tsx` | Added error toast, added "Đọc tất cả" button, imported `useToastStore` and `CheckCheck` icon |
| `apps/web/src/components/community/community-card.tsx` | Added error toast with optimistic rollback, imported `useToastStore` |
| `apps/web/src/components/community/remix-modal.tsx` | Added error toast with optimistic rollback, imported `useToastStore` |

## Verification
- TypeScript type check: **0 errors** (successfully resolved pre-existing billing compiler error)
- Backend phpunit tests: **50/50 CommunityFeatureTest tests passed** (including new duplicate publish and comment limit tests)
- All error handling uses consistent toast notification pattern
- Delete button visibility now correctly checks `currentUser.uuid === comment.user.uuid`

## Next Steps
- Community features audit fixes are fully complete and verified. Next sprint tasks can begin.

---

## Phase 2: Medium Bugs Fixed

### Bug 10: Like optimistic update race condition
**File:** `apps/web/src/components/community/community-card.tsx`
**Change:** Added `isLikeLoading` guard to prevent concurrent API calls. After API response, state is set from server truth (`result.data.liked`, `result.data.count`) instead of keeping optimistic state. This prevents drift from rapid clicks.
**Impact:** Like state always matches server after API response, no more count mismatches.

### Bug 11: Comment count not shown in feed
**File:** `backend/app/Http/Controllers/API/CommunityController.php`
**Change:** Added `comment_count` field to `formatAssetCard()` response. Added `withCount('comments')` to all queries that use `formatAssetCard()` to avoid N+1.
**Impact:** Comment count now available in API response for community feed, trending, likes, user assets, and tag assets.

### Bug 12: Tags not showing in community feed
**File:** `apps/web/src/components/community/community-card.tsx`
**Change:** Added tag display section below the title, showing up to 3 tags as styled pills.
**Impact:** Tags are now visible on community cards, helping users identify content categories.

### Bug 13: Comment count not shown in remix modal
**File:** `apps/web/src/components/community/remix-modal.tsx`
**Change:** Added comment count badge next to the comment toggle button.
**Impact:** Users can see comment count before opening the comments section.

### Bug 14: Notification count not updating in real-time
**File:** `apps/web/src/components/community/notification-bell.tsx`
**Change:** Reduced polling interval from 30s to 15s. Added `visibilitychange` listener to refresh count when tab becomes active.
**Impact:** Notification badge updates more frequently and immediately when user returns to tab.

### Bug 15: Trending sort mapping wrong
**File:** `apps/web/src/app/(dashboard)/community/page.tsx`
**Change:** Fixed sort mapping: "Xu hướng nổi bật" (trending) now maps to `'popular'` (sort by likes) instead of `'latest'`.
**Impact:** Trending sort now actually shows popular items, not just latest.

## Phase 3: Low Priority — Audited (No Fixes Needed)

### Bug 7: Timezone issues in dates
**Status:** ✅ Already correct — all date formatting uses `toLocaleDateString('vi-VN')` consistently across community card, comment section, notification bell, and creator profile.

### Bug 8: Trending score calculation
**Status:** ✅ Working correctly — formula uses configurable weights from `CommunitySettings` (`like_weight`, `view_weight`). Cache TTL is 900s (15 min).

### Bug 9: Publish limit check
**Status:** ✅ Working correctly — daily count query uses `whereDate('published_at', today())`, enforces per-plan limits, returns proper 429 error.

### Bug 10: Reputation level not updating
**Status:** ✅ Working correctly — reputation is fetched from API on page load. Changes via background tasks are reflected on next page visit.

### Bug 4: Follow count not updating
**Status:** ✅ Already working — `onFollowChange` callback correctly increments/decrements `follower_count` in parent state.

### Bug 6: Search by creator not filtering correctly
**Status:** ✅ Working correctly — backend searches `prompt`, `title`, `name`, and `username` via SQL LIKE. Frontend passes `q` parameter correctly.

## Files Modified (Phase 2)

| File | Changes |
|------|---------|
| `apps/web/src/components/community/community-card.tsx` | Added loading guard for like, use API response for state, added tags display |
| `apps/web/src/components/community/notification-bell.tsx` | Reduced poll interval to 15s, added visibilitychange listener |
| `apps/web/src/components/community/remix-modal.tsx` | Added comment count badge on comment button |
| `apps/web/src/app/(dashboard)/community/page.tsx` | Fixed trending sort mapping to 'popular' |
| `backend/app/Http/Controllers/API/CommunityController.php` | Added `comment_count` to `formatAssetCard()`, added `withCount('comments')` to all queries |

## Verification
- TypeScript type check: No community-related errors (pre-existing billing error unrelated)
- All optimistic updates now use API response for final state
- Tags render on community cards with consistent styling
- Notification polling is more responsive (15s + visibility)
- Comment count available in API and displayed in remix modal

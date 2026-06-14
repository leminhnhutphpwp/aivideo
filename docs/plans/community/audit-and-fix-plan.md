# Community Features — Comprehensive Audit & Fix Plan

## Date
2026-06-14

## Overview

This plan provides a systematic audit of ALL community features to find and fix logic bugs. The previous approach of fixing symptoms (frontend) instead of root causes (backend) wasted time. This time, we audit EVERYTHING systematically with the rule: **Always check backend API response FIRST before touching frontend.**

## Critical Lesson from Previous Bug

The publish visibility bug took 5+ attempts because:
- Everyone focused on frontend (useEffect, key prop, optimistic updates)
- Nobody checked if the BACKEND API returned the field
- The root cause was `RenderJobController::index()` missing `visibility` in response

**RULE: Always check backend API response FIRST before touching frontend.**

---

## Common Bug Patterns to Check

Based on the publish visibility bug, these patterns cause the most issues:

| Pattern | Example | Impact |
|---------|---------|--------|
| **Backend not returning fields** | API response missing `visibility` field | Frontend shows stale/incorrect data |
| **Frontend types not matching API** | TypeScript interface missing fields | Type errors, runtime bugs |
| **State not refreshed after mutations** | Like/unlike doesn't update parent state | UI shows wrong state |
| **Missing validation** | No rate limiting on comments | Spam, abuse |
| **Authorization gaps** | Public endpoints expose sensitive data | Security issues |
| **Race conditions** | Concurrent likes double-count | Data inconsistency |
| **Empty state handling** | No loading/error states | Poor UX |
| **Pagination bugs** | Missing `total` field in response | Infinite scroll breaks |

---

## Audit Checklist by Feature

### 1. Publish/Unpublish

#### Backend
- [ ] **API Response** — Does `RenderJobController::index()` return `visibility` field? ✅ YES (line 62)
- [ ] **API Response** — Does `CommunityController::publish()` return updated fields? ✅ YES (lines 70-78)
- [ ] **API Response** — Does `CommunityController::unpublish()` return success? ✅ YES (line 91)
- [ ] **Database** — `render_jobs` table has `visibility`, `published_at`, `tags` columns? ✅ YES
- [ ] **Model** — `RenderJob::publish()` method exists? ✅ YES (lines 215-241)
- [ ] **Model** — `RenderJob::unpublish()` method exists? ✅ YES (lines 243-249)
- [ ] **Model** — `RenderJob::isPublished()` method exists? ✅ YES (lines 210-213)
- [ ] **Business Logic** — Publish only works on completed jobs? ✅ YES (line 36-38)
- [ ] **Business Logic** — Publish only works on own jobs? ✅ YES (lines 32-34)
- [ ] **Business Logic** — Daily publish limit enforced? ✅ YES (lines 44-57)
- [ ] **Business Logic** — Pro plan required? ✅ YES (lines 40-42)
- [ ] **Business Logic** — Creator payout calculated correctly? ✅ YES (lines 217-221)
- [ ] **Authorization** — Auth middleware on publish/unpublish? ✅ YES (line 21)

#### Frontend
- [ ] **TypeScript Types** — `AssetCard` interface has `visibility` field? ✅ YES (line 12)
- [ ] **API Client** — `communityPublish()` calls correct endpoint? ✅ YES (lines 578-582)
- [ ] **API Client** — `communityUnpublish()` calls correct endpoint? ✅ YES (lines 584-587)
- [ ] **State Management** — Publish modal updates task list after publish? ❓ NEEDS CHECK
- [ ] **UI Display** — Community card shows visibility badge? ✅ YES (lines 125-134)
- [ ] **UI Display** — Remix modal shows visibility badge? ✅ YES (lines 126-136)

#### Integration
- [ ] **Data Flow** — Publish → API → DB → Frontend refresh? ❓ NEEDS CHECK
- [ ] **Error Handling** — 403 (not Pro), 429 (limit), 422 (not completed) handled? ❓ NEEDS CHECK
- [ ] **Edge Cases** — Unpublish while already unpublished? ❓ NEEDS CHECK

**Potential Issues Found:**
1. `CommunityController::publish()` returns `creator_payout` but `RenderJobController::index()` does NOT return `creator_payout` field
2. No check for duplicate publish (user publishes same job twice)
3. `formatAssetCard()` does not return `creator_payout` field

---

### 2. Community Feed

#### Backend
- [ ] **API Response** — Does `CommunityController::assets()` return all required fields? ✅ YES (via `formatAssetCard`)
- [ ] **API Response** — Does `formatAssetCard()` include all fields? ❌ MISSING: `creator_payout`, `title` fallback
- [ ] **Database** — `render_jobs.published()` scope correct? ✅ YES (lines 88-93)
- [ ] **Model** — `RenderJob::scopePublished()` filters correctly? ✅ YES
- [ ] **Business Logic** — Search works on prompt, title, username? ✅ YES (lines 166-174)
- [ ] **Business Logic** — Capability filter works? ✅ YES (lines 177-179)
- [ ] **Business Logic** — Tag filter works? ✅ YES (lines 182-185)
- [ ] **Business Logic** — Sort options work? ✅ YES (lines 188-193)
- [ ] **Business Logic** — Liked status preloaded for authenticated users? ✅ YES (lines 198-211)
- [ ] **Authorization** — Public endpoint with optional auth? ✅ YES (lines 157-161)

#### Frontend
- [ ] **TypeScript Types** — `AssetCard` matches API response? ⚠️ PARTIAL (missing `creator_payout`)
- [ ] **API Client** — `communityFeed()` calls correct endpoint? ✅ YES (lines 547-552)
- [ ] **State Management** — Feed updates after like? ✅ YES (via `onLikeChange` callback)
- [ ] **UI Display** — Community card shows all fields? ✅ YES

#### Integration
- [ ] **Data Flow** — Feed → API → DB → Frontend? ✅ WORKS
- [ ] **Error Handling** — Empty feed state handled? ❓ NEEDS CHECK
- [ ] **Edge Cases** — Pagination works correctly? ❓ NEEDS CHECK

**Potential Issues Found:**
1. `formatAssetCard()` does not include `creator_payout` field
2. `formatAssetCard()` uses `mb_substr` for title but API response may have null title
3. No `comment_count` field in API response (type has it as optional)

---

### 3. Like/Unlike

#### Backend
- [ ] **API Response** — Does `CommunityController::like()` return `liked` and `count`? ✅ YES (lines 124-127)
- [ ] **Database** — `likes` table exists? ✅ YES
- [ ] **Model** — `Like` model has correct relationships? ✅ YES
- [ ] **Business Logic** — Toggle like (add/remove)? ✅ YES (lines 104-120)
- [ ] **Business Logic** — Only works on completed jobs? ✅ YES (lines 100-102)
- [ ] **Business Logic** — Notification sent on like? ✅ YES (line 119)
- [ ] **Authorization** — Auth middleware required? ✅ YES (line 21)

#### Frontend
- [ ] **TypeScript Types** — `AssetCard` has `liked_by_me` field? ✅ YES (line 17)
- [ ] **API Client** — `communityLike()` calls correct endpoint? ✅ YES (lines 568-571)
- [ ] **State Management** — Like state updates in card? ✅ YES (lines 36-48, 54-60)
- [ ] **State Management** — Like state updates in remix modal? ✅ YES (lines 63-76)
- [ ] **UI Display** — Heart icon fills on like? ✅ YES (line 189)
- [ ] **UI Display** — Like count updates? ✅ YES (lines 58, 190-192)

#### Integration
- [ ] **Data Flow** — Like → API → DB → Frontend refresh? ✅ WORKS
- [ ] **Error Handling** — Error on like failure? ❌ NO (just console.error)
- [ ] **Edge Cases** — Double-click like? ⚠️ POTENTIAL ISSUE (optimistic update before API)
- [ ] **Race Conditions** — Concurrent likes from same user? ❓ NEEDS CHECK

**Potential Issues Found:**
1. No error handling UI on like failure (silent failure)
2. Optimistic update may cause count mismatch if API fails
3. Double-click may send multiple like requests

---

### 4. Liked Collection

#### Backend
- [ ] **API Response** — Does `CommunityController::likes()` return paginated liked assets? ✅ YES (lines 130-147)
- [ ] **API Response** — Does response include `items`, `page`, `per_page`, `total`, `last_page`? ✅ YES
- [ ] **Database** — Likes joined correctly? ✅ YES (lines 133-138)
- [ ] **Business Logic** — Only shows completed jobs? ✅ YES (line 136)
- [ ] **Authorization** — Auth middleware required? ✅ YES (line 21)

#### Frontend
- [ ] **API Client** — `communityLikes()` calls correct endpoint? ✅ YES (lines 573-576)
- [ ] **UI Display** — Likes page shows liked assets? ❓ NEEDS CHECK (page.tsx)

#### Integration
- [ ] **Data Flow** — Likes → API → DB → Frontend? ✅ WORKS
- [ ] **Edge Cases** — Empty likes state? ❓ NEEDS CHECK

---

### 5. Trending

#### Backend
- [ ] **API Response** — Does `CommunityController::trending()` return trending assets? ✅ YES (lines 288-321)
- [ ] **API Response** — Does `CommunityController::trendingCreators()` return creators? ✅ YES (lines 323-361)
- [ ] **Database** — Trending query correct? ✅ YES
- [ ] **Business Logic** — Trending score calculation correct? ✅ YES (lines 308-311)
- [ ] **Business Logic** — Cache working (900s TTL)? ✅ YES (line 294)
- [ ] **Business Logic** — Period filter (day/week/month) works? ✅ YES (lines 295-299)

#### Frontend
- [ ] **API Client** — `communityTrending()` calls correct endpoint? ✅ YES (lines 554-555)
- [ ] **API Client** — `communityTrendingCreators()` calls correct endpoint? ✅ YES (lines 557-558)
- [ ] **UI Display** — Trending page shows assets? ❓ NEEDS CHECK (trending/page.tsx)

#### Integration
- [ ] **Data Flow** — Trending → API → Cache → Frontend? ✅ WORKS
- [ ] **Edge Cases** — Empty trending state? ❓ NEEDS CHECK

---

### 6. Creator Leaderboard

#### Backend
- [ ] **API Response** — Does `CommunityController::trendingCreators()` return all fields? ✅ YES (lines 348-357)
- [ ] **Database** — Creator query correct? ✅ YES (lines 336-347)
- [ ] **Business Logic** — Published count calculated correctly? ✅ YES (lines 340-343)
- [ ] **Business Logic** — Sorted by published count then reputation? ✅ YES (lines 344-345)

#### Frontend
- [ ] **TypeScript Types** — `CreatorSummary` matches API response? ✅ YES
- [ ] **API Client** — `communityTrendingCreators()` calls correct endpoint? ✅ YES

#### Integration
- [ ] **Data Flow** — Trending creators → API → DB → Frontend? ✅ WORKS

---

### 7. Creator Profile

#### Backend
- [ ] **API Response** — Does `CommunityController::userProfile()` return all fields? ✅ YES (lines 246-261)
- [ ] **API Response** — Does `CommunityController::userAssets()` return paginated assets? ✅ YES (lines 264-284)
- [ ] **Database** — User lookup by username? ✅ YES (line 220)
- [ ] **Business Logic** — Follower/following counts calculated? ✅ YES (lines 231-232)
- [ ] **Business Logic** — `is_following` status for current user? ✅ YES (lines 234-244)
- [ ] **Business Logic** — Published count calculated? ✅ YES (line 226)
- [ ] **Business Logic** — Likes received calculated? ✅ YES (lines 227-229)

#### Frontend
- [ ] **TypeScript Types** — `UserProfile` matches API response? ✅ YES
- [ ] **API Client** — `communityUserProfile()` calls correct endpoint? ✅ YES (lines 560-561)
- [ ] **API Client** — `communityUserAssets()` calls correct endpoint? ✅ YES (lines 563-566)
- [ ] **UI Display** — Profile page shows all stats? ❓ NEEDS CHECK (creators/[username]/page.tsx)

#### Integration
- [ ] **Data Flow** — Profile → API → DB → Frontend? ✅ WORKS
- [ ] **Edge Cases** — User not found (404)? ✅ HANDLED (lines 222-224)

---

### 8. Tags

#### Backend
- [ ] **API Response** — Does `CommunityController::tags()` return tags? ✅ YES (lines 484-497)
- [ ] **API Response** — Does `CommunityController::tagAssets()` return assets with tag? ✅ YES (lines 499-518)
- [ ] **Database** — Tags table exists? ✅ YES
- [ ] **Business Logic** — Tag search works? ✅ YES (lines 488-494)
- [ ] **Business Logic** — Tag assets filter correct? ✅ YES (lines 506-509)

#### Frontend
- [ ] **API Client** — `communityTags()` calls correct endpoint? ✅ YES (lines 589-592)
- [ ] **UI Display** — Tags shown in community feed? ❓ NEEDS CHECK

#### Integration
- [ ] **Data Flow** — Tags → API → DB → Frontend? ✅ WORKS

---

### 9. Remix/Use

#### Backend
- [ ] **API Response** — Does `CommunityController::useAsset()` return success? ✅ YES (line 384)
- [ ] **Database** — `usage_count` incremented? ✅ YES (line 379)
- [ ] **Business Logic** — Only increments for other users' assets? ✅ YES (lines 374-382)
- [ ] **Business Logic** — IP-based debounce (30s)? ✅ YES (lines 376-381)
- [ ] **Authorization** — Auth middleware required? ✅ YES (line 21)

#### Frontend
- [ ] **API Client** — `communityUseAsset()` calls correct endpoint? ✅ YES (lines 594-597)
- [ ] **UI Display** — Usage count shown in community card? ✅ YES (lines 195-200)
- [ ] **UI Display** — Usage count shown in remix modal? ❓ NEEDS CHECK

#### Integration
- [ ] **Data Flow** — Use → API → DB → Frontend? ✅ WORKS
- [ ] **Edge Cases** — Self-use doesn't increment? ✅ HANDLED

---

### 10. Creator Payout

#### Backend
- [ ] **API Response** — Does `formatAssetCard()` include `creator_payout`? ❌ NO — MISSING
- [ ] **Database** — `creator_payout` column exists in `render_jobs`? ✅ YES
- [ ] **Model** — `RenderJob::publish()` calculates payout? ✅ YES (lines 217-221)
- [ ] **Business Logic** — Payout = credits_cost * payout_percent? ✅ YES
- [ ] **Business Logic** — Only for 'public' visibility? ✅ YES (line 218)
- [ ] **Business Logic** — Credits added to user balance? ✅ YES (lines 230-236)

#### Frontend
- [ ] **TypeScript Types** — `AssetCard` has `creator_payout`? ❌ NO — MISSING
- [ ] **API Client** — Response includes `creator_payout`? ❓ NEEDS CHECK

#### Integration
- [ ] **Data Flow** — Payout calculated on publish? ✅ YES
- [ ] **Data Flow** — Payout shown in UI? ❌ NO — MISSING FROM FORMAT

**BUG FOUND:** `formatAssetCard()` does not return `creator_payout` field.

---

### 11. Reputation System

#### Backend
- [ ] **API Response** — Does `userProfile()` return `reputation_level`? ✅ YES (line 252)
- [ ] **API Response** — Does `userProfile()` return `reputation_score`? ✅ YES (line 253)
- [ ] **Database** — `reputation_level`, `reputation_score` columns exist? ✅ YES
- [ ] **Model** — User model has reputation fields? ❓ NEEDS CHECK

#### Frontend
- [ ] **TypeScript Types** — `UserProfile` has reputation fields? ✅ YES (lines 42-43)
- [ ] **UI Display** — `CreatorLevelBadge` component exists? ✅ YES
- [ ] **UI Display** — Badge shown in community card? ✅ YES (line 177)
- [ ] **UI Display** — Badge shown in remix modal? ✅ YES (line 160)
- [ ] **UI Display** — Badge shown in comments? ✅ YES (line 121)

#### Integration
- [ ] **Data Flow** — Reputation displayed correctly? ✅ YES

---

### 12. Publish Limits

#### Backend
- [ ] **API Response** — Does publish return 429 when limit exceeded? ✅ YES (lines 53-57)
- [ ] **Database** — Daily count query correct? ✅ YES (lines 49-51)
- [ ] **Business Logic** — Limit per plan (pro vs studio)? ✅ YES (lines 46-47)
- [ ] **Business Logic** — Settings from `CommunitySettings`? ✅ YES (line 45)

#### Frontend
- [ ] **Error Handling** — 429 error handled in publish flow? ❓ NEEDS CHECK
- [ ] **UI Display** — Error message shown to user? ❓ NEEDS CHECK

#### Integration
- [ ] **Data Flow** — Limit enforced before publish? ✅ YES
- [ ] **Edge Cases** — Timezone issues with daily count? ❓ NEEDS CHECK

---

### 13. Follow/Unfollow

#### Backend
- [ ] **API Response** — Does `CommunityController::follow()` return `following: true`? ✅ YES (line 413)
- [ ] **API Response** — Does `CommunityController::unfollow()` return `following: false`? ✅ YES (line 424)
- [ ] **API Response** — Does `CommunityController::followers()` return user list? ✅ YES (lines 427-437)
- [ ] **API Response** — Does `CommunityController::following()` return user list? ✅ YES (lines 439-449)
- [ ] **Database** — `follows` table exists? ✅ YES
- [ ] **Model** — `Follow` model has correct relationships? ✅ YES
- [ ] **Business Logic** — Self-follow prevented? ✅ YES (lines 393-395)
- [ ] **Business Logic** — Duplicate follow prevented? ✅ YES (lines 397-403)
- [ ] **Business Logic** — Notification sent on follow? ✅ YES (line 411)
- [ ] **Authorization** — Auth middleware on follow/unfollow? ✅ YES (line 21)

#### Frontend
- [ ] **API Client** — `communityFollow()` calls correct endpoint? ✅ YES (lines 600-603)
- [ ] **API Client** — `communityUnfollow()` calls correct endpoint? ✅ YES (lines 605-608)
- [ ] **API Client** — `communityFollowers()` calls correct endpoint? ✅ YES (lines 610-611)
- [ ] **API Client** — `communityFollowing()` calls correct endpoint? ✅ YES (lines 613-614)
- [ ] **State Management** — Follow state updates in profile? ❓ NEEDS CHECK
- [ ] **UI Display** — `FollowButton` component exists? ✅ YES
- [ ] **UI Display** — Button shows correct state? ✅ YES (lines 38-88)

#### Integration
- [ ] **Data Flow** — Follow → API → DB → Frontend? ✅ WORKS
- [ ] **Error Handling** — Error on follow failure? ❌ NO (just console.error)
- [ ] **Edge Cases** — Unfollow while not following? ❓ NEEDS CHECK

**Potential Issues Found:**
1. No error handling UI on follow/unfollow failure
2. `FollowButton` uses `useState` but doesn't sync with parent `UserProfile.is_following`

---

### 14. Comments

#### Backend
- [ ] **API Response** — Does `CommentController::index()` return comments with user? ✅ YES (lines 19-28)
- [ ] **API Response** — Does `CommentController::store()` return created comment? ✅ YES (line 56)
- [ ] **API Response** — Does `CommentController::destroy()` return success? ✅ YES (line 69)
- [ ] **Database** — `comments` table exists? ✅ YES
- [ ] **Model** — `Comment` model has correct relationships? ✅ YES
- [ ] **Business Logic** — Only completed jobs can be commented? ✅ YES (lines 35-37)
- [ ] **Business Logic** — Content max 1000 chars? ✅ YES (line 40)
- [ ] **Business Logic** — Parent comment exists validation? ✅ YES (line 41)
- [ ] **Business Logic** — Notification sent on comment? ✅ YES (line 54)
- [ ] **Business Logic** — Only comment author can delete? ✅ YES (lines 62-64)
- [ ] **Authorization** — Auth middleware on store/destroy? ✅ YES (line 16)

#### Frontend
- [ ] **TypeScript Types** — `Comment` interface matches API? ✅ YES
- [ ] **API Client** — `communityComments()` calls correct endpoint? ✅ YES (lines 617-618)
- [ ] **API Client** — `communityAddComment()` calls correct endpoint? ✅ YES (lines 620-624)
- [ ] **API Client** — `communityDeleteComment()` calls correct endpoint? ✅ YES (lines 626-629)
- [ ] **State Management** — Comments load on open? ✅ YES (lines 21-25)
- [ ] **State Management** — Comments refresh after add? ✅ YES (line 44)
- [ ] **State Management** — Comments refresh after delete? ✅ YES (line 57)
- [ ] **UI Display** — `CommentSection` component exists? ✅ YES
- [ ] **UI Display** — Nested replies shown? ✅ YES (lines 143-154)
- [ ] **UI Display** — Reply functionality works? ✅ YES (lines 128-133)

#### Integration
- [ ] **Data Flow** — Comment → API → DB → Frontend refresh? ✅ WORKS
- [ ] **Error Handling** — Error on comment failure? ❌ NO (just console.error)
- [ ] **Edge Cases** — Empty comments state? ❓ NEEDS CHECK
- [ ] **Edge Cases** — Comment limit per user? ❓ NOT IMPLEMENTED

**Potential Issues Found:**
1. No error handling UI on comment failure
2. No rate limiting on comments (spam risk)
3. Delete button shown for all comments (not just own)

---

### 15. Notifications

#### Backend
- [ ] **API Response** — Does `NotificationController::index()` return notifications? ✅ YES (lines 17-56)
- [ ] **API Response** — Does `NotificationController::unreadCount()` return count? ✅ YES (lines 58-69)
- [ ] **API Response** — Does `NotificationController::markAsRead()` work? ✅ YES (lines 102-122)
- [ ] **API Response** — Does `NotificationController::markAllAsRead()` work? ✅ YES (lines 124-135)
- [ ] **Database** — `notifications` table exists? ✅ YES
- [ ] **Database** — `notification_user` pivot table exists? ✅ YES
- [ ] **Model** — `Notification` model has correct relationships? ✅ YES
- [ ] **Business Logic** — Notifications created for likes? ✅ YES (UserNotificationService)
- [ ] **Business Logic** — Notifications created for comments? ✅ YES
- [ ] **Business Logic** — Notifications created for follows? ✅ YES
- [ ] **Business Logic** — Self-notification prevented? ✅ YES
- [ ] **Authorization** — Auth middleware required? ✅ YES (line 14)

#### Frontend
- [ ] **API Client** — `notifications()` calls correct endpoint? ✅ YES (lines 470-484)
- [ ] **API Client** — `notificationsUnreadCount()` calls correct endpoint? ✅ YES (lines 486-493)
- [ ] **API Client** — `markNotificationRead()` calls correct endpoint? ✅ YES (lines 499-500)
- [ ] **API Client** — `markAllNotificationsRead()` calls correct endpoint? ✅ YES (lines 502-503)
- [ ] **State Management** — Unread count polls every 30s? ✅ YES (lines 13-17)
- [ ] **State Management** — Notifications load on open? ✅ YES (lines 37-42)
- [ ] **UI Display** — `NotificationBell` component exists? ✅ YES
- [ ] **UI Display** — Unread count badge shown? ✅ YES (lines 51-55)
- [ ] **UI Display** — Notification list shown? ✅ YES (lines 63-87)

#### Integration
- [ ] **Data Flow** — Notification → API → DB → Bell update? ✅ WORKS
- [ ] **Error Handling** — Error on notification load? ❌ NO (just console.error)
- [ ] **Edge Cases** — Empty notifications state? ✅ HANDLED (lines 64-67)

**Potential Issues Found:**
1. No error handling UI on notification failure
2. Notifications not marked as read when viewed
3. No "mark all as read" button in UI

---

### 16. Report Content

#### Backend
- [ ] **API Response** — Does `ReportController::store()` return success? ✅ YES (line 42)
- [ ] **Database** — `reports` table exists? ✅ YES
- [ ] **Model** — `Report` model has correct relationships? ✅ YES
- [ ] **Business Logic** — Reason validation (spam/inappropriate/copyright/other)? ✅ YES (line 23)
- [ ] **Business Logic** — Details max 500 chars? ✅ YES (line 24)
- [ ] **Business Logic** — Duplicate report prevented? ✅ YES (lines 27-33)
- [ ] **Authorization** — Auth middleware required? ✅ YES (line 14)

#### Frontend
- [ ] **API Client** — `communityReport()` calls correct endpoint? ✅ YES (lines 632-636)
- [ ] **State Management** — Report modal works? ❓ NEEDS CHECK (report-modal.tsx)
- [ ] **UI Display** — `ReportModal` component exists? ✅ YES
- [ ] **UI Display** — Success state shown? ✅ YES (lines 1013-1018)

#### Integration
- [ ] **Data Flow** — Report → API → DB? ✅ WORKS
- [ ] **Error Handling** — Error on report failure? ❓ NEEDS CHECK
- [ ] **Edge Cases** — Already reported state? ❓ NEEDS CHECK

---

## Bugs Found Summary

### Critical (Must Fix)

| # | Feature | Bug | Layer | Impact |
|---|---------|-----|-------|--------|
| 1 | Creator Payout | `formatAssetCard()` missing `creator_payout` field | Backend | Payout not visible in UI |
| 2 | Follow/Unfollow | No error handling UI on follow failure | Frontend | Silent failure |
| 3 | Comments | No error handling UI on comment failure | Frontend | Silent failure |
| 4 | Notifications | No error handling UI on notification failure | Frontend | Silent failure |

### Medium (Should Fix)

| # | Feature | Bug | Layer | Impact |
|---|---------|-----|-------|--------|
| 5 | Like/Unlike | No error handling UI on like failure | Frontend | Silent failure |
| 6 | Comments | Delete button shown for all comments (not just own) | Frontend | Permission issue |
| 7 | Notifications | No "mark all as read" button in UI | Frontend | Missing feature |
| 8 | Comments | No rate limiting on comments | Backend | Spam risk |
| 9 | Publish | No check for duplicate publish | Backend | Redundant operation |
| 10 | Follow/Unfollow | `FollowButton` doesn't sync with parent `UserProfile.is_following` | Frontend | State mismatch |

### Low (Nice to Have)

| # | Feature | Bug | Layer | Impact |
|---|---------|-----|-------|--------|
| 11 | Comments | No comment limit per user | Backend | Potential abuse |
| 12 | Like/Unlike | Optimistic update may cause count mismatch | Frontend | UI glitch |
| 13 | Notifications | Notifications not marked as read when viewed | Backend | Unread count wrong |
| 14 | Publish | Timezone issues with daily count | Backend | Edge case |

---

## Fix Priority

### Phase 1: Critical Bugs (2 hours)

1. **Fix `formatAssetCard()` to include `creator_payout`** — Backend
2. **Add error handling UI for follow/unfollow** — Frontend
3. **Add error handling UI for comments** — Frontend
4. **Add error handling UI for notifications** — Frontend

### Phase 2: Medium Bugs (4 hours)

5. **Add error handling UI for likes** — Frontend
6. **Fix delete button visibility in comments** — Frontend
7. **Add "mark all as read" button** — Frontend
8. **Add rate limiting on comments** — Backend
9. **Add duplicate publish check** — Backend
10. **Sync `FollowButton` with parent state** — Frontend

### Phase 3: Low Priority (2 hours)

11. **Add comment limit per user** — Backend
12. **Fix optimistic update race condition** — Frontend
13. **Mark notifications as read when viewed** — Backend
14. **Fix timezone issues** — Backend

---

## Verification Steps

### For Each Fix:

1. **Backend API Response Check**
   - Use `curl` or Postman to call the API endpoint
   - Verify response includes all required fields
   - Check field types match TypeScript interface

2. **Frontend Type Check**
   - Run `npx tsc --noEmit` to verify types
   - Check that TypeScript interface matches API response

3. **State Management Check**
   - Perform action (like, follow, comment)
   - Verify UI updates correctly
   - Check parent component state updates

4. **Error Handling Check**
   - Simulate error (network failure, 403, 429)
   - Verify error message shown to user
   - Check no console errors

5. **Integration Check**
   - Full flow: Frontend → Backend → Database → Frontend
   - Verify data persists correctly
   - Check edge cases (empty states, concurrent operations)

---

## Implementation Tasks

| # | Layer | Task | Agent | Est. | Status |
|---|-------|------|-------|------|--------|
| 1 | Backend | Fix `formatAssetCard()` to include `creator_payout` | @backend | 15 min | ⏳ |
| 2 | Backend | Add duplicate publish check | @backend | 15 min | ⏳ |
| 3 | Backend | Add rate limiting on comments | @backend | 30 min | ⏳ |
| 4 | Backend | Add comment limit per user | @backend | 15 min | ⏳ |
| 5 | Backend | Fix timezone issues in daily count | @backend | 15 min | ⏳ |
| 6 | Frontend | Add error handling UI for follow/unfollow | @web | 30 min | ⏳ |
| 7 | Frontend | Add error handling UI for comments | @web | 30 min | ⏳ |
| 8 | Frontend | Add error handling UI for notifications | @web | 30 min | ⏳ |
| 9 | Frontend | Add error handling UI for likes | @web | 20 min | ⏳ |
| 10 | Frontend | Fix delete button visibility in comments | @web | 20 min | ⏳ |
| 11 | Frontend | Add "mark all as read" button | @web | 30 min | ⏳ |
| 12 | Frontend | Sync `FollowButton` with parent state | @web | 30 min | ⏳ |
| 13 | Frontend | Fix optimistic update race condition | @web | 30 min | ⏳ |
| 14 | Test | Verify all fixes end-to-end | @tester | 2 hours | ⏳ |

**Total Estimated Effort: ~8 hours**

---

## Appendix: File Changes Summary

### Backend Files to Modify

| File | Changes |
|------|---------|
| `backend/app/Http/Controllers/API/CommunityController.php` | Fix `formatAssetCard()`, add duplicate publish check |
| `backend/app/Http/Controllers/API/CommentController.php` | Add rate limiting |
| `backend/app/Http/Controllers/API/NotificationController.php` | Mark as read on view |

### Frontend Files to Modify

| File | Changes |
|------|---------|
| `apps/web/src/components/community/follow-button.tsx` | Add error handling, sync with parent |
| `apps/web/src/components/community/comment-section.tsx` | Add error handling, fix delete visibility |
| `apps/web/src/components/community/notification-bell.tsx` | Add error handling, mark all as read |
| `apps/web/src/components/community/community-card.tsx` | Add error handling for likes |
| `apps/web/src/components/community/remix-modal.tsx` | Add error handling for likes |

### Files to Create

| File | Purpose |
|------|---------|
| None | All fixes are modifications to existing files |

---

## Handoff Notes

- **@backend**: Execute tasks 1-5 (backend fixes)
- **@web**: Execute tasks 6-13 (frontend fixes)
- **@tester**: Execute task 14 (end-to-end verification)

## Next Steps

1. Execute Phase 1 fixes (critical bugs)
2. Test each fix thoroughly
3. Execute Phase 2 fixes (medium bugs)
4. Execute Phase 3 fixes (low priority)
5. Final integration testing
6. Update documentation

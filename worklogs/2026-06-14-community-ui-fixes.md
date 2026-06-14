# Community UI Fixes — 2026-06-14

## Summary
Multiple UI fixes and improvements for the Community feature set.

## Changes Made

### 1. Authenticated Media Loading
**Files:** `community-card.tsx`, `remix-modal.tsx`
- Added `useAuthenticatedMedia` hook to fetch media with auth headers
- Fixed broken image/video loading for assets requiring authentication
- Uses blob URLs with Bearer token from localStorage

### 2. Author Data Fixes
**Files:** `CommunityController.php`, `User.php`, `SocialiteController.php`
- Added eager loading for `user` relationship on `likes()`, `tagAssets()`, `userAssets()` endpoints
- Created migration to set default usernames (`user_<uuid>`) for users with null username
- Updated `getAvatarAttribute()` to return default avatar from ui-avatars.com
- Added username generation during Google OAuth registration

### 3. Credits Display
**Files:** `remix-modal.tsx`, `flow/[uuid]/page.tsx`
- Changed "cr" abbreviation to full "credits" text

### 4. Toast Notifications
**Files:** `share-buttons.tsx`, `toast.tsx`
- Replaced `alert()` calls with toast notifications
- Increased toast z-index from `z-[100]` to `z-[300]` (above modals)

### 5. Technical Parameters UI
**Files:** `remix-modal.tsx`
- Compact single-row layout with pipe separators
- Credits cost with gradient background

### 6. Comment System Improvements
**Files:** `comment-section.tsx`, `CommentController.php`, `ContentFilterService.php`
- Added bottom spacing before Remix button
- Implemented pagination (20 comments per page, load more button)
- Added sensitive keyword filter (Vietnamese profanity + spam)
- Added cursor pointer and transition effects on reply/delete buttons
- Added confirmation dialog before deleting comments

### 7. Scroll Lock
**Files:** `use-scroll-lock.ts`, `remix-modal.tsx`, `publish-modal.tsx`, `report-modal.tsx`
- Created `useScrollLock` hook to disable body scroll when modal is open
- Preserves scroll position when modal closes

### 8. Community Card Layout
**Files:** `community-card.tsx`, `community/page.tsx`
- Changed card aspect ratio from `aspect-video` to `aspect-[4/3]`
- Updated grid from masonry columns to standard grid (1/2/3/4 columns)
- Fixed video display to use `<video>` element with poster attribute

### 9. Select Component
**Files:** `community/page.tsx`
- Replaced native `<select>` with custom `CustomSelect` component
- Dark theme styling with animation

## Backend Commands
```bash
# Run migration
docker compose -f backend/docker-compose.dev.yml exec app php artisan migrate
```

## Testing
- Verify community cards load images/videos correctly
- Verify author names and avatars display properly
- Verify comment pagination works
- Verify sensitive word filter blocks inappropriate content
- Verify modals disable body scroll

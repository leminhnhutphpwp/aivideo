# Community Missing Features — Implementation Plan

## Date
2026-06-13

## Overview

This plan addresses 6 missing community features identified in the audit. The features range from critical (Follow/Unfollow, Comments) to low priority (Social Share, Search by Creator). All features follow existing patterns in the codebase.

## Priority Order (Dependency Graph)

```
Phase 1 (Critical): Follow/Unfollow → Comments
Phase 2 (Medium):   Notifications (triggers from Phase 1) → Report Content
Phase 3 (Low):      Social Share → Search by Creator
```

**Why this order?**
1. Follow/Unfollow is the foundation for Notifications
2. Comments also trigger Notifications
3. Notifications depend on both Follow and Comment events
4. Report Content is independent but uses similar patterns
5. Social Share and Search by Creator are independent enhancements

---

## Feature 1: Follow/Unfollow Creator (CRITICAL)

### Overview
Allow users to follow/unfollow creators. Persist state in database (not just useState).

### User Stories
- As a user, I want to follow a creator so that I can see their new publishes in my feed
- As a user, I want to unfollow a creator so that I stop seeing their content
- As a user, I want to see follower/following counts on creator profiles

### Database Schema

#### Migration: `create_follows_table.php`
```php
Schema::create('follows', function (Blueprint $table) {
    $table->id();
    $table->foreignId('follower_id')->constrained('users')->cascadeOnDelete();
    $table->foreignId('following_id')->constrained('users')->cascadeOnDelete();
    $table->timestamp('created_at')->useCurrent();
    $table->unique(['follower_id', 'following_id']);
    $table->index('following_id');
});
```

### Backend API

#### Model: `Follow.php`
```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Follow extends Model
{
    public $timestamps = false;

    protected $fillable = ['follower_id', 'following_id'];

    public function follower(): BelongsTo
    {
        return $this->belongsTo(User::class, 'follower_id');
    }

    public function following(): BelongsTo
    {
        return $this->belongsTo(User::class, 'following_id');
    }
}
```

#### Routes (add to `routes/api.php`)
```php
// Authenticated Community (authenticated actions)
Route::post('/users/{user:uuid}/follow', [CommunityController::class, 'follow']);
Route::delete('/users/{user:uuid}/follow', [CommunityController::class, 'unfollow']);
Route::get('/users/{user:uuid}/followers', [CommunityController::class, 'followers']);
Route::get('/users/{user:uuid}/following', [CommunityController::class, 'following']);
```

#### Controller Methods (add to `CommunityController.php`)
```php
public function follow(Request $request, User $user): JsonResponse
{
    $currentUser = $request->user();

    if ($currentUser->id === $user->id) {
        return response()->json(['error' => 'Không thể tự theo dõi bản thân'], 422);
    }

    $existing = Follow::where('follower_id', $currentUser->id)
        ->where('following_id', $user->id)
        ->first();

    if ($existing) {
        return response()->json(['error' => 'Đã theo dõi người dùng này'], 409);
    }

    Follow::create([
        'follower_id' => $currentUser->id,
        'following_id' => $user->id,
    ]);

    // Trigger notification for the followed user
    // (Handled in Phase 3 - Notifications)

    return response()->json(['success' => true, 'data' => ['following' => true]]);
}

public function unfollow(Request $request, User $user): JsonResponse
{
    $currentUser = $request->user();

    Follow::where('follower_id', $currentUser->id)
        ->where('following_id', $user->id)
        ->delete();

    return response()->json(['success' => true, 'data' => ['following' => false]]);
}

public function followers(Request $request, User $user): JsonResponse
{
    $followers = Follow::where('following_id', $user->id)
        ->with('follower:id,uuid,name,username,avatar_media_id,reputation_level')
        ->orderByDesc('created_at')
        ->limit(50)
        ->get()
        ->map(fn ($follow) => $follow->follower);

    return response()->json(['success' => true, 'data' => $followers]);
}

public function following(Request $request, User $user): JsonResponse
{
    $following = Follow::where('follower_id', $user->id)
        ->with('following:id,uuid,name,username,avatar_media_id,reputation_level')
        ->orderByDesc('created_at')
        -limit(50)
        ->get()
        ->map(fn ($follow) => $follow->following);

    return response()->json(['success' => true, 'data' => $following]);
}
```

### Frontend Components

#### Update `community-types.ts`
```typescript
export interface UserProfile {
  // ... existing fields
  follower_count: number;
  following_count: number;
  is_following?: boolean;
}
```

#### Update `client.ts`
```typescript
communityFollow: (username: string) =>
  laravelRequest<{ success: boolean; data: { following: boolean } }>(`/users/${username}/follow`, {
    method: 'POST',
  }),

communityUnfollow: (username: string) =>
  laravelRequest<{ success: boolean; data: { following: boolean } }>(`/users/${username}/follow`, {
    method: 'DELETE',
  }),

communityFollowers: (username: string) =>
  laravelRequest<{ success: boolean; data: any[] }>(`/users/${username}/followers`),

communityFollowing: (username: string) =>
  laravelRequest<{ success: boolean; data: any[] }>(`/users/${username}/following`),
```

#### Create `follow-button.tsx`
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { laravel } from '@/lib/api/client';

interface FollowButtonProps {
  username: string;
  initialFollowing?: boolean;
  onFollowChange?: (following: boolean) => void;
}

export function FollowButton({ username, initialFollowing = false, onFollowChange }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      if (isFollowing) {
        await laravel.communityUnfollow(username);
        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        await laravel.communityFollow(username);
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (error) {
      console.error('Follow toggle failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
        isFollowing
          ? "bg-white/5 border border-white/10 text-slate-300 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
          : "bg-[#FF5A1F] text-white hover:brightness-110"
      )}
    >
      {isFollowing ? (
        <>
          <UserMinus className="h-4 w-4" />
          Đang theo dõi
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          Theo dõi
        </>
      )}
    </button>
  );
}
```

### Effort Estimate
- Backend: 3 hours (migration, model, controller, routes)
- Frontend: 4 hours (types, client, component, profile page integration)
- **Total: 7 hours**

---

## Feature 2: Comments (CRITICAL)

### Overview
Allow users to comment on published assets with nested replies.

### User Stories
- As a user, I want to comment on a video so that I can give feedback
- As a user, I want to reply to a comment so that I can have discussions
- As a creator, I want to see comments on my videos so that I can engage with my audience

### Database Schema

#### Migration: `create_comments_table.php`
```php
Schema::create('comments', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('render_job_id')->constrained()->cascadeOnDelete();
    $table->foreignId('parent_id')->nullable()->constrained('comments')->cascadeOnDelete();
    $table->text('content');
    $table->timestamps();
    $table->index('render_job_id');
    $table->index('parent_id');
});
```

### Backend API

#### Model: `Comment.php`
```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Comment extends Model
{
    protected $fillable = ['user_id', 'render_job_id', 'parent_id', 'content'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function renderJob(): BelongsTo
    {
        return $this->belongsTo(RenderJob::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Comment::class, 'parent_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(Comment::class, 'parent_id');
    }
}
```

#### Routes (add to `routes/api.php`)
```php
// Comments (authenticated)
Route::post('/render-jobs/{renderJob:uuid}/comments', [CommentController::class, 'store']);
Route::get('/render-jobs/{renderJob:uuid}/comments', [CommentController::class, 'index']);
Route::delete('/comments/{comment}', [CommentController::class, 'destroy']);
```

#### Create `CommentController.php`
```php
<?php
namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\RenderJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api')->only(['store', 'destroy']);
    }

    public function index(Request $request, RenderJob $renderJob): JsonResponse
    {
        $comments = Comment::where('render_job_id', $renderJob->id)
            ->whereNull('parent_id')
            ->with(['user:id,uuid,name,username,avatar_media_id,reputation_level', 'replies.user:id,uuid,name,username,avatar_media_id,reputation_level'])
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json(['success' => true, 'data' => $comments]);
    }

    public function store(Request $request, RenderJob $renderJob): JsonResponse
    {
        $user = $request->user();

        if ($renderJob->status !== 'completed') {
            return response()->json(['error' => 'Asset chưa hoàn thành'], 422);
        }

        $request->validate([
            'content' => 'required|string|max:1000',
            'parent_id' => 'nullable|exists:comments,id',
        ]);

        $comment = Comment::create([
            'user_id' => $user->id,
            'render_job_id' => $renderJob->id,
            'parent_id' => $request->input('parent_id'),
            'content' => $request->input('content'),
        ]);

        $comment->load('user:id,uuid,name,username,avatar_media_id,reputation_level');

        return response()->json(['success' => true, 'data' => $comment], 201);
    }

    public function destroy(Request $request, Comment $comment): JsonResponse
    {
        $user = $request->user();

        if ($comment->user_id !== $user->id) {
            return response()->json(['error' => 'Không có quyền xóa bình luận này'], 403);
        }

        $comment->delete();

        return response()->json(['success' => true]);
    }
}
```

### Frontend Components

#### Update `community-types.ts`
```typescript
export interface Comment {
  id: number;
  content: string;
  created_at: string;
  user: {
    uuid: string;
    name: string;
    username: string;
    avatar_url: string | null;
    reputation_level: string;
  };
  replies?: Comment[];
}
```

#### Update `client.ts`
```typescript
communityComments: (uuid: string) =>
  laravelRequest<{ success: boolean; data: any[] }>(`/render-jobs/${uuid}/comments`),

communityAddComment: (uuid: string, content: string, parentId?: number) =>
  laravelRequest<{ success: boolean; data: any }>(`/render-jobs/${uuid}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content, parent_id: parentId }),
  }),

communityDeleteComment: (commentId: number) =>
  laravelRequest<{ success: boolean }>(`/comments/${commentId}`, {
    method: 'DELETE',
  }),
```

#### Create `comment-section.tsx`
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { laravel } from '@/lib/api/client';
import { Comment } from '@/lib/api/community-types';
import { CreatorLevelBadge } from './creator-level-badge';

interface CommentSectionProps {
  assetUuid: string;
  isOpen: boolean;
}

export function CommentSection({ assetUuid, isOpen }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, assetUuid]);

  const loadComments = async () => {
    try {
      const result = await laravel.communityComments(assetUuid);
      setComments(result.data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setIsLoading(true);
    try {
      await laravel.communityAddComment(assetUuid, newComment, replyTo);
      setNewComment('');
      setReplyTo(null);
      await loadComments();
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    try {
      await laravel.communityDeleteComment(commentId);
      await loadComments();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="border-t border-white/[0.04] pt-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="h-4 w-4 text-[#FF5A1F]" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Bình luận ({comments.length})
        </span>
      </div>

      {/* Comment input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={replyTo ? "Viết phản hồi..." : "Viết bình luận..."}
          className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5A1F]/30"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || !newComment.trim()}
          className="h-10 w-10 rounded-xl bg-[#FF5A1F] text-white flex items-center justify-center hover:brightness-110 disabled:opacity-50 cursor-pointer"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* Comments list */}
      <div className="space-y-4 max-h-[300px] overflow-y-auto">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReply={setReplyTo}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}

function CommentItem({ comment, onReply, onDelete }: {
  comment: Comment;
  onReply: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="flex gap-3">
      <img
        src={comment.user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop'}
        alt={comment.user.username}
        className="h-8 w-8 rounded-full object-cover border border-white/10 shrink-0"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-white">@{comment.user.username}</span>
          <CreatorLevelBadge level={comment.user.reputation_level} className="text-[8px] px-1.5 py-0" />
          <span className="text-[10px] text-slate-500">
            {new Date(comment.created_at).toLocaleDateString('vi-VN')}
          </span>
        </div>
        <p className="text-sm text-slate-300 mb-2">{comment.content}</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onReply(comment.id)}
            className="text-[10px] text-slate-500 hover:text-[#FF5A1F] uppercase tracking-wider"
          >
            Phản hồi
          </button>
          <button
            onClick={() => onDelete(comment.id)}
            className="text-[10px] text-slate-500 hover:text-red-400 uppercase tracking-wider"
          >
            Xóa
          </button>
        </div>

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 pl-4 border-l border-white/[0.04] space-y-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onReply={onReply}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Effort Estimate
- Backend: 4 hours (migration, model, controller, routes)
- Frontend: 5 hours (types, client, component, remix modal integration)
- **Total: 9 hours**

---

## Feature 3: Notifications (MEDIUM)

### Overview
Notify users when someone likes their content, comments, or follows them.

### User Stories
- As a creator, I want to be notified when someone likes my video
- As a creator, I want to be notified when someone comments on my video
- As a user, I want to be notified when someone follows me
- As a user, I want to see unread notification count in the header

### Database Schema

**No new tables needed** — uses existing `notifications` and `notification_user` tables.

### Backend API

#### Create `UserNotificationService.php`
```php
<?php
namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use App\Models\RenderJob;
use App\Models\Comment;
use App\Models\Follow;

class UserNotificationService
{
    public function notifyLike(User $actor, RenderJob $job): void
    {
        if ($actor->id === $job->user_id) return; // Don't notify self

        $notification = Notification::create([
            'title' => 'Lượt thích mới',
            'body' => "{$actor->name} đã thích tác phẩm của bạn",
            'type' => 'success',
            'audience' => 'specific',
            'status' => 'sent',
            'sent_at' => now(),
        ]);

        $notification->users()->attach($job->user_id, [
            'read' => false,
        ]);
    }

    public function notifyComment(User $actor, Comment $comment): void
    {
        $job = $comment->renderJob;
        if ($actor->id === $job->user_id) return;

        $notification = Notification::create([
            'title' => 'Bình luận mới',
            'body' => "{$actor->name} đã bình luận về tác phẩm của bạn",
            'type' => 'info',
            'audience' => 'specific',
            'status' => 'sent',
            'sent_at' => now(),
        ]);

        $notification->users()->attach($job->user_id, [
            'read' => false,
        ]);
    }

    public function notifyFollow(User $actor, User $target): void
    {
        if ($actor->id === $target->id) return;

        $notification = Notification::create([
            'title' => 'Follower mới',
            'body' => "{$actor->name} đã theo dõi bạn",
            'type' => 'info',
            'audience' => 'specific',
            'status' => 'sent',
            'sent_at' => now(),
        ]);

        $notification->users()->attach($target->id, [
            'read' => false,
        ]);
    }
}
```

#### Update `CommunityController.php`
Add notification triggers to `like()`, and `CommentController::store()`.

### Frontend Components

#### Update `client.ts`
```typescript
// Notifications are already implemented in client.ts
// Just need to ensure notification bell is in header
```

#### Create `notification-bell.tsx`
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { laravel } from '@/lib/api/client';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const result = await laravel.notificationsUnreadCount();
      setUnreadCount(result.data.unread_count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const result = await laravel.notifications();
      setNotifications(result.data.items);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      loadNotifications();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative h-10 w-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#FF5A1F] text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-zinc-950 border border-white/[0.08] rounded-2xl shadow-2xl z-50">
          <div className="p-4 border-b border-white/[0.04]">
            <h3 className="text-sm font-bold text-white">Thông báo</h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                Chưa có thông báo
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.uuid}
                  className={cn(
                    "p-4 border-b border-white/[0.02] hover:bg-white/[0.02]",
                    !notification.read && "bg-[#FF5A1F]/[0.02]"
                  )}
                >
                  <p className="text-sm font-bold text-white">{notification.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{notification.body}</p>
                  <p className="text-[10px] text-slate-500 mt-2">
                    {new Date(notification.created_at).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Effort Estimate
- Backend: 3 hours (service, triggers in controllers)
- Frontend: 3 hours (bell component, header integration)
- **Total: 6 hours**

---

## Feature 4: Report Content (MEDIUM)

### Overview
Allow users to report inappropriate content for admin moderation.

### User Stories
- As a user, I want to report a video so that inappropriate content is reviewed
- As an admin, I want to see reported content so that I can take action

### Database Schema

#### Migration: `create_reports_table.php`
```php
Schema::create('reports', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('render_job_id')->constrained()->cascadeOnDelete();
    $table->string('reason'); // spam, inappropriate, copyright, other
    $table->text('details')->nullable();
    $table->string('status')->default('pending'); // pending, reviewed, resolved, dismissed
    $table->timestamp('reviewed_at')->nullable();
    $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
    $table->unique(['user_id', 'render_job_id']); // One report per user per job
    $table->index('status');
});
```

### Backend API

#### Model: `Report.php`
```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Report extends Model
{
    protected $fillable = [
        'user_id', 'render_job_id', 'reason', 'details',
        'status', 'reviewed_at', 'reviewed_by',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function renderJob(): BelongsTo
    {
        return $this->belongsTo(RenderJob::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
```

#### Routes (add to `routes/api.php`)
```php
Route::post('/render-jobs/{renderJob:uuid}/report', [ReportController::class, 'store']);
```

#### Create `ReportController.php`
```php
<?php
namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\RenderJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function store(Request $request, RenderJob $renderJob): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'reason' => 'required|in:spam,inappropriate,copyright,other',
            'details' => 'nullable|string|max:500',
        ]);

        $existing = Report::where('user_id', $user->id)
            ->where('render_job_id', $renderJob->id)
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Bạn đã báo cáo tác phẩm này rồi'], 409);
        }

        Report::create([
            'user_id' => $user->id,
            'render_job_id' => $renderJob->id,
            'reason' => $request->input('reason'),
            'details' => $request->input('details'),
        ]);

        return response()->json(['success' => true, 'message' => 'Đã gửi báo cáo thành công']);
    }
}
```

### Frontend Components

#### Update `client.ts`
```typescript
communityReport: (uuid: string, reason: string, details?: string) =>
  laravelRequest<{ success: boolean; message: string }>(`/render-jobs/${uuid}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason, details }),
  }),
```

#### Create `report-modal.tsx`
```typescript
'use client';

import React, { useState } from 'react';
import { X, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { laravel } from '@/lib/api/client';

interface ReportModalProps {
  assetUuid: string;
  isOpen: boolean;
  onClose: () => void;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Nội dung không phù hợp' },
  { value: 'copyright', label: 'Vi phạm bản quyền' },
  { value: 'other', label: 'Lý do khác' },
];

export function ReportModal({ assetUuid, isOpen, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;

    setIsLoading(true);
    try {
      await laravel.communityReport(assetUuid, reason, details);
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setReason('');
        setDetails('');
      }, 2000);
    } catch (error) {
      console.error('Failed to report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md bg-zinc-950 border border-white/[0.08] rounded-2xl p-6"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {isSuccess ? (
          <div className="text-center py-8">
            <Flag className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Gửi báo cáo thành công</h3>
            <p className="text-sm text-slate-400">Cảm ơn bạn đã giúp cộng đồng an toàn hơn</p>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-white mb-4">Báo cáo tác phẩm</h3>

            <div className="space-y-2 mb-4">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    reason === r.value
                      ? "border-[#FF5A1F]/30 bg-[#FF5A1F]/[0.02]"
                      : "border-white/[0.04] hover:border-white/[0.08]"
                  )}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-sm text-slate-300">{r.label}</span>
                </label>
              ))}
            </div>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Chi tiết (tùy chọn)"
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5A1F]/30 mb-4 resize-none"
              rows={3}
            />

            <button
              onClick={handleSubmit}
              disabled={isLoading || !reason}
              className="w-full h-12 rounded-xl bg-[#FF5A1F] text-white font-bold text-sm hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Đang gửi...' : 'Gửi báo cáo'}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
```

### Effort Estimate
- Backend: 3 hours (migration, model, controller, routes)
- Frontend: 3 hours (types, client, modal component)
- **Total: 6 hours**

---

## Feature 5: Social Share (LOW)

### Overview
Enable direct sharing to Facebook, Twitter, TikTok.

### User Stories
- As a user, I want to share a video directly to social media
- As a user, I want to copy a shareable link

### Backend API
**No backend changes needed** — client-side only.

### Frontend Components

#### Update `remix-modal.tsx`
Replace the `handleShare` function:

```typescript
const handleShare = (platform: 'copy' | 'facebook' | 'twitter' | 'tiktok') => {
  const shareUrl = `${window.location.origin}/community?asset=${asset.uuid}`;
  const shareText = `Check out this AI-generated video: ${asset.title}`;

  switch (platform) {
    case 'copy':
      navigator.clipboard.writeText(shareUrl);
      alert('Đã copy liên kết chia sẻ!');
      break;
    case 'facebook':
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
      break;
    case 'twitter':
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
      break;
    case 'tiktok':
      // TikTok doesn't have a direct share URL API
      // Copy link and show instructions
      navigator.clipboard.writeText(shareUrl);
      alert('Đã copy liên kết. Mở TikTok và dán vào caption!');
      break;
  }
};
```

#### Create `share-buttons.tsx`
```typescript
'use client';

import React from 'react';
import { Copy, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShareButtonsProps {
  url: string;
  title: string;
}

export function ShareButtons({ url, title }: ShareButtonsProps) {
  const shareText = `Check out this AI-generated video: ${title}`;

  const handleShare = (platform: string) => {
    switch (platform) {
      case 'copy':
        navigator.clipboard.writeText(url);
        alert('Đã copy liên kết!');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`, '_blank');
        break;
      case 'tiktok':
        navigator.clipboard.writeText(url);
        alert('Đã copy liên kết. Mở TikTok và dán vào caption!');
        break;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleShare('copy')}
        className="h-9 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
      >
        <Copy className="h-3.5 w-3.5" />
        Copy
      </button>
      <button
        onClick={() => handleShare('facebook')}
        className="h-9 px-3 rounded-lg bg-[#1877F2]/10 border border-[#1877F2]/20 text-[#1877F2] hover:bg-[#1877F2]/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
      >
        Facebook
      </button>
      <button
        onClick={() => handleShare('twitter')}
        className="h-9 px-3 rounded-lg bg-[#1DA1F2]/10 border border-[#1DA1F2]/20 text-[#1DA1F2] hover:bg-[#1DA1F2]/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
      >
        Twitter
      </button>
    </div>
  );
}
```

### Effort Estimate
- Backend: 0 hours
- Frontend: 2 hours (share buttons, modal integration)
- **Total: 2 hours**

---

## Feature 6: Search by Creator (LOW)

### Overview
Allow users to search for creators by name or username.

### User Stories
- As a user, I want to search for creators so that I can find specific people
- As a user, I want to see creator results alongside video results

### Backend API

#### Update `CommunityController::assets()` method
```php
// Search (update existing search to include creator)
if ($request->filled('q')) {
    $search = $request->input('q');
    $query->where(function ($q) use ($search) {
        $q->where('prompt', 'like', "%{$search}%")
          ->orWhere('title', 'like', "%{$search}%")
          ->orWhereHas('user', function ($uq) use ($search) {
              $uq->where('name', 'like', "%{$search}%")
                 ->orWhere('username', 'like', "%{$search}%");
          });
    });
}
```

#### Add Creator Search Endpoint
```php
Route::get('/v1/creators/search', [CommunityController::class, 'searchCreators']);
```

```php
public function searchCreators(Request $request): JsonResponse
{
    $request->validate(['q' => 'required|string|min:2']);

    $search = $request->input('q');

    $creators = User::where(function ($q) use ($search) {
        $q->where('name', 'like', "%{$search}%")
          ->orWhere('username', 'like', "%{$search}%");
    })
    ->whereHas('renderJobs', function ($q) {
        $q->whereIn('visibility', ['sharing', 'public']);
    })
    ->withCount('renderJobs as published_count')
    ->orderByDesc('reputation_score')
    ->limit(20)
    ->get()
    ->map(fn ($user) => [
        'uuid' => $user->uuid,
        'name' => $user->name,
        'username' => $user->username,
        'avatar_url' => $user->avatar,
        'reputation_level' => $user->reputation_level,
        'published_count' => $user->published_count,
    ]);

    return response()->json(['success' => true, 'data' => $creators]);
}
```

### Frontend Components

#### Update `client.ts`
```typescript
communitySearchCreators: (q: string) =>
  laravelRequest<{ success: boolean; data: any[] }>(`/v1/creators/search?q=${encodeURIComponent(q)}`),
```

#### Update Search Component
Add creator search results tab in the community search UI.

### Effort Estimate
- Backend: 2 hours (search update, new endpoint)
- Frontend: 2 hours (types, client, search UI update)
- **Total: 4 hours**

---

## Implementation Order & Dependencies

```
Week 1: Follow/Unfollow (7h) + Comments (9h) = 16h
Week 2: Notifications (6h) + Report Content (6h) = 12h
Week 3: Social Share (2h) + Search by Creator (4h) = 6h
```

**Total Estimated Effort: 34 hours (~4-5 days)**

---

## Testing Strategy

### Backend Tests
1. **Follow/Unfollow Tests**
   - `FollowTest.php`: Follow, unfollow, duplicate follow, self-follow
   - `FollowersTest.php`: Get followers, get following

2. **Comments Tests**
   - `CommentTest.php`: Create comment, reply, delete, permissions
   - `CommentValidationTest.php`: Max length, required fields

3. **Notifications Tests**
   - `NotificationTest.php`: Like notification, comment notification, follow notification
   - `NotificationReadTest.php`: Mark as read, mark all as read

4. **Reports Tests**
   - `ReportTest.php`: Create report, duplicate report, reasons validation

### Frontend Tests
1. **FollowButton.test.tsx**: Toggle state, API calls
2. **CommentSection.test.tsx**: Load comments, add comment, reply
3. **NotificationBell.test.tsx**: Unread count, load notifications
4. **ReportModal.test.tsx**: Submit report, validation
5. **ShareButtons.test.tsx**: Platform URLs, copy to clipboard

### Integration Tests
1. **Follow Flow**: Follow creator → see their content in feed
2. **Comment Flow**: Comment on video → creator gets notification
3. **Report Flow**: Report content → admin sees in moderation queue

---

## Task Breakdown (Verifiable Tasks)

| # | Task | Est. | Acceptance Criteria |
|---|------|------|---------------------|
| 1.1 | Create `follows` migration | 0.5h | Migration runs without error |
| 1.2 | Create `Follow` model | 0.5h | Model has correct relationships |
| 1.3 | Add follow/unfollow routes | 0.5h | Routes registered in api.php |
| 1.4 | Implement follow/unfollow in CommunityController | 1h | Follow/unfollow works, duplicate prevented |
| 1.5 | Add followers/following endpoints | 0.5h | Returns user lists |
| 1.6 | Update User model with follow relationships | 0.5h | `followers()` and `following()` work |
| 1.7 | Update frontend types | 0.5h | Types match API response |
| 1.8 | Add frontend API methods | 0.5h | Methods call correct endpoints |
| 1.9 | Create FollowButton component | 1h | Button toggles, shows loading state |
| 1.10 | Integrate FollowButton in profile page | 1h | Button shows on creator profiles |
| 2.1 | Create `comments` migration | 0.5h | Migration runs without error |
| 2.2 | Create `Comment` model | 0.5h | Model has correct relationships |
| 2.3 | Create CommentController | 1h | CRUD operations work |
| 2.4 | Add comment routes | 0.5h | Routes registered in api.php |
| 2.5 | Update frontend types | 0.5h | Types match API response |
| 2.6 | Add frontend API methods | 0.5h | Methods call correct endpoints |
| 2.7 | Create CommentSection component | 1.5h | Load, add, reply, delete work |
| 2.8 | Integrate CommentSection in RemixModal | 1h | Comments show in detail view |
| 3.1 | Create UserNotificationService | 1h | Service creates notifications |
| 3.2 | Add like notification trigger | 0.5h | Like creates notification |
| 3.3 | Add comment notification trigger | 0.5h | Comment creates notification |
| 3.4 | Add follow notification trigger | 0.5h | Follow creates notification |
| 3.5 | Create NotificationBell component | 1.5h | Shows count, loads notifications |
| 3.6 | Integrate NotificationBell in header | 0.5h | Bell shows in navigation |
| 4.1 | Create `reports` migration | 0.5h | Migration runs without error |
| 4.2 | Create `Report` model | 0.5h | Model has correct relationships |
| 4.3 | Create ReportController | 1h | Create report, prevent duplicates |
| 4.4 | Add report route | 0.5h | Route registered in api.php |
| 4.5 | Update frontend types | 0.5h | Types match API response |
| 4.6 | Add frontend API methods | 0.5h | Methods call correct endpoints |
| 4.7 | Create ReportModal component | 1.5h | Form works, shows success |
| 5.1 | Create ShareButtons component | 1h | All platforms work |
| 5.2 | Integrate ShareButtons in RemixModal | 1h | Replace old share button |
| 6.1 | Update community search to include creators | 1h | Search returns creator results |
| 6.2 | Add creator search endpoint | 0.5h | Endpoint returns creators |
| 6.3 | Update frontend search UI | 1.5h | Creator tab shows in search |
| 7.1 | Write backend tests for Follow | 1h | Tests pass |
| 7.2 | Write backend tests for Comments | 1h | Tests pass |
| 7.3 | Write backend tests for Notifications | 1h | Tests pass |
| 7.4 | Write backend tests for Reports | 1h | Tests pass |
| 7.5 | Write frontend tests | 2h | Tests pass |
| 7.6 | Integration testing | 2h | All flows work end-to-end |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Notification spam | Medium | Rate limit notifications per user per hour |
| Comment toxicity | Medium | Add profanity filter in future iteration |
| Report abuse | Low | One report per user per content |
| Performance (followers list) | Low | Limit to 50, add pagination later |
| Real-time notifications | Medium | Use polling now, add WebSocket later |

---

## Future Enhancements (Not in Scope)

1. **Real-time notifications** via WebSocket (Laravel Reverb)
2. **Comment moderation** (profanity filter, AI detection)
3. **Follow feed** (see posts from followed creators)
4. **Push notifications** (browser/mobile)
5. **Notification preferences** (what to be notified about)
6. **Report admin panel** (view/manage reports in Filament)

---

## Appendix: Database Schema Summary

### New Tables
| Table | Purpose |
|-------|---------|
| `follows` | User follow relationships |
| `comments` | Comments on published assets |
| `reports` | Content reports for moderation |

### Modified Tables
| Table | Changes |
|-------|---------|
| `users` | Add `followers_count`, `following_count` (computed, not stored) |
| `render_jobs` | Add `comments_count` (computed via relationship) |

### Existing Tables Used
| Table | Purpose |
|-------|---------|
| `notifications` | User notifications (already exists) |
| `notification_user` | Notification read status (already exists) |

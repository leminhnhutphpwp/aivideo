<?php
namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Follow;
use App\Models\Like;
use App\Models\RenderJob;
use App\Models\Tag;
use App\Models\User;
use App\Services\ContentFilterService;
use App\Services\DaemonClient;
use App\Services\UserNotificationService;
use App\Settings\CommunitySettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CommunityController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api')->only([
            'publish', 'unpublish', 'like', 'likes', 'useAsset',
            'follow', 'unfollow',
        ]);
    }

    // ─── Publish / Unpublish ──────────────────────────────────────

    public function publish(Request $request, RenderJob $renderJob): JsonResponse
    {
        $user = $request->user();

        if ($user->id !== $renderJob->user_id) {
            return response()->json(['error' => 'Không có quyền publish asset này'], 403);
        }

        if ($renderJob->status !== 'completed') {
            return response()->json(['error' => 'Asset chưa hoàn thành, không thể publish'], 422);
        }

        if ($renderJob->isPublished()) {
            return response()->json(['error' => 'Asset đã được đăng lên cộng đồng'], 422);
        }

        if (!$user->isPro()) {
            return response()->json(['error' => 'Tính năng dành cho gói Pro trở lên'], 403);
        }

        // Check daily publish limit
        $settings = app(CommunitySettings::class);
        $planSlug = $user->plan?->slug ?? 'free';
        $limit = $planSlug === 'studio' ? $settings->studio_publish_limit : $settings->pro_publish_limit;

        $startOfDay = now()->startOfDay()->utc();
        $endOfDay = now()->endOfDay()->utc();

        $todayCount = RenderJob::where('user_id', $user->id)
            ->whereBetween('published_at', [$startOfDay, $endOfDay])
            ->count();

        if ($todayCount >= $limit) {
            return response()->json([
                'error' => "Đã đạt giới hạn {$limit} lượt publish hôm nay",
            ], 429);
        }

        $request->validate([
            'visibility' => 'required|in:sharing,public',
            'tags' => 'nullable|array|max:5',
            'tags.*' => 'string|max:30',
        ]);

        // Moderation gate before anything reaches the public feed. Covers the asset's own
        // prompt/title (defense in depth) plus the user-supplied tags at publish time.
        $moderationText = trim(
            (string) $renderJob->title . ' '
            . (string) $renderJob->prompt . ' '
            . implode(' ', (array) $request->input('tags', []))
        );

        $contentFilter = app(ContentFilterService::class);
        if ($moderationText !== '' && $contentFilter->containsProhibitedContent($moderationText)) {
            Log::warning('Publish blocked by content filter', [
                'user_id' => $user->id,
                'render_job_id' => $renderJob->id,
                'term' => $contentFilter->getProhibitedTerm($moderationText),
            ]);

            return response()->json([
                'error' => 'unsafe_content',
                'message' => 'Nội dung không phù hợp với tiêu chuẩn cộng đồng, không thể đăng lên. Vui lòng chỉnh sửa.',
            ], 422);
        }

        // Output-side image moderation — defense layer for the public feed. Only images are
        // checked here; video moderation is a separate concern. A hard `safe:false` blocks the
        // publish. A `degraded:true` verdict (vision model unavailable/errored, or an unfetchable
        // image) no longer silently passes as safe — it holds the asset for manual review.
        $isDegraded = false;
        if (config('services.daemon.image_moderation_enabled', true) && $this->isImageAsset($renderJob)) {
            $imageUrl = $this->daemonFetchableImageUrl($renderJob);

            if ($imageUrl !== null) {
                $verdict = app(DaemonClient::class)->moderateImage($imageUrl);

                if (($verdict['safe'] ?? true) === false) {
                    Log::warning('Publish blocked by image moderation', [
                        'user_id' => $user->id,
                        'render_job_id' => $renderJob->id,
                        'reason' => $verdict['reason'] ?? null,
                    ]);

                    return response()->json([
                        'error' => 'unsafe_image',
                        'message' => 'Nội dung hình ảnh không phù hợp để đăng công khai.',
                    ], 422);
                }

                $isDegraded = ($verdict['degraded'] ?? false) === true;
                if ($isDegraded) {
                    Log::warning('Publish held for manual review — degraded image moderation', [
                        'user_id' => $user->id,
                        'render_job_id' => $renderJob->id,
                    ]);
                }
            }
        }

        $moderationStatus = $isDegraded
            ? RenderJob::MODERATION_PENDING
            : RenderJob::MODERATION_APPROVED;

        $renderJob->publish(
            $request->input('visibility'),
            $request->input('tags', []),
            $moderationStatus
        );

        // Learning loop: attribute this publish to the skill the asset was made with.
        // Held (pending-review) assets are not attributed until an admin approves them.
        if ($moderationStatus === RenderJob::MODERATION_APPROVED) {
            app(\App\Services\SkillStatsService::class)->recordPublish($renderJob->skill_id);
        }

        return response()->json([
            'success' => true,
            'pending_review' => $isDegraded,
            'message' => $isDegraded
                ? 'Nội dung đã được gửi và đang chờ kiểm duyệt trước khi hiển thị công khai.'
                : null,
            'data' => [
                'uuid' => $renderJob->uuid,
                'visibility' => $renderJob->visibility,
                'moderation_status' => $renderJob->moderation_status,
                'creator_payout' => $renderJob->creator_payout,
                'published_at' => $renderJob->published_at,
            ],
        ]);
    }

    public function unpublish(Request $request, RenderJob $renderJob): JsonResponse
    {
        $user = $request->user();

        if ($user->id !== $renderJob->user_id) {
            return response()->json(['error' => 'Không có quyền'], 403);
        }

        $renderJob->unpublish();

        return response()->json(['success' => true]);
    }

    // ─── Like / Unlike ────────────────────────────────────────────

    public function like(Request $request, RenderJob $renderJob): JsonResponse
    {
        $user = $request->user();

        // Chỉ cho phép tương tác với asset đã đăng lên cộng đồng (tránh lộ asset private theo UUID).
        if (! $renderJob->isPublished()) {
            abort(404);
        }

        if ($renderJob->status !== 'completed') {
            return response()->json(['error' => 'Asset chưa hoàn thành'], 422);
        }

        $existing = Like::where('user_id', $user->id)
            ->where('render_job_id', $renderJob->id)
            ->first();

        if ($existing) {
            $existing->delete();
            $liked = false;
        } else {
            Like::create([
                'user_id' => $user->id,
                'render_job_id' => $renderJob->id,
            ]);
            $liked = true;

            // Send notification to asset owner
            app(UserNotificationService::class)->notifyLike($user, $renderJob);
        }

        // Learning loop: roll the like/unlike up to the skill this asset was made with.
        app(\App\Services\SkillStatsService::class)->recordLike($renderJob->skill_id, $liked ? 1 : -1);

        $count = Like::where('render_job_id', $renderJob->id)->count();

        return response()->json([
            'success' => true,
            'data' => ['liked' => $liked, 'count' => $count],
        ]);
    }

    public function likes(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = RenderJob::select('render_jobs.*')
            ->join('likes', 'likes.render_job_id', '=', 'render_jobs.id')
            ->where('likes.user_id', $user->id)
            ->where('status', 'completed')
            ->with(['user:id,uuid,name,username,avatar_media_id,reputation_level', 'assets:id,uuid,render_job_id,type,path'])
            ->withCount(['likes', 'comments'])
            ->orderByDesc('likes.created_at');

        $paginated = $this->cleanPaginate($request, $query);

        $refAssetMap = $this->buildReferenceAssetMap($paginated['items']);
        $paginated['items'] = collect($paginated['items'])->map(function ($job) use ($refAssetMap) {
            return $this->formatAssetCard($job, $refAssetMap);
        })->toArray();

        return response()->json(['success' => true, 'data' => $paginated]);
    }

    // ─── Community Feed ───────────────────────────────────────────

    public function assets(Request $request): JsonResponse
    {
        $query = RenderJob::published()
            ->with(['user:id,uuid,name,username,avatar_media_id,reputation_level', 'assets:id,uuid,render_job_id,type,path'])
            ->withCount(['likes', 'comments']);

        // Detect current user from JWT token (optional — public endpoint)
        $currentUser = null;
        try {
            $currentUser = auth('api')->user();
        } catch (\Throwable) {}

        // Search
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

        // Filter by capability
        if ($request->filled('capability')) {
            $query->where('capability', $request->input('capability'));
        }

        // Filter by tag
        if ($request->filled('tag')) {
            $tag = $request->input('tag');
            $query->whereJsonContains('tags', $tag);
        }

        // Sort
        $sort = $request->input('sort', 'latest');
        match ($sort) {
            'popular' => $query->withCount('likes')->orderByDesc('likes_count'),
            'trending' => $query->orderByDesc('usage_count'),
            default => $query->orderByDesc('published_at'),
        };

        $paginated = $this->cleanPaginate($request, $query);

        // Preload liked status for current user
        $likedIds = [];
        if ($currentUser) {
            $jobIds = collect($paginated['items'])->pluck('id')->toArray();
            $likedIds = Like::where('user_id', $currentUser->id)
                ->whereIn('render_job_id', $jobIds)
                ->pluck('render_job_id')
                ->toArray();
        }

        $refAssetMap = $this->buildReferenceAssetMap($paginated['items']);
        $paginated['items'] = collect($paginated['items'])->map(function ($job) use ($likedIds, $refAssetMap) {
            $card = $this->formatAssetCard($job, $refAssetMap);
            $card['liked_by_me'] = in_array($job->id, $likedIds);
            return $card;
        })->toArray();

        return response()->json(['success' => true, 'data' => $paginated]);
    }

    // ─── User Profile (public) ────────────────────────────────────

    public function userProfile(Request $request, $username): JsonResponse
    {
        $user = User::where('username', $username)->first();

        if (!$user) {
            return response()->json(['error' => 'Không tìm thấy người dùng'], 404);
        }

        $publishedCount = RenderJob::where('user_id', $user->id)->published()->count();
        $likesReceived = Like::whereIn('render_job_id', function ($q) use ($user) {
            $q->select('id')->from('render_jobs')->where('user_id', $user->id);
        })->count();

        $followerCount = Follow::where('following_id', $user->id)->count();
        $followingCount = Follow::where('follower_id', $user->id)->count();

        $isFollowing = false;
        $currentUser = null;
        try {
            $currentUser = auth('api')->user();
        } catch (\Throwable) {}

        if ($currentUser && $currentUser->id !== $user->id) {
            $isFollowing = Follow::where('follower_id', $currentUser->id)
                ->where('following_id', $user->id)
                ->exists();
        }

        return response()->json(['success' => true, 'data' => [
            'uuid' => $user->uuid,
            'name' => $user->name,
            'username' => $user->username,
            'avatar_url' => $user->avatar,
            'reputation_level' => $user->reputation_level,
            'reputation_score' => $user->reputation_score,
            'stats' => [
                'published_count' => $publishedCount,
                'likes_received' => $likesReceived,
                'follower_count' => $followerCount,
                'following_count' => $followingCount,
            ],
            'is_following' => $isFollowing,
            'created_at' => $user->created_at,
        ]]);
    }

    public function userAssets(Request $request, $username): JsonResponse
    {
        $user = User::where('username', $username)->first();

        if (!$user) {
            return response()->json(['error' => 'Không tìm thấy người dùng'], 404);
        }

        $query = RenderJob::where('user_id', $user->id)
            ->published()
            ->with(['user:id,uuid,name,username,avatar_media_id,reputation_level', 'assets:id,uuid,render_job_id,type,path'])
            ->withCount(['likes', 'comments'])
            ->orderByDesc('published_at');

        $paginated = $this->cleanPaginate($request, $query);

        $refAssetMap = $this->buildReferenceAssetMap($paginated['items']);
        $paginated['items'] = collect($paginated['items'])->map(function ($job) use ($refAssetMap) {
            return $this->formatAssetCard($job, $refAssetMap);
        })->toArray();

        return response()->json(['success' => true, 'data' => $paginated]);
    }

    // ─── Trending ─────────────────────────────────────────────────

    public function trending(Request $request): JsonResponse
    {
        $period = $request->input('period', 'day');
        $settings = app(CommunitySettings::class);

        $cacheKey = "trending:assets:{$period}";
        $trending = Cache::remember($cacheKey, 900, function () use ($settings, $period) {
            $since = match ($period) {
                'week' => now()->subDays(7),
                'month' => now()->subDays(30),
                default => now()->subDay(),
            };

            $jobs = RenderJob::published()
                ->where('published_at', '>=', $since)
                ->withCount(['likes', 'comments'])
                ->with(['user:id,uuid,name,username,avatar_media_id,reputation_level', 'assets:id,uuid,render_job_id,type,path'])
                ->take($settings->trending_limit * 3)
                ->get()
                ->map(function ($job) use ($settings) {
                    $score = ($job->likes_count * $settings->like_weight)
                        + ($job->usage_count * $settings->view_weight);
                    $job->trending_score = $score;
                    return $job;
                })
                ->sortByDesc('trending_score')
                ->take($settings->trending_limit)
                ->values();

            $refAssetMap = $this->buildReferenceAssetMap($jobs);
            return $jobs->map(fn ($job) => $this->formatAssetCard($job, $refAssetMap));
        });

        return response()->json(['success' => true, 'data' => $trending]);
    }

    public function trendingCreators(Request $request): JsonResponse
    {
        $period = $request->input('period', 'day');
        $settings = app(CommunitySettings::class);

        $cacheKey = "trending:creators:{$period}";
        $creators = Cache::remember($cacheKey, 900, function () use ($settings, $period) {
            $since = match ($period) {
                'week' => now()->subDays(7),
                'month' => now()->subDays(30),
                default => now()->subDay(),
            };

            return User::whereHas('renderJobs', function ($q) use ($since) {
                $q->whereIn('visibility', ['sharing', 'public'])
                  ->where('published_at', '>=', $since);
            })
            ->withCount(['renderJobs as published_count' => function ($q) use ($since) {
                $q->whereIn('visibility', ['sharing', 'public'])
                  ->where('published_at', '>=', $since);
            }])
            ->orderByDesc('published_count')
            ->orderByDesc('reputation_score')
            ->take($settings->top_creators_limit)
            ->get()
            ->map(function ($user) {
                return [
                    'uuid' => $user->uuid,
                    'name' => $user->name,
                    'username' => $user->username,
                    'avatar_url' => $user->avatar,
                    'reputation_level' => $user->reputation_level,
                    'published_count' => $user->published_count,
                ];
            });
        });

        return response()->json(['success' => true, 'data' => $creators]);
    }

    // ─── Use Asset ────────────────────────────────────────────────

    public function useAsset(Request $request, RenderJob $renderJob): JsonResponse
    {
        $user = $request->user();

        // Chỉ cho phép tương tác với asset đã đăng lên cộng đồng (tránh lộ asset private theo UUID).
        if (! $renderJob->isPublished()) {
            abort(404);
        }

        if ($renderJob->status !== 'completed') {
            return response()->json(['error' => 'Asset chưa hoàn thành'], 422);
        }

        // Không tính usage khi tự dùng asset của mình
        if ($user->id !== $renderJob->user_id) {
            // Debounce 30s per IP to prevent spam
            $ip = $request->ip();
            $cacheKey = "asset_use:{$renderJob->id}:{$ip}";
            if (!Cache::has($cacheKey)) {
                $renderJob->increment('usage_count');
                Cache::put($cacheKey, true, 30);
            }
        }

        return response()->json(['success' => true]);
    }

    // ─── Follow / Unfollow ──────────────────────────────────────

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

        // Send notification to followed user
        app(UserNotificationService::class)->notifyFollow($currentUser, $user);

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
            ->limit(50)
            ->get()
            ->map(fn ($follow) => $follow->following);

        return response()->json(['success' => true, 'data' => $following]);
    }

    // ─── Search Creators ──────────────────────────────────────────

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

    // ─── Tags ─────────────────────────────────────────────────────

    public function tags(Request $request): JsonResponse
    {
        $query = Tag::orderByDesc('usage_count');

        if ($request->filled('q')) {
            $search = $request->input('q');
            $query->where(function ($q) use ($search) {
                $q->where('slug', 'like', "%{$search}%")
                  ->orWhere('label_vi', 'like', "%{$search}%");
            });
        }

        return response()->json(['success' => true, 'data' => $query->limit(50)->get()]);
    }

    public function tagAssets(Request $request, $slug): JsonResponse
    {
        $tag = Tag::where('slug', $slug)->first();
        if (!$tag) {
            return response()->json(['error' => 'Tag không tồn tại'], 404);
        }

        $query = RenderJob::published()
            ->whereJsonContains('tags', $tag->label_vi)
            ->with(['user:id,uuid,name,username,avatar_media_id,reputation_level', 'assets:id,uuid,render_job_id,type,path'])
            ->withCount(['likes', 'comments'])
            ->orderByDesc('published_at');

        $paginated = $this->cleanPaginate($request, $query);

        $refAssetMap = $this->buildReferenceAssetMap($paginated['items']);
        $paginated['items'] = collect($paginated['items'])->map(function ($job) use ($refAssetMap) {
            return $this->formatAssetCard($job, $refAssetMap);
        })->toArray();

        return response()->json(['success' => true, 'data' => $paginated]);
    }

    // ─── Helpers ──────────────────────────────────────────────────

    /**
     * Whether this render job produced an image output (so it should go through
     * image moderation). Mirrors the asset-type resolution in formatAssetCard().
     */
    protected function isImageAsset(RenderJob $job): bool
    {
        $asset = $job->assets->first();
        if ($asset && $asset->type === 'image') {
            return true;
        }
        if (str_starts_with($job->capability ?? '', 't2i')) {
            return true;
        }
        return in_array($job->video_type ?? '', ['image_generation', 'image_editing', 't2i'], true);
    }

    /**
     * Build a URL the daemon can actually fetch to moderate the image — a signed,
     * temporary S3/R2/MinIO URL for the asset path (or a pre-set public external URL).
     * Returns null when no fetchable URL can be produced (moderation is then skipped,
     * fail-open). The raw local `/api/assets/{uuid}/download` route is intentionally
     * NOT used: it requires JWT auth the daemon does not hold.
     */
    protected function daemonFetchableImageUrl(RenderJob $job): ?string
    {
        $asset = $job->assets->first();
        if (!$asset || empty($asset->path)) {
            return null;
        }

        // Already-public external URL (e.g. synced R2 object) — hand it over directly.
        if (!empty($asset->external_url)) {
            return $asset->external_url;
        }

        $disks = match ($asset->storage_location) {
            'r2' => ['s3-external', 's3'],
            default => ['s3', 's3-external'],
        };

        foreach ($disks as $disk) {
            if (empty(config("filesystems.disks.{$disk}.key"))) {
                continue;
            }
            try {
                return Storage::disk($disk)->temporaryUrl($asset->path, now()->addMinutes(20));
            } catch (\Throwable $e) {
                Log::warning('Failed to build temporary URL for image moderation', [
                    'render_job_id' => $job->id,
                    'disk' => $disk,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return null;
    }

    /**
     * Batch-resolve reference_images paths → Asset (keyed by path) for a page of jobs.
     * One query for the whole page instead of N×M per-path lookups in formatAssetCard.
     *
     * @param iterable<RenderJob> $jobs
     * @return array<string, \App\Models\Asset>
     */
    protected function buildReferenceAssetMap(iterable $jobs): array
    {
        $paths = [];
        foreach ($jobs as $job) {
            if (!empty($job->reference_images) && is_array($job->reference_images)) {
                foreach ($job->reference_images as $refPath) {
                    if (is_string($refPath) && $refPath !== '') {
                        $paths[$refPath] = true;
                    }
                }
            }
        }

        if (empty($paths)) {
            return [];
        }

        return \App\Models\Asset::whereIn('path', array_keys($paths))
            ->get()
            ->keyBy('path')
            ->all();
    }

    /**
     * @param array<string, \App\Models\Asset>|null $refAssetMap Pre-resolved reference-path→Asset
     *        map (see buildReferenceAssetMap). When null, resolves this job's refs in one query.
     */
    protected function formatAssetCard(RenderJob $job, ?array $refAssetMap = null): array
    {
        $likeCount = $job->likes_count ?? Like::where('render_job_id', $job->id)->count();

        // Resolve output_path to a proper URL via the linked Asset (eager-loaded collection — no N+1).
        // Never fall back to the raw $job->output_path — it is a private storage key, not a servable URL.
        $asset = $job->assets->first();
        $outputUrl = $asset?->url;
        $thumbnailUrl = $job->thumbnail_path;
        if (!$thumbnailUrl && $outputUrl) {
            $thumbnailUrl = $outputUrl;
        }

        // Determine asset type
        $assetType = 'video'; // default
        if ($asset && $asset->type) {
            $assetType = $asset->type;
        } elseif (str_starts_with($job->capability ?? '', 't2i')) {
            $assetType = 'image';
        } elseif (in_array($job->video_type ?? '', ['image_generation', 't2i'])) {
            $assetType = 'image';
        }

        // Resolve reference images to URLs (batched via $refAssetMap when provided)
        $referenceImageUrls = [];
        if (!empty($job->reference_images) && is_array($job->reference_images)) {
            $refAssetMap ??= $this->buildReferenceAssetMap([$job]);
            foreach ($job->reference_images as $refPath) {
                $refAsset = $refAssetMap[$refPath] ?? null;
                // Only expose the authenticated Asset URL; never leak the raw storage key as a fallback.
                if ($refAsset?->url) {
                    $referenceImageUrls[] = $refAsset->url;
                }
            }
        }

        return [
            'uuid' => $job->uuid,
            'title' => $job->title ?? mb_substr($job->prompt ?? '', 0, 60),
            'prompt' => $job->prompt,
            'output_path' => $outputUrl,
            'thumbnail_path' => $thumbnailUrl,
            'preview_path' => $job->preview_path,
            'aspect_ratio' => $job->aspect_ratio,
            'resolution' => $job->resolution,
            'duration_seconds' => $job->duration_seconds,
            'credits_cost' => $job->credits_cost,
            'visibility' => $job->visibility,
            'tags' => $job->tags ?? [],
            'like_count' => $likeCount,
            'usage_count' => $job->usage_count,
            'comment_count' => $job->comments_count ?? \App\Models\Comment::where('render_job_id', $job->id)->count(),
            'published_at' => $job->published_at?->toIso8601String(),
            'creator_payout' => $job->creator_payout,
            'asset_type' => $assetType,
            'capability' => $job->capability,
            'reference_images' => $referenceImageUrls,
            'user' => $job->user ? [
                'name' => $job->user->name,
                'username' => $job->user->username,
                'avatar_url' => $job->user->avatar,
                'reputation_level' => $job->user->reputation_level,
            ] : null,
        ];
    }
}

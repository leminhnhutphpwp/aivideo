<?php

use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\SocialiteController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\ActivityLogController;
use App\Http\Controllers\API\HealthController;
use App\Http\Controllers\API\RenderJobController;
use App\Http\Controllers\API\SkillAuthoringController;
use App\Http\Controllers\API\PromptEnhancementController;
use App\Http\Controllers\API\PlanController;
use App\Http\Controllers\API\CreditController;
use App\Http\Controllers\API\CouponController;
use App\Http\Controllers\API\AssetController;
use App\Http\Controllers\API\ApiKeyController;
use App\Http\Controllers\API\BroadcastController;
use App\Http\Controllers\API\NotificationController;
use App\Http\Controllers\API\DaemonProxyController;
use App\Http\Controllers\API\DaemonWebhookController;
use App\Http\Controllers\API\V1\PricingController;
use App\Http\Controllers\API\SettingsController;
use App\Http\Controllers\API\StoryboardController;
use App\Http\Controllers\API\CommunityController;
use App\Http\Controllers\API\CommentController;
use App\Http\Controllers\API\ReportController;
use App\Http\Controllers\API\MetricsController;
use App\Http\Controllers\API\SePayWebhookController;
use App\Http\Middleware\ThrottleApiRequests;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Http;

Route::get('/debug-task', function () {
    return Http::get(config('daemon.base_url') . '/api/media/tasks/2b96b28f-7615-4a76-a9fa-f69a3fc28b28')->json();
});

Route::get('/debug-list', function () {
    return Http::get(config('daemon.base_url') . '/api/media/projects/b01f809c-db55-45ac-a656-07d53474a6cd/media/tasks?includeDone=1')->body();
});

// Showcase items + hero video (yêu cầu auth)
Route::get('/showcase', function () {
    $settings = app(\App\Settings\GeneralSettings::class);
    $items = $settings->showcase_items ?? [];
    $userIp = request()->ip();

    // Hero video
    $heroUrl = null;
    if ($settings->hero_video_id) {
        $heroAsset = \App\Models\Asset::where('uuid', $settings->hero_video_id)->first();
        if ($heroAsset) {
            $token = \Illuminate\Support\Str::random(32);
            \Illuminate\Support\Facades\Cache::put('showcase_stream_' . $token, [
                'asset_id' => $settings->hero_video_id,
                'ip' => $userIp,
            ], now()->addMinutes(30));
            $heroUrl = $token;
        }
    }

    foreach ($items as &$item) {
        if (!empty($item['asset_id'])) {
            $item['id'] = $item['asset_id'];
            $asset = \App\Models\Asset::where('uuid', $item['asset_id'])->first();
            // Tell the frontend how to render this item (image vs video). Defaults to
            // 'video' for legacy items / missing assets so existing behaviour is unchanged.
            $item['media_type'] = $asset?->type === 'image' ? 'image' : 'video';
            $streamToken = \Illuminate\Support\Str::random(32);
            \Illuminate\Support\Facades\Cache::put('showcase_stream_' . $streamToken, [
                'asset_id' => $item['asset_id'],
                'ip' => $userIp,
            ], now()->addMinutes(30));
            $item['stream_token'] = $streamToken;
        }
        $item['id'] = $item['id'] ?? $item['asset_id'] ?? uniqid('s_');
    }

    return response()->json(['success' => true, 'data' => [
        'hero_stream_token' => $heroUrl,
        'items' => $items,
    ]]);
})->middleware('auth:api');

// Showcase video stream (yêu cầu JWT — frontend fetch blob, không share được URL)
Route::get('/showcase/stream/{token}', function (string $token) {
    $cached = \Illuminate\Support\Facades\Cache::get('showcase_stream_' . $token);
    if (!$cached || !isset($cached['asset_id'])) {
        return response()->json(['error' => 'Link không hợp lệ hoặc đã hết hạn'], 410);
    }

    $asset = \App\Models\Asset::where('uuid', $cached['asset_id'])->first();
    if (!$asset) {
        return response()->json(['error' => 'File not found'], 404);
    }

    $stream = null;
    $disks = match ($asset->storage_location) {
        'r2' => ['s3-external', 's3'],
        'both' => ['s3', 's3-external'],
        default => ['s3', 's3-external'],
    };

    foreach ($disks as $disk) {
        if (empty(config("filesystems.disks.{$disk}.key"))) continue;
        try {
            $stream = \Illuminate\Support\Facades\Storage::disk($disk)->readStream($asset->path);
            if ($stream !== false) break;
        } catch (\Exception) { $stream = null; }
    }

    if (!$stream) {
        return response()->json(['error' => 'File not found'], 404);
    }

    return response()->stream(function () use ($stream) {
        fpassthru($stream);
        fclose($stream);
    }, 200, [
        'Content-Type' => $asset->mime_type ?? 'video/mp4',
        'Content-Disposition' => 'inline',
        'Accept-Ranges' => 'bytes',
        'Cache-Control' => 'private, max-age=600',
    ]);
})->middleware('auth:api')->where('token', '[A-Za-z0-9]+');

// Public: Auth pages background media
Route::get('/auth/bg', function () {
    $settings = app(\App\Settings\GeneralSettings::class);
    $mediaId = $settings->auth_bg_media_id;
    if (!$mediaId) {
        return response()->json(['success' => true, 'data' => null]);
    }
    $media = \Awcodes\Curator\Models\Media::find($mediaId);
    if (!$media) {
        return response()->json(['success' => true, 'data' => null]);
    }
    $token = \Illuminate\Support\Str::random(32);
    \Illuminate\Support\Facades\Cache::put('auth_bg_stream_' . $token, [
        'media_id' => $mediaId,
        'ip' => request()->ip(),
    ], now()->addMinutes(30));
    return response()->json(['success' => true, 'data' => [
        'stream_token' => $token,
        'type' => str_starts_with($media->type ?? '', 'video') ? 'video' : 'image',
        'mime_type' => $media->type,
    ]]);
})->middleware(ThrottleApiRequests::class . ':120,1');

// Auth background stream
Route::get('/auth/bg/stream/{token}', function (string $token) {
    $cached = \Illuminate\Support\Facades\Cache::get('auth_bg_stream_' . $token);
    if (!$cached || !isset($cached['media_id'])) {
        return response()->json(['error' => 'Link không hợp lệ hoặc đã hết hạn'], 410);
    }
    $media = \Awcodes\Curator\Models\Media::find($cached['media_id']);
    if (!$media) {
        return response()->json(['error' => 'File not found'], 404);
    }
    $path = storage_path("app/{$media->disk}/{$media->path}");
    if (!file_exists($path)) {
        return response()->json(['error' => 'File not found'], 404);
    }
    return response()->stream(function () use ($path) {
        $stream = fopen($path, 'rb');
        if ($stream) {
            fpassthru($stream);
            fclose($stream);
        }
    }, 200, [
        'Content-Type' => $media->type ?? 'application/octet-stream',
        'Content-Disposition' => 'inline',
        'Accept-Ranges' => 'bytes',
        'Cache-Control' => 'private, max-age=600',
    ]);
})->where('token', '[A-Za-z0-9]+');

// Landing page content is hardcoded in the Next.js app (apps/web hooks/use-landing-settings.ts).
// The former /landing-page CMS endpoint + GeneralSettings landing props were removed.

// Public: SEO settings
Route::get('/seo', function () {
    $settings = app(\App\Settings\GeneralSettings::class);
    $ogImageUrl = null;
    if ($settings->seo_og_image) {
        $media = \Awcodes\Curator\Models\Media::find($settings->seo_og_image);
        if ($media) $ogImageUrl = $media->url;
    }
    return response()->json(['success' => true, 'data' => [
        'title' => $settings->seo_title ?? 'Wavise Studio | Nền tảng Tạo Video AI Điện Ảnh & Tự Động Hóa Chuyên Nghiệp',
        'description' => $settings->seo_description ?? 'Wavise Studio - Nền tảng tạo video AI chất lượng điện ảnh 4K hàng đầu. Chuyển văn bản thành video, lồng tiếng AI tự nhiên, và tối ưu hóa tốc độ tiếp cận trên TikTok, Reels, Shorts chỉ trong vài giây.',
        'keywords' => $settings->seo_keywords ?? 'tạo video AI, video AI, sản xuất phim AI, wavise studio, wavise, text to video, AI video generator, reels ai maker',
        'og_image' => $ogImageUrl,
        'site_name' => $settings->site_name ?? 'Wavise Studio',
        'favicon_url' => $settings->site_favicon
            ? (\Awcodes\Curator\Models\Media::find($settings->site_favicon)?->url ?? null)
            : null,
    ]]);
});

// === Public (with rate limiting) ===
Route::get('/health', [HealthController::class, 'index']);
Route::get('/metrics', [MetricsController::class, 'prometheus']);
Route::post('/auth/login', [AuthController::class, 'login'])->middleware(ThrottleApiRequests::class . ':30,1');
Route::post('/auth/register', [AuthController::class, 'register'])->middleware(['anti.abuse', ThrottleApiRequests::class . ':5,1']);
Route::post('/auth/refresh', [AuthController::class, 'refresh'])->middleware(ThrottleApiRequests::class . ':10,1');
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware(ThrottleApiRequests::class . ':10,1');
Route::post('/auth/verify-reset-code', [AuthController::class, 'verifyResetCode'])->middleware(ThrottleApiRequests::class . ':10,1');
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])->middleware(ThrottleApiRequests::class . ':5,1');
Route::get('/auth/{provider}/redirect', [SocialiteController::class, 'redirect']);
Route::get('/auth/{provider}/callback', [SocialiteController::class, 'callback']);
Route::post('/daemon/webhook', [DaemonWebhookController::class, 'handle'])->middleware(ThrottleApiRequests::class . ':120,1');
Route::post('/sepay/webhook', [SePayWebhookController::class, 'webhook'])->middleware(ThrottleApiRequests::class . ':60,1');

// === Public Community (no auth, but optional auth for liked_by_me) ===
Route::middleware(ThrottleApiRequests::class . ':120,1')->group(function () {
    Route::get('/v1/community/assets', [CommunityController::class, 'assets']);
    Route::get('/v1/users/{username}', [CommunityController::class, 'userProfile']);
    Route::get('/v1/users/{username}/assets', [CommunityController::class, 'userAssets']);
    Route::get('/v1/users/{username}/followers', [CommunityController::class, 'followers']);
    Route::get('/v1/users/{username}/following', [CommunityController::class, 'following']);
    Route::get('/render-jobs/{renderJob:uuid}/comments', [CommentController::class, 'index']);
    Route::get('/v1/trending', [CommunityController::class, 'trending']);
    Route::get('/v1/trending/creators', [CommunityController::class, 'trendingCreators']);
    Route::get('/tags', [CommunityController::class, 'tags']);
    Route::get('/v1/tags/{slug}/assets', [CommunityController::class, 'tagAssets']);
    Route::get('/v1/creators/search', [CommunityController::class, 'searchCreators']);
});

// === Authenticated (JWT) ===
Route::middleware('auth:api')->group(function () {
    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);
    Route::post('/auth/send-verification', [AuthController::class, 'sendVerification']);
    Route::post('/auth/verify-email', [AuthController::class, 'verifyEmail'])->middleware(ThrottleApiRequests::class . ':5,1');

    // AI skill authoring (admin/agent) — generate a draft skill following the schema
    Route::get('/skills/authoring-schema', [SkillAuthoringController::class, 'schema']);
    Route::post('/skills/author', [SkillAuthoringController::class, 'author'])->middleware(ThrottleApiRequests::class . ':10,1');

    // AI enhance prompt (any authenticated studio user)
    Route::post('/ai/enhance-prompt', [PromptEnhancementController::class, 'enhance'])->middleware(ThrottleApiRequests::class . ':20,1');

    // Users
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::get('/users/likes', [CommunityController::class, 'likes']);
    Route::get('/users/{user}', [UserController::class, 'show']);
    Route::put('/users/{user}', [UserController::class, 'update']);

    // Community (authenticated actions)
    Route::patch('/render-jobs/{renderJob:uuid}/publish', [CommunityController::class, 'publish']);
    Route::patch('/render-jobs/{renderJob:uuid}/unpublish', [CommunityController::class, 'unpublish']);
    Route::post('/render-jobs/{renderJob:uuid}/like', [CommunityController::class, 'like']);
    Route::post('/render-jobs/{renderJob:uuid}/use', [CommunityController::class, 'useAsset']);
    Route::post('/users/{user:uuid}/follow', [CommunityController::class, 'follow']);
    Route::delete('/users/{user:uuid}/follow', [CommunityController::class, 'unfollow']);

    // Comments
    Route::post('/render-jobs/{renderJob:uuid}/comments', [CommentController::class, 'store'])->middleware(ThrottleApiRequests::class . ':10,1');
    Route::delete('/comments/{comment}', [CommentController::class, 'destroy']);

    // Report
    Route::post('/render-jobs/{renderJob:uuid}/report', [ReportController::class, 'store']);

    // Activity Logs - Admin only
    Route::get('/activity-logs', [ActivityLogController::class, 'index']);
    Route::get('/activity-logs/statistics', [ActivityLogController::class, 'statistics']);
    Route::get('/activity-logs/{id}', [ActivityLogController::class, 'show']);
    Route::get('/activity-logs/user/{user_id}', [ActivityLogController::class, 'userActivities']);

    // === Video Platform ===
    Route::get('/plans', [PlanController::class, 'index']);
    Route::get('/plans/{plan:slug}', [PlanController::class, 'show']);

    Route::get('/credits/balance', [CreditController::class, 'balance']);
    Route::get('/credits/packs', [CreditController::class, 'packs']);
    Route::get('/credits/history', [CreditController::class, 'history']);
    Route::post('/credits/purchase', [CreditController::class, 'purchase'])->middleware(ThrottleApiRequests::class . ':5,1');
    Route::get('/credits/settings', [CreditController::class, 'settings']);
    Route::get('/credits/pending-purchases', [CreditController::class, 'pendingPurchases']);
    Route::post('/credits/upgrade', [CreditController::class, 'upgrade'])->middleware(ThrottleApiRequests::class . ':10,1');
    Route::get('/credits/upgrade-history', [CreditController::class, 'upgradeHistory']);

    // Coupons: nhập mã tặng credits / preview mã giảm giá. Throttle chặt để chống dò mã.
    Route::post('/coupons/redeem', [CouponController::class, 'redeem'])->middleware(ThrottleApiRequests::class . ':10,1');
    Route::post('/coupons/validate', [CouponController::class, 'validateDiscount'])->middleware(ThrottleApiRequests::class . ':20,1');

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::get('/notifications/{notification}', [NotificationController::class, 'show']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    Route::middleware(ThrottleApiRequests::class . ':120,1')->group(function () {
        Route::get('/render-jobs', [RenderJobController::class, 'index']);
        Route::post('/render-jobs', [RenderJobController::class, 'store']);
        Route::get('/render-jobs/{renderJob:uuid}', [RenderJobController::class, 'show']);
        Route::delete('/render-jobs/{renderJob:uuid}', [RenderJobController::class, 'destroy']);
        Route::post('/render-jobs/{renderJob:uuid}/cancel', [RenderJobController::class, 'cancel']);
        Route::post('/render-jobs/{renderJob:uuid}/retry', [RenderJobController::class, 'retry']);
    });

    Route::post('/storyboards/ai-draft', [StoryboardController::class, 'aiDraft']);
    Route::get('/storyboards', [StoryboardController::class, 'index']);
    Route::post('/storyboards', [StoryboardController::class, 'store']);
    Route::get('/storyboards/{storyboard:uuid}', [StoryboardController::class, 'show']);
    Route::put('/storyboards/{storyboard:uuid}', [StoryboardController::class, 'update']);
    Route::delete('/storyboards/{storyboard:uuid}', [StoryboardController::class, 'destroy']);
    Route::post('/storyboards/{storyboard:uuid}/analyze', [StoryboardController::class, 'analyze']);
    Route::post('/storyboards/{storyboard:uuid}/render', [StoryboardController::class, 'render']);
    Route::post('/storyboards/{storyboard:uuid}/cancel', [StoryboardController::class, 'cancel']);
    Route::post('/storyboards/{storyboard:uuid}/retry', [StoryboardController::class, 'retry']);
    Route::post('/storyboards/{storyboard:uuid}/compile-prompt', [StoryboardController::class, 'compilePrompt']);
    Route::post('/storyboards/{storyboard:uuid}/generate-multi-panel-image', [StoryboardController::class, 'generateMultiPanelImage']);
    Route::get('/storyboards/{storyboard:uuid}/download', [StoryboardController::class, 'download']);
    Route::get('/storyboards/{storyboard:uuid}/multi-panel', [StoryboardController::class, 'multiPanel']);
    Route::post('/storyboards/{storyboard:uuid}/add-voiceover', [StoryboardController::class, 'addVoiceover']);

    Route::post('/assets', [AssetController::class, 'store']);
    Route::middleware(ThrottleApiRequests::class . ':120,1')->group(function () {
        Route::get('/assets', [AssetController::class, 'index']);
        Route::get('/assets/{asset:uuid}', [AssetController::class, 'show']);
        Route::get('/assets/{asset:uuid}/download', [AssetController::class, 'download'])->name('api.assets.download');
        Route::get('/assets/{asset:uuid}/play', [AssetController::class, 'play'])->name('api.assets.play');
    });
    Route::delete('/assets/{asset:uuid}', [AssetController::class, 'destroy']);

    Route::get('/api-keys', [ApiKeyController::class, 'index']);
    Route::post('/api-keys', [ApiKeyController::class, 'store']);
    Route::delete('/api-keys/{apiKey}', [ApiKeyController::class, 'destroy']);

    Route::post('/broadcasting/auth', [BroadcastController::class, 'authenticate']);

    // === Daemon Proxy (JWT required) ===
    // Read-heavy: models, skills, projects list, task polling, pricing config
    Route::middleware(ThrottleApiRequests::class . ':120,1')->group(function () {
        Route::get('/daemon/version', [DaemonProxyController::class, 'version']);
        Route::get('/daemon/status', [DaemonProxyController::class, 'status']);
        Route::get('/daemon/media/models', [DaemonProxyController::class, 'models']);
        Route::get('/daemon/media/skills', [DaemonProxyController::class, 'skills']);
        Route::get('/daemon/media/skills/stats', [DaemonProxyController::class, 'skillStats']);
        Route::get('/daemon/media/config', [DaemonProxyController::class, 'getMediaConfig']);
        Route::get('/daemon/media/providers/elevenlabs/voices', [DaemonProxyController::class, 'voices']);
        Route::get('/daemon/media/voices', [DaemonProxyController::class, 'allVoices']);

        Route::get('/daemon/projects', [DaemonProxyController::class, 'listProjects']);
        Route::get('/daemon/projects/{id}', [DaemonProxyController::class, 'getProject']);
        Route::get('/daemon/projects/{id}/files', [DaemonProxyController::class, 'listFiles']);
        Route::get('/daemon/projects/{id}/raw/{path}', [DaemonProxyController::class, 'getRawFile']);

        Route::get('/daemon/projects/{id}/media/tasks', [DaemonProxyController::class, 'listTasks']);
        Route::get('/daemon/media/tasks/{taskId}', [DaemonProxyController::class, 'getTask']);
        Route::post('/daemon/media/tasks/{taskId}/wait', [DaemonProxyController::class, 'waitTask']);
        Route::post('/daemon/media/tasks/{taskId}/cancel', [DaemonProxyController::class, 'cancelTask']);

        Route::prefix('v1/pricing')->group(function () {
            Route::get('/config', [PricingController::class, 'config']);
            Route::get('/durations', [PricingController::class, 'durations']);
            Route::get('/packages', [PricingController::class, 'packages']);
            Route::get('/history', [PricingController::class, 'history']);
            Route::post('/calculate', [PricingController::class, 'calculate']);
            Route::post('/validate', [PricingController::class, 'validatePrice']);
        });
    });

    // Write/Mutate: generate, retry, upload, create/update project
    Route::middleware(ThrottleApiRequests::class . ':60,1')->group(function () {
        Route::put('/daemon/media/config', [DaemonProxyController::class, 'updateMediaConfig']);
        Route::post('/daemon/media/tts-preview', [DaemonProxyController::class, 'ttsPreview']);
        Route::post('/daemon/projects', [DaemonProxyController::class, 'createProject']);
        Route::patch('/daemon/projects/{id}', [DaemonProxyController::class, 'updateProject']);
        Route::post('/daemon/projects/{id}/upload', [DaemonProxyController::class, 'uploadFile']);
        Route::delete('/daemon/projects/{id}', [DaemonProxyController::class, 'destroyProject']);
    });

    // Generate media — expensive, low rate
    Route::middleware(ThrottleApiRequests::class . ':60,1')->group(function () {
        Route::post('/daemon/projects/{id}/media/generate', [DaemonProxyController::class, 'generateMedia']);
        Route::post('/daemon/projects/{id}/retry', [DaemonProxyController::class, 'retryGenerate']);
    });

    Route::get('/daemon/health', function () {
        try {
            $response = \Illuminate\Support\Facades\Http::timeout(3)
                ->get(config('daemon.base_url') . '/api/health');
            return $response->successful()
                ? response()->json($response->json())
                : response()->json(['status' => 'unreachable'], 503);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            return response()->json(['status' => 'unreachable', 'error' => $e->getMessage()], 503);
        }
    });

    // Settings
    Route::middleware(['auth:api'])->post('/settings/avatar', [SettingsController::class, 'uploadAvatar']);
    Route::middleware(['auth:api'])->get('/settings/login-history', [SettingsController::class, 'getLoginHistory']);
    Route::middleware(['auth:api'])->delete('/settings/login-history/{id}', [SettingsController::class, 'revokeSession']);
    Route::middleware(['auth:api'])->get('/settings/notifications', [SettingsController::class, 'getNotificationPreferences']);
    Route::middleware(['auth:api'])->put('/settings/notifications', [SettingsController::class, 'updateNotificationPreferences']);
});

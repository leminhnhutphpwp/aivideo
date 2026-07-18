<?php

namespace App\Http\Controllers\API;

use App\Events\JobFailed;
use App\Http\Controllers\Controller;
use App\Services\ContentFilterService;
use App\Services\CreditCalculator;
use App\Services\CreditService;
use App\Services\RenderQuotaService;
use App\Support\ErrorSanitizer;
use App\Services\Pricing\PricingCacheManager;
use App\Models\DurationTier;
use App\Models\RenderJob;
use App\Services\ModelSelector;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DaemonProxyController extends Controller
{
    protected string $baseUrl;

    private const VALID_SURFACES = ['image', 'video', 'audio'];
    private const VALID_ASPECTS = ['1:1', '16:9', '9:16', '4:3', '3:4'];
    private const VALID_CAPABILITIES = [
        't2v', 'i2v', 'r2v', 't2i', 'i2i', 'inpaint',
        'character-anim', 'video-edit', 'tts', 'sfx',
    ];
    private const ALLOWED_UPLOAD_MIMES = [
        'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
        'video/mp4', 'video/webm', 'video/quicktime',
        'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm',
        'application/json', 'text/plain', 'text/markdown', 'text/html',
        'application/pdf', 'application/zip',
    ];

    public function __construct(
        protected CreditCalculator $creditCalculator,
        protected CreditService $creditService,
        protected ModelSelector $modelSelector,
        protected ContentFilterService $contentFilter,
        protected RenderQuotaService $renderQuota,
    ) {
        $this->baseUrl = rtrim(config('daemon.base_url'), '/');
    }

    /**
     * Gate a new media-generation request through the same safety checks as
     * RenderJobController::store — content moderation and the per-user daily render cap —
     * BEFORE any credits are reserved or the daemon is touched. The studio "generate"/
     * "retry" paths run through this controller, so without this they would bypass both.
     *
     * @return \Illuminate\Http\JsonResponse|null  422/429 response when blocked, else null.
     */
    protected function guardGenerationSafety(Request $request): ?\Illuminate\Http\JsonResponse
    {
        $user = $request->user();
        $prompt = (string) $request->input('prompt', '');

        // Content moderation — reject unsafe prompts. Only the positive prompt is moderated
        // (negative_prompt legitimately lists undesired concepts to EXCLUDE). Never surface
        // the matched term to the user.
        if ($prompt !== '' && $this->contentFilter->containsProhibitedContent($prompt)) {
            Log::warning('Prompt blocked by content filter (daemon proxy)', [
                'user_id' => $user->id,
                'term' => $this->contentFilter->getProhibitedTerm($prompt),
            ]);
            return response()->json([
                'error' => 'unsafe_content',
                'message' => 'Nội dung mô tả vi phạm tiêu chuẩn an toàn của nền tảng. Vui lòng chỉnh sửa và thử lại.',
            ], 422);
        }

        // Daily render cap — stop free accounts from farming provider spend.
        if ($this->renderQuota->exceeded($user)) {
            return response()->json([
                'error' => 'daily_render_limit',
                'message' => $this->renderQuota->limitMessage($user),
            ], 429);
        }

        return null;
    }

    protected function validateDaemonRequest(Request $request, array $rules): ?\Illuminate\Http\JsonResponse
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $firstError = collect($validator->errors()->all())->first() ?? 'Validation failed';
            return response()->json([
                'error' => $firstError,
                'messages' => $validator->errors(),
            ], 422);
        }
        return null;
    }

    protected function sanitizeString(mixed $value, int $maxLength = 255): ?string
    {
        if ($value === null) return null;
        $str = (string) $value;
        $str = strip_tags($str);
        $str = mb_substr($str, 0, $maxLength);
        return $str;
    }

    protected function normalizeResponse(array &$data): void
    {
        // Đổi id → uuid cho đồng bộ với Laravel API
        if (isset($data['id'])) {
            $data['uuid'] = $data['id'];
            unset($data['id']);
        }
        if (isset($data['project']['id'])) {
            $data['project']['uuid'] = $data['project']['id'];
            unset($data['project']['id']);
        }

        foreach (['projects', 'tasks', 'results', 'items'] as $key) {
            if (isset($data[$key]) && is_array($data[$key])) {
                foreach ($data[$key] as &$item) {
                    if (is_array($item)) $this->normalizeResponse($item);
                }
            }
        }
    }

    protected function sanitizeForUser(array &$data): void
    {
        // Strip internal model/provider fields — never expose to end users
        unset($data['model'], $data['providerId']);

        // Sanitize real error from frontend to prevent leaking provider details
        if (isset($data['error'])) {
            $errorMsg = is_array($data['error']) ? ($data['error']['message'] ?? json_encode($data['error'])) : $data['error'];

            if (ErrorSanitizer::leaks(is_string($errorMsg) ? $errorMsg : null)) {
                Log::warning('Daemon Error (Hidden from user)', [
                    'error' => $errorMsg,
                    'taskId' => $data['taskId'] ?? null,
                ]);

                $genericMsg = ErrorSanitizer::GENERIC;

                if (is_array($data['error'])) {
                    $data['error']['message'] = $genericMsg;
                    if (isset($data['error']['code'])) {
                        $data['error']['code'] = 'PROVIDER_ERROR';
                    }
                    if (isset($data['error']['details'])) unset($data['error']['details']);
                } else {
                    $data['error'] = $genericMsg;
                }
            } else if (is_array($data['error'])) {
                $data['error']['code'] = $data['error']['code'] ?? null;
            }
        }

        // Sanitize file metadata — strip provider internals
        if (isset($data['file']) && is_array($data['file'])) {
            unset($data['file']['model'], $data['file']['providerId']);
            // Sanitize providerError in file meta (stub fallback)
            if (isset($data['file']['providerError'])) {
                Log::warning('Provider error (hidden from user)', [
                    'providerError' => $data['file']['providerError'],
                    'taskId' => $data['taskId'] ?? null,
                ]);
                $data['file']['providerError'] = null;
                $data['file']['providerNote'] = null;
            }
            // Strip providerNote — internal debug info, not for users
            unset($data['file']['providerNote']);
        }

        // Recursively sanitize lists
        foreach (['tasks', 'results', 'items'] as $key) {
            if (isset($data[$key]) && is_array($data[$key])) {
                foreach ($data[$key] as &$item) {
                    if (is_array($item)) $this->sanitizeForUser($item);
                }
            }
        }
    }

    protected function proxy(string $method, string $path, Request $request, ?array $overrideData = null)
    {
        $url = "{$this->baseUrl}/api/{$path}";
        $query = $request->query();
        $headers = ['Accept' => 'application/json'];

        if ($request->user()) {
            $userId = (string) $request->user()->id;
            $headers['X-User-Id'] = $userId;
            $headers['X-Daemon-Signature'] = hash_hmac('sha256', $userId, config('daemon.webhook_secret'));
        }

        $data = $overrideData ?? $request->all();

        try {
            $response = match ($method) {
                'GET' => Http::timeout(30)->withHeaders($headers)->get($url, $query),
                'POST' => Http::timeout(60)->withHeaders($headers)->post($url, $data),
                'PATCH' => Http::timeout(30)->withHeaders($headers)->patch($url, $data),
                'DELETE' => Http::timeout(30)->withHeaders($headers)->delete($url, $data),
                default => Http::timeout(30)->withHeaders($headers)->get($url, $query),
            };

            $body = $response->json();
            if (is_array($body)) {
                $this->normalizeResponse($body);
                $this->sanitizeForUser($body);
            }

            return response()->json(
                $body !== null ? $body : json_decode($response->body(), true),
                $response->status()
            );
        } catch (ConnectionException $e) {
            Log::warning("Daemon unreachable: {$url}", ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Daemon service unavailable'], 503);
        }
    }

    private function cleanupDaemonProject(string $id): void
    {
        try {
            Http::timeout(10)->delete("{$this->baseUrl}/api/projects/{$id}");
        } catch (\Exception) {}
    }

    /**
     * Block image edit/i2i/inpaint actions that would be routed into a
     * text-to-image-only model (which the provider cannot fulfil → 404 /images/edits).
     *
     * Only blocks when the resolved model IS known in config AND lacks any edit
     * capability. Unknown models (custom plan providers) are allowed through, so this
     * never produces false positives for models we can't introspect.
     *
     * @return \Illuminate\Http\JsonResponse|null  422 response when blocked, else null.
     */
    private function guardImageEditCapability(string $surface, string $capability, string $videoTypeCode, string $model): ?\Illuminate\Http\JsonResponse
    {
        $isEdit = $surface === 'image'
            && ($videoTypeCode === 'image_editing' || in_array($capability, ['i2i', 'inpaint'], true));
        if (!$isEdit) {
            return null;
        }

        $caps = $this->modelCapabilities($model);
        if ($caps === null) {
            // Unknown model — cannot introspect, don't block.
            return null;
        }

        // Edit tokens span both capability vocabularies used across providers.
        $editTokens = ['i2i', 'inpaint', 'image_editing'];
        if (empty(array_intersect($caps, $editTokens))) {
            Log::warning('Blocked image edit routed to non-edit model', [
                'model' => $model,
                'capability' => $capability,
                'video_type' => $videoTypeCode,
                'model_capabilities' => $caps,
            ]);
            return response()->json([
                'error' => 'image_edit_unavailable',
                'message' => 'Tính năng chỉnh sửa ảnh chưa khả dụng. Mô hình hiện tại chỉ hỗ trợ tạo ảnh mới từ mô tả.',
            ], 422);
        }

        return null;
    }

    /**
     * Look up a model's declared capabilities from media_providers config.
     * Returns null when the model is not present in config (e.g. custom providers).
     */
    private function modelCapabilities(string $modelId): ?array
    {
        foreach (config('media_providers.providers', []) as $data) {
            if (isset($data['models'][$modelId]['capabilities'])) {
                return (array) $data['models'][$modelId]['capabilities'];
            }
        }
        return null;
    }

    /**
     * Resolve the skill this render was generated with, for attribution. Prefers an
     * explicit skillId on the generate request; falls back to the skillId the studio
     * passed when it created the daemon project (stashed in cache by createProject).
     * Returns null when there is no skill (studio flows without a chosen preset).
     */
    private function resolveSkillId(Request $request, string $projectId): ?string
    {
        $skillId = $request->input('skillId');
        if (is_string($skillId) && trim($skillId) !== '' && $skillId !== 'none') {
            return trim($skillId);
        }

        $cached = \Illuminate\Support\Facades\Cache::get("project_skill:{$projectId}");

        return is_string($cached) && $cached !== '' && $cached !== 'none' ? $cached : null;
    }

    public function generateMedia(Request $request, string $id)
    {
        $validationError = $this->validateDaemonRequest($request, [
            'surface' => ['sometimes', 'string', Rule::in(self::VALID_SURFACES)],
            'capability' => ['sometimes', 'string', Rule::in(self::VALID_CAPABILITIES)],
            'model' => ['sometimes', 'string', 'max:255', 'regex:/^[a-zA-Z0-9._-]+$/'],
            'prompt' => ['sometimes', 'string', 'max:2000'],
            'aspect' => ['sometimes', 'string', Rule::in(self::VALID_ASPECTS)],
            'length' => ['sometimes', 'integer', 'min:1', 'max:120'],
            'duration' => ['sometimes', 'integer', 'min:1', 'max:300'],
            'duration_seconds' => ['sometimes', 'integer', 'min:1', 'max:300'],
            'resolution' => ['sometimes', 'string', 'max:20'],
            'voice' => ['sometimes', 'string', 'max:100'],
            'style' => ['sometimes', 'string', 'max:100'],
            'mood' => ['sometimes', 'string', 'max:100'],
            'camera' => ['sometimes', 'string', 'max:100'],
            'lighting' => ['sometimes', 'string', 'max:100'],
            'negative_prompt' => ['sometimes', 'string', 'max:500'],
            'direction' => ['sometimes', 'string', 'max:255'],
            'image' => ['sometimes', 'string', 'max:2048'],
            'last_frame' => ['sometimes', 'string', 'max:2048'],
            'skillId' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);
        if ($validationError) return $validationError;

        $user = $request->user();
        $plan = $user->plan;

        // Content moderation + daily render cap — same guards as RenderJobController::store,
        // BEFORE reserving credits or hitting the daemon.
        if ($safetyError = $this->guardGenerationSafety($request)) {
            $this->cleanupDaemonProject($id);
            return $safetyError;
        }

        if (!$plan) {
            $this->cleanupDaemonProject($id);
            return response()->json(['error' => 'No active plan'], 403);
        }

        $surface = $request->input('surface', 'video');
        $capability = $request->input('capability', 't2v');
        $length = (int) ($request->input('length') ?? $request->input('duration') ?? 5);

        $isPremium = $plan && !$plan->isFree();

        if ($surface === 'audio' && !$isPremium) {
            $this->cleanupDaemonProject($id);
            return response()->json(['error' => 'Gói của bạn không hỗ trợ tạo âm thanh. Vui lòng nâng cấp lên Pro.'], 403);
        }

        if ($surface === 'video' && in_array($capability, ['r2v', 'character-anim']) && !$isPremium) {
            $this->cleanupDaemonProject($id);
            return response()->json(['error' => 'Tính năng này yêu cầu gói Pro. Vui lòng nâng cấp.'], 403);
        }

        if ($surface === 'video' && $request->filled('voice') && !$isPremium) {
            $this->cleanupDaemonProject($id);
            return response()->json(['error' => 'Giọng đọc yêu cầu gói Pro. Vui lòng nâng cấp.'], 403);
        }

        if ($surface !== 'audio') {
            // Per-project: chỉ 1 tác vụ đang chạy cho project này
            $activeProjectJobs = RenderJob::where('daemon_project_id', $id)
                ->whereIn('status', ['queued', 'processing'])
                ->count();
            if ($activeProjectJobs > 0) {
                $this->cleanupDaemonProject($id);
                return response()->json(['error' => 'Tác vụ trước cho project này vẫn đang chạy.'], 429);
            }

            // Per-user: theo plan
            $activeJobs = $user->renderJobs()
                ->whereIn('status', ['queued', 'processing'])
                ->count();
            if ($plan->max_concurrent_jobs !== null && $activeJobs >= $plan->max_concurrent_jobs) {
                $this->cleanupDaemonProject($id);
                return response()->json(['error' => "Bạn đang có {$activeJobs} tác vụ, tối đa là {$plan->max_concurrent_jobs}"], 403);
            }
        }

        $calculationId = $request->input('calculation_id');
        $cost = null;

        if ($calculationId) {
            $cached = PricingCacheManager::get($calculationId);
            if ($cached && isset($cached['result']['pricing']['total_credits'])) {
                $cost = (int) $cached['result']['pricing']['total_credits'];
                Log::info('Using cached pricing calculation', [
                    'calculation_id' => $calculationId,
                    'cost' => $cost,
                    'user_id' => $user->id,
                ]);
            } else {
                Log::info('Pricing calculation expired or not found, falling back to CreditCalculator', [
                    'calculation_id' => $calculationId,
                    'user_id' => $user->id,
                ]);
            }
        }

        $tierCode = $plan->isFree() ? 'standard' : 'premium';
        $videoTypeCode = match ($surface) {
            'image' => ($request->filled('image') || $request->hasFile('image') || $request->filled('images') || $request->hasFile('images')) ? 'image_editing' : 'image_generation',
            'audio' => 'text_to_video', // audio doesn't use quality tier selection
            default => $capability === 'i2v' ? 'image_to_video'
                : ($capability === 'r2v' ? 'reference_to_video'
                : ($capability === 'video-edit' ? 'video_editing'
                : ($capability === 'character-anim' ? 'character_animation'
                : 'text_to_video'))),
        };

        if ($cost === null) {
            if ($surface === 'image') {
                $cost = $this->creditCalculator->calculateImage(
                    $request->filled('image') || $request->hasFile('image') || $request->filled('images') || $request->hasFile('images')
                );
            } else {
                $extras = [];
                if ($request->filled('voice') || $request->boolean('autoVoiceover') || $request->filled('voiceover')) {
                    $extras[] = 'voice_over';
                }

                $cost = $this->creditCalculator->calculate(
                    $length,
                    $surface === 'audio' ? '720p' : ($request->input('resolution', '720p')),
                    $extras,
                    $videoTypeCode
                );
            }
        }
        $requestedModel = $request->input('model');
        $systemDefault = \App\Services\ModelSelector::getDefaultModel($videoTypeCode);
        $planModel = $this->modelSelector->resolve($plan, $videoTypeCode);

        // If frontend didn't specify a model, or specified the system default, use the Plan's mapped model
        if (!$requestedModel || $requestedModel === $systemDefault) {
            $resolvedModel = $planModel;
        } else {
            // Frontend explicitly requested a non-default model (e.g. they picked qwen-image-max from dropdown)
            $resolvedModel = $requestedModel;
        }

        // Guard: never route an image edit/i2i/inpaint action into a text-to-image-only
        // model (e.g. Wan2.7_Image). Doing so makes the provider return 404 /images/edits
        // with a confusing error AFTER credits are reserved. Block early with a clear
        // Vietnamese message instead.
        if ($editGuard = $this->guardImageEditCapability($surface, $capability, $videoTypeCode, $resolvedModel)) {
            $this->cleanupDaemonProject($id);
            return $editGuard;
        }

        $image = $request->input('image');
        $lastFrame = $request->input('last_frame');
        $imagesList = $request->input('images', []);
        $videoRef = $request->input('videoRef');
        
        $allRefs = array_merge([$image, $lastFrame, $videoRef], is_array($imagesList) ? $imagesList : []);
        $referenceImages = array_values(array_filter($allRefs));

        // Skill attribution — which skill this render was generated with. The studio sends
        // skillId to createProject (bridged here via cache keyed by project id); a direct
        // skillId on the generate call takes precedence when present.
        $skillId = $this->resolveSkillId($request, $id);

        $job = RenderJob::create([
            'uuid' => Str::uuid(),
            'user_id' => $user->id,
            'status' => 'created',
            'daemon_project_id' => $id,
            'prompt' => $this->sanitizeString($request->input('prompt', ''), 2000) ?? '',
            'title' => mb_substr($request->input('prompt', ''), 0, 100),
            'model' => $resolvedModel,
            'skill_id' => $skillId,
            'duration_seconds' => $length,
            'aspect_ratio' => $request->input('aspect', '16:9'),
            'resolution' => $surface === 'audio' ? '720p' : $request->input('resolution', '720p'),
            'credits_cost' => $cost,
            'plan_snapshot' => $plan->toSnapshot(),
            'capability' => $capability,
            'reference_images' => !empty($referenceImages) ? $referenceImages : null,
        ]);

        // Learning loop: count this generation against the skill (best-effort — never
        // blocks the render).
        app(\App\Services\SkillStatsService::class)->recordUsage($skillId);

        $creditService = app(CreditService::class);
        if (!$creditService->reserve($user, $cost, $job)) {
            $job->delete();
            $this->cleanupDaemonProject($id);
            return response()->json(['error' => 'Không đủ credits. Vui lòng nạp thêm.'], 402);
        }

        $safeData = $request->only([
            'surface', 'capability', 'prompt', 'aspect', 'length',
            'duration', 'duration_seconds', 'resolution', 'voice', 'style',
            'mood', 'camera', 'lighting', 'negative_prompt', 'direction',
            'image', 'last_frame', 'audioKind', 'language', 'loop',
            'promptInfluence', 'compositionDir', 'output', 'seed',
            'voiceover', 'voiceModelId', 'autoVoiceover',
            'images', 'referenceImages', 'videoRef', 'mode',
        ]);
        $safeData['model'] = $resolvedModel;
        $safeData['render_job_uuid'] = $job->uuid;

        // Inject provider credentials based on the user's plan
        $providerId = $plan->getProviderForModel($resolvedModel);
        $safeData['provider_id'] = $providerId;
        $safeData['protocol'] = $plan->getProviderProtocol($providerId);
        $safeData['credentials'] = [
            'providerId' => $providerId,
            'apiKey' => $plan->getProviderApiKey($providerId),
            'baseUrl' => $plan->getProviderBaseUrl($providerId),
        ];
        
        $frontendMetadata = is_array($request->input('metadata')) ? $request->input('metadata') : [];
        $safeData['metadata'] = array_merge($frontendMetadata, [
            'callbackUrl' => config('daemon.callback_url'),
            'render_job_uuid' => $job->uuid,
        ]);

        $proxyResponse = $this->proxy('POST', "media/projects/{$id}/media/generate", $request, $safeData);

        if ($proxyResponse->status() >= 400) {
            $creditService->releaseReserved($job);
            $job->update(['status' => 'failed']);
            $this->cleanupDaemonProject($id);
            broadcast(new JobFailed($job));
        } else {
            $job->update([
                'status' => 'queued',
                'daemon_task_id' => $proxyResponse->getData(true)['taskId'] ?? null,
            ]);
        }

        return $proxyResponse;
    }

    public function retryGenerate(Request $request, string $id)
    {
        $validationError = $this->validateDaemonRequest($request, [
            'model' => ['sometimes', 'string', 'max:255'],
            'prompt' => ['sometimes', 'string', 'max:2000'],
            'surface' => ['sometimes', 'string', Rule::in(self::VALID_SURFACES)],
            'capability' => ['sometimes', 'string', Rule::in(self::VALID_CAPABILITIES)],
            'aspect' => ['sometimes', 'string', Rule::in(self::VALID_ASPECTS)],
            'length' => ['sometimes', 'integer', 'min:1', 'max:120'],
            'voice' => ['sometimes', 'string', 'max:100'],
            'style' => ['sometimes', 'string', 'max:100'],
            'mood' => ['sometimes', 'string', 'max:100'],
            'camera' => ['sometimes', 'string', 'max:100'],
            'image' => ['sometimes', 'string', 'max:2048'],
            'last_frame' => ['sometimes', 'string', 'max:2048'],
            'negative_prompt' => ['sometimes', 'string', 'max:500'],
        ]);
        if ($validationError) return $validationError;

        $user = $request->user();
        $plan = $user->plan;

        // Content moderation + daily render cap — a retry kicks off a fresh generation,
        // so it must pass the same safety guards as the initial generate.
        if ($safetyError = $this->guardGenerationSafety($request)) {
            return $safetyError;
        }

        if (!$plan) {
            return response()->json(['error' => 'No active plan'], 403);
        }

        // Check per-project concurrent limit: only 1 active job per project
        $activeProjectJobs = RenderJob::where('daemon_project_id', $id)
            ->whereIn('status', ['queued', 'processing'])
            ->count();
        if ($activeProjectJobs > 0) {
            return response()->json(['error' => 'Tác vụ trước vẫn đang chạy. Vui lòng đợi hoặc xoá project để tạo mới.'], 429);
        }

        // Check user-level concurrent limit from plan
        $activeJobs = $user->renderJobs()
            ->whereIn('status', ['queued', 'processing'])
            ->count();
        if ($plan->max_concurrent_jobs !== null && $activeJobs >= $plan->max_concurrent_jobs) {
            return response()->json(['error' => "Bạn đang có {$activeJobs} tác vụ, tối đa là {$plan->max_concurrent_jobs}"], 403);
        }

        // Cap total attempts (initial generate + retries) per project. Credits are
        // refunded on failure, so without this a failing project could be retried
        // for free indefinitely — wasting daemon/provider resources each time.
        $maxAttempts = (int) config('daemon.max_attempts_per_project', 5);
        if (RenderJob::where('daemon_project_id', $id)->count() >= $maxAttempts) {
            return response()->json([
                'error' => "Đã đạt giới hạn {$maxAttempts} lần tạo/thử cho dự án này. Vui lòng tạo dự án mới.",
            ], 429);
        }

        $extras = [];
        $surface = $request->input('surface', 'video');
        $capability = $request->input('capability', 't2v');
        $tierCode = $plan->isFree() ? 'standard' : 'premium';
        $videoTypeCode = match ($surface) {
            'image' => ($request->filled('image') || $request->hasFile('image') || $request->filled('images') || $request->hasFile('images')) ? 'image_editing' : 'image_generation',
            'audio' => 'text_to_video',
            default => $capability === 'i2v' ? 'image_to_video'
                : ($capability === 'r2v' ? 'reference_to_video'
                : ($capability === 'video-edit' ? 'video_editing'
                : ($capability === 'character-anim' ? 'character_animation'
                : 'text_to_video'))),
        };

        $extras = [];
        if ($request->filled('voice') || $request->boolean('autoVoiceover') || $request->filled('voiceover')) {
            $extras[] = 'voice_over';
        }

        if ($surface === 'image') {
            $cost = $this->creditCalculator->calculateImage(
                $request->filled('image') || $request->hasFile('image') || $request->filled('images') || $request->hasFile('images')
            );
        } else {
            $cost = $this->creditCalculator->calculate(
                (int) ($request->input('length') ?? 5),
                $request->input('resolution', '720p'),
                $extras,
                $videoTypeCode
            );
        }

        $resolvedModel = $request->input('model') ?: $this->modelSelector->resolve($tierCode, $videoTypeCode);

        // Same edit-capability guard as generateMedia() — block edit actions routed
        // into a t2i-only model before reserving credits.
        if ($editGuard = $this->guardImageEditCapability($surface, $capability, $videoTypeCode, $resolvedModel)) {
            return $editGuard;
        }

        $image = $request->input('image');
        $lastFrame = $request->input('last_frame');
        $imagesList = $request->input('images', []);
        $videoRef = $request->input('videoRef');

        $allRefs = array_merge([$image, $lastFrame, $videoRef], is_array($imagesList) ? $imagesList : []);
        $referenceImages = array_values(array_filter($allRefs));

        $job = RenderJob::create([
            'uuid' => Str::uuid(),
            'user_id' => $user->id,
            'status' => 'created',
            'prompt' => $request->input('prompt', ''),
            'title' => mb_substr($request->input('prompt', ''), 0, 100),
            'model' => $resolvedModel,
            'duration_seconds' => (int) ($request->input('length') ?? 5),
            'aspect_ratio' => $request->input('aspect', '16:9'),
            'resolution' => $request->input('resolution', '720p'),
            'credits_cost' => $cost,
            'plan_snapshot' => $plan->toSnapshot(),
            'daemon_project_id' => $id,
            'capability' => $capability,
            'reference_images' => !empty($referenceImages) ? $referenceImages : null,
        ]);

        $creditService = app(CreditService::class);
        if (!$creditService->reserve($user, $cost, $job)) {
            $job->delete();
            return response()->json(['error' => 'Không đủ credits. Vui lòng nạp thêm.'], 402);
        }

        $safeData = $request->only([
            'surface', 'capability', 'prompt', 'aspect', 'length',
            'duration', 'duration_seconds', 'resolution', 'voice', 'style',
            'mood', 'camera', 'lighting', 'negative_prompt', 'direction',
            'image', 'last_frame', 'audioKind', 'language', 'loop',
            'promptInfluence', 'compositionDir', 'output', 'seed',
            'voiceover', 'voiceModelId', 'autoVoiceover',
            'images', 'referenceImages', 'videoRef', 'mode',
        ]);
        $safeData['model'] = $resolvedModel;
        $safeData['render_job_uuid'] = $job->uuid;
        $safeData['metadata'] = [
            'callbackUrl' => config('daemon.callback_url'),
            'render_job_uuid' => $job->uuid,
        ];

        $proxyResponse = $this->proxy('POST', "media/projects/{$id}/media/generate", $request, $safeData);

        if ($proxyResponse->status() >= 400) {
            $creditService->releaseReserved($job);
            $job->update(['status' => 'failed']);
            $this->cleanupDaemonProject($id);
            broadcast(new JobFailed($job));
        } else {
            $job->update(['status' => 'queued', 'daemon_task_id' => $proxyResponse->getData()->taskId ?? null]);
        }

        return $proxyResponse;
    }

    public function destroyProject(Request $request, string $id)
    {
        $user = $request->user();

        if (!preg_match('/^[A-Za-z0-9._-]+$/', $id)) {
            return response()->json(['error' => 'Invalid project ID'], 400);
        }

        // Delete from daemon first
        $daemonResponse = $this->proxy('DELETE', "projects/{$id}", $request);

        // Delete RenderJobs & Assets belonging to this user
        $jobs = RenderJob::where('user_id', $user->id)
            ->where('daemon_project_id', $id)
            ->get();

        foreach ($jobs as $job) {
            foreach ($job->assets as $asset) {
                foreach (['s3', 's3-external'] as $disk) {
                    if (!empty(config("filesystems.disks.{$disk}.key"))) {
                        try { Storage::disk($disk)->delete($asset->path); } catch (\Exception) {}
                    }
                }
                $asset->delete();
            }
            $job->delete();
        }

        Log::info('Project deleted', ['user_id' => $user->id, 'project_id' => $id]);

        return response()->json(['success' => true]);
    }

    public function version(Request $request)
    {
        return $this->proxy('GET', 'version', $request);
    }

    public function status(Request $request)
    {
        return $this->proxy('GET', 'daemon/status', $request);
    }

    public function models(Request $request)
    {
        $response = $this->proxy('GET', 'media/models', $request);
        $data = $response->getData(true);

        // Override video lengths with admin-configured DurationTiers
        $durations = DurationTier::active()
            ->orderBy('seconds')
            ->pluck('seconds')
            ->toArray();

        if (!empty($durations) && is_array($data)) {
            $data['videoLengthsSec'] = $durations;
            $response->setData($data);
        }

        return $response;
    }

    public function skills(Request $request)
    {
        return $this->proxy('GET', 'media/skills', $request);
    }

    /**
     * Per-skill community stats (usage / likes / published counts) for the studio to
     * rank popular skills first. Optional ?skill_ids=a,b,c filters to a specific set;
     * omitted → all skills that have any signal. Returned as a { skill_id: {...} } map
     * so the frontend can merge/sort its skill list without extra lookups.
     */
    public function skillStats(Request $request)
    {
        $raw = $request->input('skill_ids');
        $skillIds = [];
        if (is_string($raw) && $raw !== '') {
            $skillIds = array_values(array_filter(array_map('trim', explode(',', $raw))));
        } elseif (is_array($raw)) {
            $skillIds = array_values(array_filter(array_map('trim', $raw)));
        }

        return response()->json([
            'success' => true,
            'data' => app(\App\Services\SkillStatsService::class)->statsFor($skillIds),
        ]);
    }

    public function getMediaConfig(Request $request)
    {
        return $this->proxy('GET', 'media/config', $request);
    }

    public function updateMediaConfig(Request $request)
    {
        return $this->proxy('PUT', 'media/config', $request);
    }

    public function listProjects(Request $request)
    {
        return $this->proxy('GET', 'projects', $request);
    }

    public function createProject(Request $request)
    {
        $validationError = $this->validateDaemonRequest($request, [
            'name' => ['sometimes', 'string', 'max:255'],
            'surface' => ['sometimes', 'string', Rule::in(self::VALID_SURFACES)],
            'skillId' => ['sometimes', 'string', 'max:255'],
            'metadata' => ['sometimes', 'array'],
            'metadata.name' => ['sometimes', 'string', 'max:255'],
        ]);
        if ($validationError) return $validationError;

        // Check conditions BEFORE creating project on daemon
        $user = $request->user();
        $plan = $user->plan;

        if (!$plan) {
            return response()->json(['error' => 'No active plan'], 403);
        }

        $surface = $request->input('surface', 'video');
        $isPremium = $plan && !$plan->isFree();

        // Audio requires premium
        if ($surface === 'audio' && !$isPremium) {
            return response()->json(['error' => 'Gói của bạn không hỗ trợ tạo âm thanh. Vui lòng nâng cấp lên Pro.'], 403);
        }

        // Project count limit (prevent spam) — for non-temp projects only
        // Concurrent job limit is checked in generateMedia() instead, to allow multi-scene project creation
        if (!$request->input('_temp', false)) {
            $maxProjects = (int) config('daemon.max_projects_per_user', 50);
            $userId = (string) $user->id;
            $signature = hash_hmac('sha256', $userId, config('daemon.webhook_secret'));
            try {
                $projects = Http::timeout(10)
                    ->withHeaders(['X-User-Id' => $userId, 'X-Daemon-Signature' => $signature])
                    ->get("{$this->baseUrl}/api/projects")
                    ->json('projects') ?? [];
                if (count($projects) >= $maxProjects) {
                    return response()->json(['error' => "Đã đạt giới hạn {$maxProjects} projects. Vui lòng xoá project cũ."], 403);
                }
            } catch (\Throwable) {
                // Daemon unreachable — allow creation (rate limiting will catch abuse)
            }
        }

        $response = $this->proxy('POST', 'projects', $request);
        $data = $response->getData(true);
        unset($data['resolvedDir']);
        if (isset($data['project']['uuid']) && !isset($data['project']['id'])) {
            $data['project']['id'] = $data['project']['uuid'];
        }

        // Skill attribution bridge: the studio only sends skillId at project-creation time,
        // but the signal we want lives on the render. Stash it keyed by the new project id
        // so generateMedia() can attach it to the RenderJob it creates for this project.
        $skillId = $request->input('skillId');
        $projectId = $data['project']['id'] ?? null;
        if (is_string($skillId) && trim($skillId) !== '' && $skillId !== 'none' && is_string($projectId) && $projectId !== '') {
            \Illuminate\Support\Facades\Cache::put("project_skill:{$projectId}", trim($skillId), now()->addHours(6));
        }

        $response->setData($data);
        return $response;
    }

    public function getProject(Request $request, string $id)
    {
        if (!preg_match('/^[A-Za-z0-9._-]+$/', $id)) {
            return response()->json(['error' => 'Invalid project ID'], 400);
        }
        return $this->proxy('GET', "projects/{$id}", $request);
    }

    public function updateProject(Request $request, string $id)
    {
        if (!preg_match('/^[A-Za-z0-9._-]+$/', $id)) {
            return response()->json(['error' => 'Invalid project ID'], 400);
        }
        return $this->proxy('PATCH', "projects/{$id}", $request);
    }

    public function listFiles(Request $request, string $id)
    {
        if (!preg_match('/^[A-Za-z0-9._-]+$/', $id)) {
            return response()->json(['error' => 'Invalid project ID'], 400);
        }
        return $this->proxy('GET', "projects/{$id}/files", $request);
    }

    public function uploadFile(Request $request, string $id)
    {
        if (!preg_match('/^[A-Za-z0-9._-]+$/', $id)) {
            return response()->json(['error' => 'Invalid project ID'], 400);
        }

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $mimeType = $file->getMimeType();
            if (!in_array($mimeType, self::ALLOWED_UPLOAD_MIMES)) {
                return response()->json(['error' => "File type {$mimeType} not allowed"], 422);
            }
            if ($file->getSize() > 50 * 1024 * 1024) {
                return response()->json(['error' => 'File too large. Max 50MB.'], 422);
            }
        }

        $url = "{$this->baseUrl}/api/projects/{$id}/upload";

        try {
            $headers = ['Accept' => 'application/json'];
            if ($request->user()) {
                $userId = (string) $request->user()->id;
                $headers['X-User-Id'] = $userId;
                $headers['X-Daemon-Signature'] = hash_hmac('sha256', $userId, config('daemon.webhook_secret'));
            }
            $http = Http::timeout(120)->withHeaders($headers);

            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $http = $http->attach(
                    'file',
                    fopen($file->path(), 'r'),
                    $file->getClientOriginalName(),
                    ['Content-Type' => $file->getMimeType()]
                );
            }

            foreach ($request->except('file') as $key => $value) {
                $http = $http->attach($key, (string) $value);
            }

            $response = $http->post($url);

            return response($response->body(), $response->status())
                ->header('Content-Type', $response->header('Content-Type') ?? 'application/json');
        } catch (ConnectionException $e) {
            Log::warning("Daemon unreachable: {$url}", ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Daemon service unavailable'], 503);
        }
    }

    public function getRawFile(Request $request, string $id, string $path)
    {
        if (!preg_match('/^[A-Za-z0-9._-]+$/', $id)) {
            return response()->json(['error' => 'Invalid project ID'], 400);
        }

        // IDOR guard: scope the asset lookup to the requesting user, and escape LIKE
        // wildcards in the untrusted $path so a crafted path can't broaden the match.
        $escapedPath = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $path);
        $asset = \App\Models\Asset::where('user_id', $request->user()->id)
            ->where('path', 'LIKE', "%/{$id}/%{$escapedPath}")
            ->first();
        if ($asset) {
            $localPath = storage_path("app/{$asset->path}");
            if (!file_exists($localPath)) {
                return redirect()->away($asset->signedUrl());
            }
            // Serve local file (S3 MinIO / R2 fallback via storage)
            return response()->file($localPath, [
                'Content-Type' => $asset->mime_type ?? 'application/octet-stream',
                'Content-Disposition' => 'inline',
                'X-Content-Type-Options' => 'nosniff',
            ]);
        }

        // Stream daemon raw file directly (not through proxy which returns JSON)
        try {
            $url = "{$this->baseUrl}/api/projects/{$id}/raw/{$path}";
            $headers = ['Accept' => '*/*'];
            if ($request->user()) {
                $headers['X-User-Id'] = (string) $request->user()->id;
                $headers['X-Daemon-Signature'] = hash_hmac('sha256', (string) $request->user()->id, config('daemon.webhook_secret'));
            }
            $response = Http::timeout(30)->withHeaders($headers)->get($url);
            $contentType = $response->header('Content-Type') ?? 'application/octet-stream';
            return response($response->body(), $response->status())
                ->header('Content-Type', $contentType)
                ->header('Content-Disposition', 'inline')
                ->header('X-Content-Type-Options', 'nosniff');
        } catch (\Exception $e) {
            return response()->json(['error' => 'File not found'], 404);
        }
    }

    public function getTask(Request $request, string $taskId)
    {
        if (!preg_match('/^[A-Za-z0-9._-]+$/', $taskId)) {
            return response()->json(['error' => 'Invalid task ID'], 400);
        }
        return $this->proxy('GET', "media/tasks/{$taskId}", $request);
    }

    public function listTasks(Request $request, string $id)
    {
        if (!preg_match('/^[A-Za-z0-9._-]+$/', $id)) {
            return response()->json(['error' => 'Invalid project ID'], 400);
        }
        return $this->proxy('GET', "media/projects/{$id}/media/tasks", $request);
    }

    public function waitTask(Request $request, string $taskId)
    {
        if (!preg_match('/^[A-Za-z0-9._-]+$/', $taskId)) {
            return response()->json(['error' => 'Invalid task ID'], 400);
        }
        return $this->proxy('POST', "media/tasks/{$taskId}/wait", $request);
    }

    public function cancelTask(Request $request, string $taskId)
    {
        if (!preg_match('/^[A-Za-z0-9._-]+$/', $taskId)) {
            return response()->json(['error' => 'Invalid task ID'], 400);
        }
        return $this->proxy('POST', "media/tasks/{$taskId}/cancel", $request);
    }

    public function voices(Request $request)
    {
        return $this->proxy('GET', 'media/providers/elevenlabs/voices', $request);
    }

    public function allVoices(Request $request)
    {
        return $this->proxy('GET', 'media/voices', $request);
    }

    public function ttsPreview(Request $request)
    {
        $validationError = $this->validateDaemonRequest($request, [
            'voice' => ['sometimes', 'string', 'max:100'],
            'text' => ['sometimes', 'string', 'max:500'],
        ]);
        if ($validationError) return $validationError;

        return $this->proxy('POST', 'media/tts-preview', $request);
    }
}

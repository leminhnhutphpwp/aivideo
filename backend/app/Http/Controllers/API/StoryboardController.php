<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Storyboard;
use App\Models\StoryboardReference;
use App\Models\StoryboardScene;
use App\Rules\ValidStoryboardType;
use App\Services\AiPromptCompiler;
use App\Services\AiStoryboardService;
use App\Services\ContentFilterService;
use App\Services\CreditService;
use App\Services\DaemonClient;
use App\Services\RenderQuotaService;
use App\Services\StoryboardAnalyzer;
use App\Services\StoryboardRenderer;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Support\ErrorSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class StoryboardController extends Controller
{
    public function __construct(
        protected CreditService $creditService,
        protected DaemonClient $daemonClient,
        protected StoryboardRenderer $storyboardRenderer,
        protected StoryboardAnalyzer $storyboardAnalyzer,
        protected AiPromptCompiler $aiPromptCompiler,
        protected ContentFilterService $contentFilter,
        protected RenderQuotaService $renderQuota,
    ) {
        $this->middleware('auth:api');
    }

    /**
     * Moderate all user-authored text on a storyboard payload (title, description, and every
     * scene prompt / narration / negative prompt). Returns a 422 response to short-circuit the
     * caller when unsafe content is found, or null when clean. Never reveals the matched term.
     */
    private function guardContent(Request $request): ?JsonResponse
    {
        $parts = [
            (string) $request->input('title'),
            (string) $request->input('description'),
            (string) $request->input('narration'),
        ];

        // Note: scene negative_prompt is intentionally NOT moderated — negative prompts list
        // concepts to EXCLUDE from output (e.g. "nude, nsfw"), which is legitimate.
        foreach ((array) $request->input('scenes', []) as $scene) {
            $parts[] = (string) ($scene['prompt'] ?? '');
            $parts[] = (string) ($scene['narration'] ?? '');
        }

        $text = trim(implode(' ', array_filter($parts)));

        if ($text !== '' && $this->contentFilter->containsProhibitedContent($text)) {
            Log::warning('Storyboard content blocked by filter', [
                'user_id' => auth('api')->id(),
                'term' => $this->contentFilter->getProhibitedTerm($text),
            ]);

            return response()->json([
                'message' => 'Nội dung mô tả vi phạm tiêu chuẩn an toàn của nền tảng. Vui lòng chỉnh sửa và thử lại.',
            ], 422);
        }

        return null;
    }

    /**
     * Log the real (possibly technical/English) failure for admins & agents, and return a
     * single generic Vietnamese message to the user. Use for any system/technical 5xx so we
     * never surface raw exceptions, daemon errors, or provider details to end users.
     */
    private function systemError(string $context, ?\Throwable $e = null, array $logExtra = [], int $status = 500): JsonResponse
    {
        Log::error($context, array_merge(['error' => $e?->getMessage()], $logExtra));

        return response()->json(['message' => ErrorSanitizer::GENERIC], $status);
    }

    public function index(Request $request): JsonResponse
    {
        $query = $request->user()->storyboards()
            ->withCount('scenes')
            ->orderBy('created_at', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $storyboards = $query->paginate($request->per_page ?? 20);

        return response()->json($storyboards);
    }

    /**
     * Whether the "Ghép cảnh" (multi_scene) render mode is enabled. Temporarily DISABLED for
     * the initial launch — see config/storyboard.php → multi_scene_enabled and worklog
     * 2026-06-23-disable-multi-scene.md for the re-enable checklist.
     */
    private function multiSceneEnabled(): bool
    {
        return (bool) config('storyboard.multi_scene_enabled', false);
    }

    /**
     * Reject a disabled render mode. Returns a 422 response to short-circuit the caller, or
     * null when the mode is allowed. Guards store / update / render so a crafted API call
     * can't bypass the UI gate while multi_scene is off.
     */
    private function guardRenderMode(?string $renderMode): ?JsonResponse
    {
        if ($renderMode === 'multi_scene' && ! $this->multiSceneEnabled()) {
            return response()->json([
                'message' => 'Tính năng Ghép cảnh đang được hoàn thiện và sẽ sớm ra mắt. Vui lòng dùng One-Shot hoặc Multi-Panel.',
            ], 422);
        }

        return null;
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'video_type' => ['required', 'string', new ValidStoryboardType],
            'voice_mood' => 'nullable|string|in:energetic,calm,professional,friendly,dramatic',
            'background_music' => 'nullable|string',
            'voice' => 'nullable|string',
            'style_guide' => 'nullable|array',
            'render_mode' => 'nullable|string|in:multi_scene,single_flow,storyboard_image',
            'total_duration' => 'nullable|integer|min:3|max:120',
            'compiled_prompt' => 'nullable|string',
            'camera_movement' => 'nullable|string',
            'style' => 'nullable|string',
            'mood' => 'nullable|string',
            'lighting' => 'nullable|string',
            'narration' => 'nullable|string',
            'driving_audio' => 'nullable|string',
            'first_frame_image' => 'nullable|string',
            'last_frame_image' => 'nullable|string',
            'shot_type' => 'nullable|string|in:single,multi',
            'multi_panel_image' => 'nullable|string',
            'scenes' => 'required|array|min:1|max:20',
            'scenes.*._key' => 'nullable|string',
            'scenes.*.parent_key' => 'nullable|string',
            'scenes.*.edge_label' => 'nullable|string|max:255',
            'scenes.*.position_x' => 'nullable|numeric',
            'scenes.*.position_y' => 'nullable|numeric',
            'scenes.*.prompt' => 'required|string',
            'scenes.*.duration_seconds' => 'required|integer|min:3|max:30',
            'scenes.*.camera_movement' => 'nullable|string',
            'scenes.*.lighting' => 'nullable|string',
            'scenes.*.style' => 'nullable|string',
            'scenes.*.mood' => 'nullable|string',
            'scenes.*.negative_prompt' => 'nullable|string',
            'scenes.*.reference_image' => 'nullable|string',
            'scenes.*.last_frame_image' => 'nullable|string',
            'scenes.*.narration' => 'nullable|string',
            'scenes.*.seed' => 'nullable|integer',
            'scenes.*.aspect_ratio' => 'required|string|in:16:9,9:16,1:1,4:3',
            'scenes.*.resolution' => 'required|string|in:720p,1080p',
            'references' => 'nullable|array',
            'references.*.type' => 'required_with:references|string|in:character,product,background',
            'references.*.media_path' => 'required_with:references|string',
            'references.*.description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
            ], 400);
        }

        if ($resp = $this->guardRenderMode($request->render_mode)) {
            return $resp;
        }

        if ($resp = $this->guardContent($request)) {
            return $resp;
        }

        $user = $request->user();
        $plan = $user->plan;
        $isPremium = $plan && ! $plan->isFree();

        if (! $isPremium) {
            if ($request->filled('voice_mood') || $request->filled('voice') || $request->filled('background_music')) {
                return response()->json(['message' => 'Gói của bạn không hỗ trợ giọng đọc. Vui lòng nâng cấp lên Pro.'], 403);
            }
            // Top-level narration (persisted for single_flow/storyboard_image) must be gated too —
            // free users default to single_flow, so without this they'd bypass the premium check.
            if ($request->filled('narration')) {
                return response()->json(['message' => 'Gói của bạn không hỗ trợ thuyết minh (narration). Vui lòng nâng cấp lên Pro.'], 403);
            }
            if ($request->filled('references')) {
                return response()->json(['message' => 'Gói của bạn không hỗ trợ tham chiếu (references). Vui lòng nâng cấp lên Pro.'], 403);
            }
            foreach ($request->scenes ?? [] as $sceneData) {
                if (! empty($sceneData['narration'])) {
                    return response()->json(['message' => 'Gói của bạn không hỗ trợ thuyết minh (narration). Vui lòng nâng cấp lên Pro.'], 403);
                }
                if (! empty($sceneData['reference_image'])) {
                    return response()->json(['message' => 'Gói của bạn không hỗ trợ ảnh tham chiếu trong cảnh. Vui lòng nâng cấp lên Pro.'], 403);
                }
            }
        }

        DB::beginTransaction();

        try {
            $storyboard = Storyboard::create([
                'user_id' => $user->id,
                'title' => $request->title,
                'description' => $request->description,
                'video_type' => $request->video_type,
                'quality_tier' => $user->plan->getQualityTierCode(),
                'voice_mood' => $request->voice_mood,
                'background_music' => $request->background_music,
                'voice' => $request->voice,
                'style_guide' => $request->style_guide,
                // multi_scene is disabled for launch — default new storyboards to One-Shot.
                'render_mode' => $request->render_mode ?? ($this->multiSceneEnabled() ? 'multi_scene' : 'single_flow'),
                'total_duration' => $request->total_duration,
                'compiled_prompt' => $request->compiled_prompt,
                'camera_movement' => in_array($request->render_mode, ['single_flow', 'storyboard_image']) ? $request->camera_movement : null,
                'style' => in_array($request->render_mode, ['single_flow', 'storyboard_image']) ? $request->style : null,
                'mood' => in_array($request->render_mode, ['single_flow', 'storyboard_image']) ? $request->mood : null,
                'lighting' => in_array($request->render_mode, ['single_flow', 'storyboard_image']) ? $request->lighting : null,
                'narration' => in_array($request->render_mode, ['single_flow', 'storyboard_image']) ? $request->narration : null,
                'driving_audio' => in_array($request->render_mode, ['single_flow', 'storyboard_image']) ? $request->driving_audio : null,
                'first_frame_image' => $request->render_mode === 'single_flow' ? $request->first_frame_image : null,
                'last_frame_image' => $request->render_mode === 'single_flow' ? $request->last_frame_image : null,
                'shot_type' => in_array($request->render_mode, ['single_flow', 'storyboard_image']) ? $request->shot_type : null,
                'multi_panel_image' => in_array($request->render_mode, ['single_flow', 'storyboard_image']) ? $request->multi_panel_image : null,
                'status' => 'draft',
            ]);

            $tempToId = [];

            foreach ($request->scenes as $index => $sceneData) {
                $scene = StoryboardScene::create([
                    'storyboard_id' => $storyboard->id,
                    'scene_number' => $index + 1,
                    'prompt' => $sceneData['prompt'],
                    'duration_seconds' => $sceneData['duration_seconds'],
                    'camera_movement' => $sceneData['camera_movement'] ?? null,
                    'lighting' => $sceneData['lighting'] ?? null,
                    'style' => $sceneData['style'] ?? null,
                    'mood' => $sceneData['mood'] ?? null,
                    'negative_prompt' => $sceneData['negative_prompt'] ?? null,
                    'reference_image' => $sceneData['reference_image'] ?? null,
                    'last_frame_image' => $sceneData['last_frame_image'] ?? null,
                    'narration' => $sceneData['narration'] ?? null,
                    'aspect_ratio' => $sceneData['aspect_ratio'],
                    'resolution' => $sceneData['resolution'],
                    'seed' => $sceneData['seed'] ?? null,
                    'position_x' => $sceneData['position_x'] ?? ($index * 300),
                    'position_y' => $sceneData['position_y'] ?? 200,
                    'status' => 'pending',
                ]);

                $tempKey = $sceneData['_key'] ?? null;
                if ($tempKey) {
                    $tempToId[$tempKey] = $scene->id;
                }
            }

            // Second pass: set parent relationships and validate no cycles
            foreach ($request->scenes as $sceneData) {
                $parentKey = $sceneData['parent_key'] ?? null;
                $childKey = $sceneData['_key'] ?? null;
                if ($parentKey && $childKey && isset($tempToId[$parentKey]) && isset($tempToId[$childKey])) {
                    $childId = $tempToId[$childKey];
                    $parentId = $tempToId[$parentKey];
                    if (StoryboardScene::wouldCreateCycle($storyboard->id, $childId, $parentId)) {
                        DB::rollBack();

                        return response()->json(['message' => 'Phát hiện vòng lặp trong sơ đồ cảnh'], 422);
                    }
                    StoryboardScene::where('id', $childId)->update([
                        'parent_scene_id' => $parentId,
                        'edge_label' => $sceneData['edge_label'] ?? null,
                    ]);
                }
            }

            if ($request->filled('references')) {
                foreach ($request->references as $index => $refData) {
                    StoryboardReference::create([
                        'storyboard_id' => $storyboard->id,
                        'type' => $refData['type'],
                        'media_path' => $refData['media_path'],
                        'description' => $refData['description'] ?? null,
                        'sort_order' => $index,
                    ]);
                }
            }

            $storyboard->updateCreditsCost();

            if (! $this->creditService->reserve($user, $storyboard->credits_cost, null, $storyboard)) {
                DB::rollBack();

                return response()->json([
                    'message' => "Không đủ credits. Cần {$storyboard->credits_cost} credits nhưng bạn chỉ có {$user->credits} credits.",
                    'required' => $storyboard->credits_cost,
                    'available' => $user->credits,
                ], 402);
            }

            DB::commit();

            return response()->json([
                'data' => $storyboard->load(['scenes', 'references']),
            ], 201);

        } catch (\Throwable $e) {
            DB::rollBack();

            return $this->systemError('Failed to create storyboard', $e);
        }
    }

    public function update(Request $request, Storyboard $storyboard): JsonResponse
    {
        if ($storyboard->user_id !== auth('api')->id()) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện thao tác này'], 403);
        }

        if ($storyboard->status !== 'draft') {
            return response()->json([
                'message' => 'Chỉ sửa được storyboard ở trạng thái nháp',
                'current_status' => $storyboard->status,
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'video_type' => ['sometimes', 'required', 'string', new ValidStoryboardType],
            'voice_mood' => 'nullable|string|in:energetic,calm,professional,friendly,dramatic',
            'background_music' => 'nullable|string',
            'voice' => 'nullable|string',
            'style_guide' => 'nullable|array',
            'render_mode' => 'nullable|string|in:multi_scene,single_flow,storyboard_image',
            'total_duration' => 'nullable|integer|min:3|max:120',
            'camera_movement' => 'nullable|string',
            'style' => 'nullable|string',
            'mood' => 'nullable|string',
            'lighting' => 'nullable|string',
            'narration' => 'nullable|string',
            'driving_audio' => 'nullable|string',
            'first_frame_image' => 'nullable|string',
            'last_frame_image' => 'nullable|string',
            'shot_type' => 'nullable|string|in:single,multi',
            'multi_panel_image' => 'nullable|string',
            'scenes' => 'sometimes|required|array|min:1|max:20',
            'scenes.*.id' => 'nullable|integer|exists:storyboard_scenes,id',
            'scenes.*._key' => 'nullable|string',
            'scenes.*.parent_key' => 'nullable|string',
            'scenes.*.edge_label' => 'nullable|string|max:255',
            'scenes.*.position_x' => 'nullable|numeric',
            'scenes.*.position_y' => 'nullable|numeric',
            'scenes.*.prompt' => 'required_with:scenes|string',
            'scenes.*.duration_seconds' => 'required_with:scenes|integer|min:3|max:30',
            'scenes.*.camera_movement' => 'nullable|string',
            'scenes.*.lighting' => 'nullable|string',
            'scenes.*.style' => 'nullable|string',
            'scenes.*.mood' => 'nullable|string',
            'scenes.*.negative_prompt' => 'nullable|string',
            'scenes.*.reference_image' => 'nullable|string',
            'scenes.*.last_frame_image' => 'nullable|string',
            'scenes.*.narration' => 'nullable|string',
            'scenes.*.aspect_ratio' => 'required_with:scenes|string|in:16:9,9:16,1:1,4:3',
            'scenes.*.resolution' => 'required_with:scenes|string|in:720p,1080p',
            'references' => 'nullable|array',
            'references.*.type' => 'required_with:references|string|in:character,product,background',
            'references.*.media_path' => 'required_with:references|string',
            'references.*.description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
            ], 400);
        }

        if ($resp = $this->guardRenderMode($request->render_mode)) {
            return $resp;
        }

        if ($resp = $this->guardContent($request)) {
            return $resp;
        }

        // Mirror store()'s narration gate — update() also persists narration (top-level for
        // single_flow/storyboard_image, per-scene for multi_scene). Without this a free user
        // could bypass the "không hỗ trợ thuyết minh" restriction by editing a draft.
        $user = $request->user();
        $plan = $user->plan;
        $isPremium = $plan && ! $plan->isFree();

        if (! $isPremium) {
            if ($request->filled('narration')) {
                return response()->json(['message' => 'Gói của bạn không hỗ trợ thuyết minh (narration). Vui lòng nâng cấp lên Pro.'], 403);
            }
            foreach ($request->scenes ?? [] as $sceneData) {
                if (! empty($sceneData['narration'])) {
                    return response()->json(['message' => 'Gói của bạn không hỗ trợ thuyết minh (narration). Vui lòng nâng cấp lên Pro.'], 403);
                }
            }
        }

        DB::beginTransaction();

        try {
            $storyboard->update($request->only([
                'title', 'description', 'video_type', 'quality_tier',
                'voice_mood', 'background_music', 'voice', 'style_guide',
                'render_mode', 'total_duration', 'compiled_prompt',
                'camera_movement', 'style', 'mood', 'lighting', 'narration', 'driving_audio',
                'first_frame_image', 'last_frame_image',
                'shot_type', 'multi_panel_image',
            ]));

            // A panel image the user supplied is theirs → visible (clear the auto-gen flag,
            // which may have been set by a prior render-time auto-generation).
            if ($request->filled('multi_panel_image')) {
                $storyboard->update(['multi_panel_auto_generated' => false]);
            }

            if ($request->has('scenes')) {
                $existingIds = $storyboard->scenes()->pluck('id')->toArray();
                $incomingIds = collect($request->scenes)->pluck('id')->filter()->toArray();
                $toDelete = array_diff($existingIds, $incomingIds);
                if (! empty($toDelete)) {
                    StoryboardScene::whereIn('id', $toDelete)->delete();
                }

                $tempToId = [];
                $sceneKeyMap = []; // maps request index → scene

                // Phase 1: Set all scene_numbers to temporary negative values to avoid unique constraint
                $existingScenes = $storyboard->scenes()->get();
                foreach ($existingScenes as $existingScene) {
                    StoryboardScene::where('id', $existingScene->id)->update([
                        'scene_number' => -$existingScene->id,
                    ]);
                }

                // Phase 2: Create/update scenes with correct scene_numbers
                foreach ($request->scenes as $index => $sceneData) {
                    $baseData = [
                        'storyboard_id' => $storyboard->id,
                        'scene_number' => $index + 1,
                        'prompt' => $sceneData['prompt'],
                        'duration_seconds' => $sceneData['duration_seconds'],
                        'camera_movement' => $sceneData['camera_movement'] ?? null,
                        'lighting' => $sceneData['lighting'] ?? null,
                        'style' => $sceneData['style'] ?? null,
                        'mood' => $sceneData['mood'] ?? null,
                        'negative_prompt' => $sceneData['negative_prompt'] ?? null,
                        'reference_image' => $sceneData['reference_image'] ?? null,
                        'last_frame_image' => $sceneData['last_frame_image'] ?? null,
                        'narration' => $sceneData['narration'] ?? null,
                        'aspect_ratio' => $sceneData['aspect_ratio'] ?? '16:9',
                        'resolution' => $sceneData['resolution'] ?? '720p',
                        'seed' => $sceneData['seed'] ?? null,
                        'position_x' => $sceneData['position_x'] ?? ($index * 300),
                        'position_y' => $sceneData['position_y'] ?? 200,
                        'status' => 'pending',
                    ];

                    if (! empty($sceneData['id'])) {
                        $scene = StoryboardScene::where('id', $sceneData['id'])
                            ->where('storyboard_id', $storyboard->id)->first();
                        if ($scene) {
                            $scene->update($baseData);
                        }
                    } else {
                        $scene = StoryboardScene::create($baseData);
                    }

                    $tempKey = $sceneData['_key'] ?? null;
                    if ($tempKey && $scene) {
                        $tempToId[$tempKey] = $scene->id;
                    }
                    $sceneKeyMap[$index] = ['scene' => $scene, 'data' => $sceneData];
                }

                // Phase 3: Set parent relationships
                foreach ($sceneKeyMap as $info) {
                    $scene = $info['scene'] ?? null;
                    $sceneData = $info['data'];
                    $parentKey = $sceneData['parent_key'] ?? null;
                    $childKey = $sceneData['_key'] ?? null;
                    if ($parentKey && $childKey && $scene && isset($tempToId[$parentKey], $tempToId[$childKey])) {
                        $childId = $tempToId[$childKey];
                        $parentId = $tempToId[$parentKey];
                        if (StoryboardScene::wouldCreateCycle($storyboard->id, $childId, $parentId)) {
                            DB::rollBack();

                            return response()->json(['message' => 'Phát hiện vòng lặp trong sơ đồ cảnh'], 422);
                        }
                        $scene->update([
                            'parent_scene_id' => $parentId,
                            'edge_label' => $sceneData['edge_label'] ?? null,
                        ]);
                    }
                }
            }

            if ($request->has('references')) {
                $storyboard->references()->delete();
                foreach ($request->references as $index => $refData) {
                    StoryboardReference::create([
                        'storyboard_id' => $storyboard->id,
                        'type' => $refData['type'],
                        'media_path' => $refData['media_path'],
                        'description' => $refData['description'] ?? null,
                        'sort_order' => $index,
                    ]);
                }
            }

            $oldCost = $storyboard->credits_cost;
            $storyboard->updateCreditsCost();

            if ($storyboard->credits_cost !== $oldCost) {
                $this->creditService->releaseStoryboardReserved($storyboard);
                if (! $this->creditService->reserve($request->user(), $storyboard->credits_cost, null, $storyboard)) {
                    DB::rollBack();

                    return response()->json([
                        'message' => "Không đủ credits cho cập nhật. Cần {$storyboard->credits_cost} credits nhưng bạn chỉ có {$request->user()->credits} credits.",
                        'required' => $storyboard->credits_cost,
                        'available' => $request->user()->credits,
                    ], 402);
                }
            }

            DB::commit();

            return response()->json([
                'data' => $storyboard->fresh()->load(['scenes', 'references']),
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();

            return $this->systemError('Failed to update storyboard', $e, ['storyboard_id' => $storyboard->id]);
        }
    }

    public function show(Storyboard $storyboard): JsonResponse
    {
        if ($storyboard->user_id !== auth('api')->id()) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện thao tác này'], 403);
        }

        return response()->json([
            'data' => $storyboard->load(['scenes' => function ($q) {
                $q->with(['parent', 'children']);
            }, 'references']),
        ]);
    }

    public function analyze(Storyboard $storyboard): JsonResponse
    {
        if ($storyboard->user_id !== auth('api')->id()) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện thao tác này'], 403);
        }

        if ($storyboard->status !== 'draft') {
            return response()->json([
                'message' => 'Chỉ phân tích được khi storyboard ở trạng thái nháp',
            ], 400);
        }

        // Process analysis synchronously
        try {
            $storyboard->markAsAnalyzing();

            $analysis = $this->storyboardAnalyzer
                ->analyzeStoryboard($storyboard);

            $storyboard->markAsAnalyzed($analysis);

            return response()->json([
                'data' => [
                    'status' => 'analyzed',
                    'message' => 'Storyboard analysis completed',
                ],
            ]);
        } catch (\Throwable $e) {
            $storyboard->update(['status' => 'draft', 'error_message' => $e->getMessage()]);

            return $this->systemError('Storyboard analysis failed', $e, ['storyboard_id' => $storyboard->id]);
        }
    }

    public function render(Storyboard $storyboard): JsonResponse
    {
        if ($storyboard->user_id !== auth('api')->id()) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện thao tác này'], 403);
        }

        if (! $storyboard->isRenderable()) {
            return response()->json([
                'message' => 'Storyboard chưa sẵn sàng để render',
                'current_status' => $storyboard->status,
            ], 400);
        }

        // Hard block: multi_scene is disabled for launch. Stops a crafted render call on any
        // pre-existing multi_scene draft, even if it slipped past store/update.
        if ($resp = $this->guardRenderMode($storyboard->render_mode)) {
            return $resp;
        }

        // A failed storyboard already had its reserved credits refunded on failure. Kicking
        // it off again MUST go through retry() (which re-reserves credits) — calling render()
        // directly on a failed storyboard would generate for free. retry() resets the status
        // to 'draft' before delegating here, so this never blocks the legitimate retry path.
        if ($storyboard->status === 'failed') {
            return response()->json([
                'message' => 'Storyboard đã thất bại. Vui lòng dùng chức năng "Thử lại" để render lại.',
                'current_status' => $storyboard->status,
            ], 422);
        }

        // Daily render cap — only on the FIRST render (a brand-new provider generation).
        // Retries are excluded here (already counted + separately capped by max_render_attempts)
        // so a user isn't blocked from finishing a generation they already started today.
        if ($storyboard->render_attempts === 0 && $this->renderQuota->exceeded($storyboard->user)) {
            return response()->json([
                'error' => 'daily_render_limit',
                'message' => $this->renderQuota->limitMessage($storyboard->user),
            ], 429);
        }

        // Enforce the attempt cap on EVERY kickoff path (retry + direct render from
        // the builder), so a failed storyboard can't bypass the cap via the Render button.
        $maxAttempts = (int) config('storyboard.max_render_attempts', 5);
        if ($storyboard->render_attempts >= $maxAttempts) {
            return response()->json([
                'message' => "Đã đạt giới hạn {$maxAttempts} lần tạo/thử cho storyboard này. Vui lòng tạo storyboard mới.",
                'render_attempts' => $storyboard->render_attempts,
                'max_render_attempts' => $maxAttempts,
            ], 429);
        }

        // Safety net: auto-compile if single_flow/storyboard_image mode and no compiled prompt
        if (in_array($storyboard->render_mode, ['single_flow', 'storyboard_image']) && empty($storyboard->compiled_prompt)) {
            try {
                $compiledPrompt = $this->aiPromptCompiler->compile($storyboard);
                $storyboard->update(['compiled_prompt' => $compiledPrompt]);
            } catch (\Throwable $e) {
                // Mirror the main render catch: retry() reserves credits before delegating here,
                // so a compile failure must release them and mark failed — otherwise the
                // storyboard is left 'draft' with credits held and render_attempts un-incremented.
                $storyboard->update(['status' => 'failed', 'error_message' => $e->getMessage()]);
                $this->creditService->releaseStoryboardReserved($storyboard);

                return $this->systemError('Failed to auto-compile prompt before rendering', $e, ['storyboard_id' => $storyboard->id]);
            }
        }

        $storyboard->markAsRendering();
        // Count every real render kickoff (initial render + each retry). A failed
        // auto-compile above returns before this, so it doesn't burn an attempt.
        $storyboard->increment('render_attempts');
        // Stamp the render kickoff time for the daily render quota (counted by
        // last_rendered_at, not updated_at — see RenderQuotaService::usedToday).
        $storyboard->forceFill(['last_rendered_at' => now()])->save();

        // Learning loop: a storyboard render is a real use of its chosen skill (style).
        // Best-effort — never blocks the render kickoff.
        app(\App\Services\SkillStatsService::class)->recordUsage($storyboard->style);

        try {
            if (in_array($storyboard->render_mode, ['single_flow', 'storyboard_image'])) {
                $result = $this->storyboardRenderer->renderSingleFlow($storyboard);

                $storyboard->update([
                    'daemon_project_id' => $result['project_id'],
                    'daemon_task_id' => $result['task_id'],
                ]);

                return response()->json([
                    'data' => [
                        'status' => 'rendering',
                        'message' => 'Single-flow rendering started',
                        'project_id' => $result['project_id'],
                        'task_id' => $result['task_id'],
                        'estimated_completion' => now()->addMinutes(5)->toIso8601String(),
                    ],
                ]);
            }

            $results = $this->storyboardRenderer->renderStoryboard($storyboard);

            $failedCount = collect($results)->where('success', false)->count();

            // If scenes failed to even queue (no daemon task → no webhook will ever
            // arrive), reconcile right away so the storyboard can't get stuck in
            // 'rendering'. No-op while any scene is still pending.
            $this->storyboardRenderer->checkStoryboardCompletion($storyboard);

            return response()->json([
                'data' => [
                    'status' => 'rendering',
                    'message' => 'Storyboard rendering started',
                    'scenes_queued' => count($results) - $failedCount,
                    'scenes_failed' => $failedCount,
                    'estimated_completion' => now()->addMinutes($storyboard->scenes->count() * 2)->toIso8601String(),
                ],
            ]);
        } catch (\Throwable $e) {
            $storyboard->update(['status' => 'failed', 'error_message' => $e->getMessage()]);
            $this->creditService->releaseStoryboardReserved($storyboard);

            return $this->systemError('Failed to start storyboard rendering', $e, ['storyboard_id' => $storyboard->id]);
        }
    }

    public function download(Storyboard $storyboard): \Symfony\Component\HttpFoundation\Response
    {
        if ($storyboard->user_id !== auth('api')->id()) {
            abort(403);
        }

        if ($storyboard->status !== 'completed' || !$storyboard->output_path) {
            abort(404);
        }

        $ext = pathinfo($storyboard->output_path, PATHINFO_EXTENSION) ?: 'mp4';
        $prefix = str_starts_with($ext, 'image') ? 'image' : 'video';
        $shortId = substr($storyboard->uuid, 0, 8);
        $ts = time();
        $date = date('d-m-Y');
        $filename = "{$prefix}_{$shortId}_{$ts}_{$date}.{$ext}";

        $localPath = storage_path('app/' . $storyboard->output_path);
        if (file_exists($localPath)) {
            return response()->download($localPath, $filename);
        }

        if (\Illuminate\Support\Facades\Storage::exists($storyboard->output_path)) {
            $tempPath = tempnam(sys_get_temp_dir(), 'storyboard_');
            file_put_contents($tempPath, \Illuminate\Support\Facades\Storage::get($storyboard->output_path));
            return response()->download($tempPath, $filename)->deleteFileAfterSend(true);
        }

        abort(404);
    }

    /**
     * Serve the multi-panel storyboard sheet (the composite T2I image) INLINE for display in the
     * result hero. Local-first (like download) so it works with no S3. Read-only, owner-gated.
     */
    public function multiPanel(Storyboard $storyboard): \Symfony\Component\HttpFoundation\Response
    {
        if ($storyboard->user_id !== auth('api')->id()) {
            abort(403);
        }

        if (empty($storyboard->multi_panel_image)) {
            abort(404);
        }

        $localPath = storage_path('app/' . $storyboard->multi_panel_image);
        if (file_exists($localPath)) {
            return response()->file($localPath, ['Cache-Control' => 'private, max-age=3600']);
        }

        if (\Illuminate\Support\Facades\Storage::exists($storyboard->multi_panel_image)) {
            $tempPath = tempnam(sys_get_temp_dir(), 'panel_');
            file_put_contents($tempPath, \Illuminate\Support\Facades\Storage::get($storyboard->multi_panel_image));
            return response()->file($tempPath)->deleteFileAfterSend(true);
        }

        abort(404);
    }

    public function addVoiceover(Request $request, Storyboard $storyboard): JsonResponse
    {
        if ($storyboard->user_id !== auth('api')->id()) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện thao tác này'], 403);
        }

        if ($storyboard->status !== 'completed') {
            return response()->json([
                'message' => 'Cần render xong storyboard trước khi thêm giọng đọc',
                'current_status' => $storyboard->status,
            ], 400);
        }

        if (! $storyboard->output_path) {
            return response()->json(['message' => 'Storyboard chưa có video kết quả'], 400);
        }

        $validator = Validator::make($request->all(), [
            'voice' => 'required|string',
            'voiceover_text' => 'required|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
            ], 400);
        }

        $voice = $request->voice;
        $voiceoverText = $request->voiceover_text;
        $videoPath = storage_path('app/'.$storyboard->output_path);

        if (! file_exists($videoPath)) {
            return response()->json(['message' => 'Không tìm thấy file video gốc'], 404);
        }

        // Moderate the voiceover text (sent to TTS) like every other user-authored text path.
        if ($this->contentFilter->containsProhibitedContent($voiceoverText)) {
            Log::warning('Voiceover text blocked by filter', [
                'user_id' => auth('api')->id(),
                'storyboard_id' => $storyboard->id,
                'term' => $this->contentFilter->getProhibitedTerm($voiceoverText),
            ]);

            return response()->json([
                'message' => 'Nội dung mô tả vi phạm tiêu chuẩn an toàn của nền tảng. Vui lòng chỉnh sửa và thử lại.',
            ], 422);
        }

        $projectId = null;

        try {
            $projectId = $this->daemonClient->createProject(
                "voiceover-{$storyboard->uuid}-".Str::uuid(),
                "Voiceover for {$storyboard->title}"
            );

            $taskId = $this->daemonClient->generateAudio($projectId, $voiceoverText, $voice);

            $task = $this->daemonClient->getTaskStatus($taskId, 0, 60000);
            if (($task['status'] ?? '') !== 'done') {
                return $this->systemError('Voiceover generation failed', null, [
                    'storyboard_id' => $storyboard->id,
                    'daemon_error' => $task['error']['message'] ?? 'Unknown error',
                ]);
            }

            $audioFilename = $task['file']['name'] ?? null;
            if (! $audioFilename) {
                return $this->systemError('Voiceover: no audio file returned from daemon', null, ['storyboard_id' => $storyboard->id]);
            }

            $tempAudioPath = $this->daemonClient->downloadFile($projectId, $audioFilename);

            $tempDir = storage_path('app/temp/'.$storyboard->uuid);
            if (! is_dir($tempDir)) {
                mkdir($tempDir, 0755, true);
            }

            $mergedFile = $tempDir.'/voiceover_'.time().'.mp4';
            $escapedVideo = escapeshellarg($videoPath);
            $escapedAudio = escapeshellarg($tempAudioPath);
            $escapedOutput = escapeshellarg($mergedFile);

            $cmd = "ffmpeg -y -i {$escapedVideo} -i {$escapedAudio} -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest {$escapedOutput} 2>&1";
            $ffmpegOutput = shell_exec($cmd);

            if (! file_exists($mergedFile)) {
                return $this->systemError('FFmpeg voiceover merge failed', null, [
                    'storyboard_uuid' => $storyboard->uuid,
                    'ffmpeg_output' => $ffmpegOutput ? substr($ffmpegOutput, -300) : 'FFmpeg error',
                ]);
            }

            $relativePath = 'storyboards/'.$storyboard->uuid.'/voiceover_'.time().'.mp4';
            Storage::put($relativePath, file_get_contents($mergedFile));

            $storyboard->markAsCompleted($relativePath);

            @unlink($tempAudioPath);
            @unlink($mergedFile);

            $url = Storage::url($relativePath);

            return response()->json([
                'message' => 'Voiceover added successfully',
                'data' => [
                    'output_url' => $url,
                    'download_url' => url("/api/storyboards/{$storyboard->uuid}/download"),
                ],
            ]);
        } catch (\Throwable $e) {
            return $this->systemError('Failed to add voiceover', $e, ['storyboard_id' => $storyboard->id]);
        } finally {
            // Always clean up the temporary daemon project (runs even when the try returns),
            // otherwise voiceover projects accumulate as orphans. Best-effort — never surface.
            if ($projectId) {
                try {
                    $this->daemonClient->deleteProject($projectId);
                } catch (\Throwable $e) {
                    Log::warning('Failed to delete voiceover daemon project', [
                        'project_id' => $projectId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }
    }

    public function generateMultiPanelImage(Storyboard $storyboard): JsonResponse
    {
        if ($storyboard->user_id !== auth('api')->id()) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện thao tác này'], 403);
        }

        if ($storyboard->scenes()->count() === 0) {
            return response()->json(['message' => 'Storyboard chưa có cảnh nào'], 400);
        }

        try {
            $imagePrompt = $this->aiPromptCompiler->compileForImage($storyboard);

            $projectId = $this->daemonClient->createProject(
                "multi-panel-{$storyboard->uuid}",
                "Multi-Panel Image for {$storyboard->title}"
            );

            $callbackUrl = config('daemon.callback_url');

            $taskId = $this->daemonClient->generateMedia($projectId, [
                'capability' => 't2i',
                'model' => \App\Services\ModelSelector::getDefaultModel('image_multi_panel'),
                'prompt' => $imagePrompt,
                'aspect_ratio' => '16:9',
                'render_job_uuid' => "multi_panel_{$storyboard->uuid}",
                'storyboard_uuid' => $storyboard->uuid,
                'video_type' => 'image_generation',
                'thinking_mode' => true,
            ], $callbackUrl);

            $task = $this->daemonClient->getTaskStatus($taskId, 0, 120000);

            if (($task['status'] ?? '') !== 'done') {
                return $this->systemError('Multi-panel image generation failed', null, [
                    'storyboard_id' => $storyboard->id,
                    'daemon_error' => $task['error']['message'] ?? 'Unknown error',
                ]);
            }

            $imageFilename = $task['file']['name'] ?? null;
            if (!$imageFilename) {
                return $this->systemError('Multi-panel: no image file returned from daemon', null, ['storyboard_id' => $storyboard->id]);
            }

            $tempPath = $this->daemonClient->downloadFile($projectId, $imageFilename);

            $relativePath = 'storyboards/' . $storyboard->uuid . '/multi_panel_' . time() . '.png';
            \Illuminate\Support\Facades\Storage::put($relativePath, file_get_contents($tempPath));

            @unlink($tempPath);

            // User explicitly asked to generate a preview → visible in the builder
            // (flag false), unlike the silent render-time auto-generation.
            $storyboard->update([
                'multi_panel_image' => $relativePath,
                'multi_panel_auto_generated' => false,
            ]);

            return response()->json([
                'data' => [
                    'multi_panel_image' => $relativePath,
                    'status' => 'generated',
                ],
            ]);
        } catch (\Throwable $e) {
            return $this->systemError('Failed to generate multi-panel image', $e, ['storyboard_id' => $storyboard->id]);
        }
    }

    public function compilePrompt(Storyboard $storyboard): JsonResponse
    {
        if ($storyboard->user_id !== auth('api')->id()) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện thao tác này'], 403);
        }

        if (!in_array($storyboard->render_mode, ['single_flow', 'storyboard_image'])) {
            return response()->json(['message' => 'Chỉ compile prompt được ở chế độ single-flow hoặc storyboard ảnh'], 400);
        }

        try {
            $compiledPrompt = $this->aiPromptCompiler->compile($storyboard);

            $storyboard->update(['compiled_prompt' => $compiledPrompt]);

            return response()->json([
                'data' => [
                    'compiled_prompt' => $compiledPrompt,
                    'status' => 'compiled',
                ],
            ]);
        } catch (\Throwable $e) {
            return $this->systemError('Failed to compile storyboard prompt', $e, ['storyboard_id' => $storyboard->id]);
        }
    }

    public function retry(Storyboard $storyboard): JsonResponse
    {
        if ($storyboard->user_id !== auth('api')->id()) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện thao tác này'], 403);
        }

        if ($storyboard->status !== 'failed') {
            return response()->json(['message' => 'Chỉ thử lại được storyboard đã thất bại'], 400);
        }

        // Cap total attempts (initial render + retries). Failures at the start (e.g.
        // prompt compile) refund credits, so without this a failing storyboard could
        // be retried for free forever — wasting daemon/provider resources each time.
        $maxAttempts = (int) config('storyboard.max_render_attempts', 5);
        if ($storyboard->render_attempts >= $maxAttempts) {
            return response()->json([
                'message' => "Đã đạt giới hạn {$maxAttempts} lần tạo/thử cho storyboard này. Vui lòng tạo storyboard mới.",
                'render_attempts' => $storyboard->render_attempts,
                'max_render_attempts' => $maxAttempts,
            ], 429);
        }

        $storyboard->update([
            'status' => 'draft',
            'error_message' => null,
            'daemon_project_id' => null,
            'daemon_task_id' => null,
            'progress_message' => null,
        ]);

        $user = $storyboard->user;
        if (! $this->creditService->reserve($user, $storyboard->credits_cost, null, $storyboard)) {
            return response()->json([
                'message' => "Không đủ credits. Cần {$storyboard->credits_cost} credits nhưng bạn chỉ có {$user->credits} credits.",
                'required' => $storyboard->credits_cost,
                'available' => $user->credits,
            ], 402);
        }

        return $this->render($storyboard);
    }

    public function destroy(Storyboard $storyboard): JsonResponse
    {
        if ($storyboard->user_id !== auth('api')->id()) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện thao tác này'], 403);
        }

        $this->creditService->releaseStoryboardReserved($storyboard);

        $storyboard->delete();

        return response()->json(['message' => 'Đã xoá storyboard'], 200);
    }

    public function aiDraft(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'concept' => 'required|string|min:10|max:1000',
            'video_type' => ['nullable', 'string', new ValidStoryboardType],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Dữ liệu không hợp lệ', 'errors' => $validator->errors()], 400);
        }

        try {
            $service = app(AiStoryboardService::class);
            $scenes = $service->generateDraft(
                concept: $request->concept,
                videoType: $request->video_type ?? 'ugc_review',
            );

            if (count($scenes) < 2) {
                return response()->json(['message' => 'AI chưa tạo đủ cảnh, vui lòng mô tả ý tưởng chi tiết hơn'], 422);
            }

            return response()->json([
                'data' => [
                    'concept' => $request->concept,
                    'scenes' => $scenes,
                ],
            ]);
        } catch (\RuntimeException $e) {
            Log::error('AI storyboard draft failed', ['error' => $e->getMessage(), 'concept' => $request->concept]);

            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function cancel(Storyboard $storyboard): JsonResponse
    {
        if ($storyboard->user_id !== auth('api')->id()) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện thao tác này'], 403);
        }

        if ($storyboard->isTerminal()) {
            return response()->json(['message' => 'Storyboard đã ở trạng thái kết thúc, không thể thao tác'], 422);
        }

        // Notify daemon to stop processing
        $this->storyboardRenderer->cancelJob($storyboard);

        // Mark as failed with user-cancelled reason
        $storyboard->markAsFailed('User cancelled');

        // Release reserved credits
        $this->creditService->releaseStoryboardReserved($storyboard);

        return response()->json(['message' => 'Đã huỷ storyboard', 'data' => $storyboard->fresh()]);
    }

}

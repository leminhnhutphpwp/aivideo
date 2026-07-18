<?php
namespace App\Http\Controllers\API;

use App\Services\RenderJobService;
use App\Services\CreditService;
use App\Services\ContentFilterService;
use App\Services\RenderQuotaService;
use App\Services\DaemonClient;
use App\Http\Requests\CreateRenderJobRequest;
use App\Events\JobQueued;
use App\Events\JobCancelled;
use App\Jobs\HandleJobFailure;
use App\Models\RenderJob;
use App\Support\ErrorSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RenderJobController extends Controller
{
    public function __construct(
        protected RenderJobService $renderJobService,
        protected CreditService $creditService,
        protected DaemonClient $daemonClient,
        protected ContentFilterService $contentFilter,
        protected RenderQuotaService $renderQuota,
    ) {
        $this->middleware('auth:api');
    }

    public function index(Request $request): JsonResponse
    {
        $query = $request->user()->renderJobs()->orderBy('created_at', 'desc');

        if ($request->filled('daemon_project_id')) {
            $query->where('daemon_project_id', $request->input('daemon_project_id'));
        }

        $query->with(['assets' => fn($q) => $q->whereIn('type', ['video', 'image', 'audio'])]);

        $paginated = $this->cleanPaginate($request, $query);

        $paginated['items'] = collect($paginated['items'])->map(function ($job) {
            $assets = $job->assets;
            $primaryAsset = $assets->first();

            return [
                'uuid' => $job->uuid,
                'status' => $job->status,
                'prompt' => $job->prompt,
                'daemon_task_id' => $job->daemon_task_id,
                'daemon_project_id' => $job->daemon_project_id,
                'capability' => $job->capability,
                'video_type' => $job->video_type,
                'duration_seconds' => $job->duration_seconds,
                'resolution' => $job->resolution,
                'aspect_ratio' => $job->aspect_ratio,
                'error_message' => ErrorSanitizer::publicMessage($job->error_message),
                'error_metadata' => ErrorSanitizer::publicMetadata($job->error_metadata),
                'credits_cost' => $job->credits_cost,
                'created_at' => $job->created_at,
                'updated_at' => $job->updated_at,
                'output_url' => $primaryAsset?->url ?? null,
                'mime_type' => $primaryAsset?->mime_type ?? null,
                'visibility' => $job->visibility,
                'published_at' => $job->published_at?->toIso8601String(),
                'tags' => $job->tags,
                'assets' => $assets->map(fn($a) => [
                    'uuid' => $a->uuid,
                    'type' => $a->type,
                    'mime_type' => $a->mime_type,
                    'url' => $a->url,
                    'size_bytes' => $a->size_bytes,
                ])->toArray(),
            ];
        })->toArray();

        return response()->json(['success' => true, 'data' => $paginated]);
    }

    public function store(CreateRenderJobRequest $request): JsonResponse
    {
        $user = $request->user();

        // Content moderation — reject unsafe prompts BEFORE reserving credits or hitting the
        // daemon. Only the positive prompt is moderated: negative prompts legitimately list
        // undesired concepts (e.g. "nude, nsfw") to EXCLUDE from output. Never surface the
        // matched term to the user.
        if ($this->contentFilter->containsProhibitedContent($request->prompt)) {
            Log::warning('Prompt blocked by content filter', [
                'user_id' => $user->id,
                'term' => $this->contentFilter->getProhibitedTerm($request->prompt),
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

        $validation = $this->renderJobService->validateCanGenerate($user, $request);
        if ($validation->fails()) {
            return response()->json([
                'error' => 'plan_limit_exceeded',
                'messages' => $validation->errors(),
            ], 403);
        }

        $cost = $this->renderJobService->calculateCost(
            $request->duration_seconds,
            $request->resolution
        );

        $job = DB::transaction(function () use ($user, $request, $cost) {
            $job = $this->renderJobService->createJob($user, $request, $cost);

            if (!$this->creditService->reserve($user, $cost, $job)) {
                return null;
            }

            $job->markAsQueued();
            return $job;
        });

        if (!$job) {
            return response()->json([
                'error' => 'insufficient_credits',
                'required' => $cost,
                'balance' => $user->credits,
            ], 402);
        }

        $this->submitToDaemon($job, $request);
        broadcast(new JobQueued($job));

        return response()->json(['success' => true, 'data' => $job->load('assets')], 201);
    }

    protected function submitToDaemon(RenderJob $job, CreateRenderJobRequest $request): void
    {
        try {
            $projectId = $this->daemonClient->createProject($job->uuid, "render-job-{$job->uuid}");

            $callbackUrl = config('daemon.callback_url');

            $taskId = $this->daemonClient->generateMedia($projectId, [
                'capability' => $request->input('capability') ?: 't2v',
                'model' => $job->model,
                'prompt' => $job->prompt,
                'negative_prompt' => $job->negative_prompt,
                'aspect_ratio' => $job->aspect_ratio,
                'duration_seconds' => $job->duration_seconds,
                'reference_images' => $job->reference_images,
                'render_job_uuid' => $job->uuid,
                'video_type' => $request->input('video_type') ?: 'text_to_video',
            ], $callbackUrl);

            $job->update([
                'daemon_project_id' => $projectId,
                'daemon_task_id' => $taskId,
            ]);

            Log::info('Job submitted to daemon', [
                'job_uuid' => $job->uuid,
                'daemon_task_id' => $taskId,
                'capability' => $request->input('capability'),
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to submit job to daemon', [
                'job_uuid' => $job->uuid,
                'error' => $e->getMessage(),
            ]);
            // Release credits immediately (sync) since HandleJobFailure runs async
            $this->creditService->releaseReserved($job);
            // Queue email notification + broadcast events
            HandleJobFailure::dispatch($job, 'Hệ thống AI tạm thời không khả dụng. Vui lòng thử lại sau.');
        }
    }

    public function show(RenderJob $renderJob): JsonResponse
    {
        $this->authorize('view', $renderJob);
        return response()->json(['success' => true, 'data' => [
            'uuid' => $renderJob->uuid,
            'status' => $renderJob->status,
            'prompt' => mb_substr($renderJob->prompt ?? '', 0, 80),
            'duration_seconds' => $renderJob->duration_seconds,
            'resolution' => $renderJob->resolution,
            'aspect_ratio' => $renderJob->aspect_ratio,
            'error_message' => ErrorSanitizer::publicMessage($renderJob->error_message),
            'error_metadata' => ErrorSanitizer::publicMetadata($renderJob->error_metadata),
            'created_at' => $renderJob->created_at,
            'updated_at' => $renderJob->updated_at,
        ]]);
    }

    public function destroy(RenderJob $renderJob): JsonResponse
    {
        $this->authorize('delete', $renderJob);
        $renderJob->delete();
        return response()->json(null, 204);
    }

    public function cancel(RenderJob $renderJob): JsonResponse
    {
        $this->authorize('update', $renderJob);
        if ($renderJob->isTerminal()) {
            return response()->json(['error' => 'Job already completed'], 422);
        }
        $renderJob->markAsCancelled();
        $this->creditService->releaseReserved($renderJob);
        broadcast(new JobCancelled($renderJob));
        return response()->json($renderJob);
    }

    public function retry(RenderJob $renderJob): JsonResponse
    {
        $this->authorize('update', $renderJob);
        if (!$renderJob->isRetryable()) {
            return response()->json(['error' => 'Job cannot be retried'], 422);
        }

        // Re-reserve credits (were released on previous failure)
        if (!$this->creditService->reserve($renderJob->user, $renderJob->credits_cost, $renderJob)) {
            return response()->json(['error' => 'Không đủ credits để thử lại'], 402);
        }

        $renderJob->increment('attempts');
        $renderJob->markAsQueued();
        $this->resubmitToDaemon($renderJob);
        broadcast(new JobQueued($renderJob));
        return response()->json($renderJob);
    }

    protected function resubmitToDaemon(RenderJob $job): void
    {
        try {
            // Reuse existing daemon project to avoid orphan project accumulation
            $projectId = $job->daemon_project_id
                ?? $this->daemonClient->createProject($job->uuid, "render-job-{$job->uuid}");

            $callbackUrl = config('daemon.callback_url');

            $capability = $job->parameters['capability'] ?? 't2v';

            $taskId = $this->daemonClient->generateMedia($projectId, [
                'capability' => $capability,
                'model' => $job->model,
                'prompt' => $job->prompt,
                'negative_prompt' => $job->negative_prompt,
                'aspect_ratio' => $job->aspect_ratio,
                'duration_seconds' => $job->duration_seconds,
                'reference_images' => $job->reference_images,
                'render_job_uuid' => $job->uuid,
            ], $callbackUrl);

            $job->update([
                'daemon_project_id' => $projectId,
                'daemon_task_id' => $taskId,
            ]);

            Log::info('Job resubmitted to daemon', [
                'job_uuid' => $job->uuid,
                'daemon_task_id' => $taskId,
                'capability' => $capability,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to resubmit job to daemon', [
                'job_uuid' => $job->uuid,
                'error' => $e->getMessage(),
            ]);
            $this->creditService->releaseReserved($job);
            HandleJobFailure::dispatch($job, 'Hệ thống AI tạm thời không khả dụng. Vui lòng thử lại sau.');
        }
    }
}

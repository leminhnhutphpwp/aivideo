<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Events\StoryboardProgressUpdated;
use App\Jobs\HandleJobCompletion;
use App\Jobs\HandleJobFailure;
use App\Models\RenderJob;
use App\Models\Storyboard;
use App\Models\StoryboardScene;
use App\Services\DaemonClient;
use App\Services\StoryboardRenderer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DaemonWebhookController extends Controller
{
    public function __construct(
        protected DaemonClient $daemonClient
    ) {}

    public function handle(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $signature = $request->header('X-Signature', '');

        if (!$this->daemonClient->verifyWebhookSignature($payload, $signature)) {
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $data = $request->all();
        $taskId = $data['taskId'] ?? null;
        $status = $data['status'] ?? null;
        $metadata = $data['metadata'] ?? [];
        $renderJobUuid = $metadata['render_job_uuid'] ?? null;

        if (!$taskId || !$status || !$renderJobUuid) {
            return response()->json(['error' => 'Missing required fields'], 422);
        }

        // Route storyboard scene webhooks
        if (str_starts_with($renderJobUuid, 'storyboard_scene_')) {
            return $this->handleStoryboardSceneWebhook($data, $renderJobUuid, $taskId, $status);
        }

        // Route storyboard single-flow webhooks
        if (str_starts_with($renderJobUuid, 'storyboard_single_flow_')) {
            return $this->handleStoryboardSingleFlowWebhook($data, $renderJobUuid, $taskId, $status);
        }

        $renderJob = RenderJob::where('uuid', $renderJobUuid)->first();

        if (!$renderJob) {
            return response()->json(['error' => 'Render job not found'], 404);
        }

        if ($renderJob->isTerminal()) {
            return response()->json(['message' => 'Job already terminal, ignored'], 200);
        }

        // Update job progress if provided
        if (isset($data['progress']) && is_array($data['progress'])) {
            $renderJob->parameters = array_merge($renderJob->parameters ?? [], [
                'last_progress' => end($data['progress']),
                'progress_count' => count($data['progress']),
            ]);
            $renderJob->save();
        }

        // Handle progress-only (non-terminal) webhooks
        if ($status === 'running') {
            return response()->json(['message' => 'Progress recorded']);
        }

        try {
            if ($status === 'completed') {
                $output = $data['output'] ?? [];
                $files = $output['files'] ?? [];
                $outputPath = $files['name'] ?? null;
                $projectId = $output['projectId'] ?? $renderJob->daemon_project_id;
                $gpuSeconds = $files['gpu_seconds'] ?? $files['size'] ?? null;

                HandleJobCompletion::dispatch($renderJob, [
                    'output_path' => $outputPath,
                    'gpu_seconds' => $gpuSeconds,
                    'daemon_task_id' => $taskId,
                    'daemon_project_id' => $projectId,
                    'daemon_file' => $files,
                ]);
            } elseif (in_array($status, ['failed', 'interrupted'])) {
                $rawError = $data['error_message'] ?? 'Unknown daemon error';
                $errorCode = $data['error_code'] ?? null;

                Log::warning('Daemon webhook job failure', [
                    'job_uuid' => $renderJob->uuid,
                    'error_code' => $errorCode,
                    'error' => $rawError,
                ]);

                HandleJobFailure::dispatch(
                    $renderJob,
                    'Hệ thống AI tạm thời không khả dụng. Vui lòng thử lại sau.',
                    $errorCode,
                    $rawError,
                );
            } else {
                return response()->json(['error' => "Unknown status: {$status}"], 422);
            }
        } catch (\Throwable $e) {
            Log::critical('Daemon webhook dispatch failed — queue may be down', [
                'job_uuid' => $renderJob->uuid,
                'task_id' => $taskId,
                'status' => $status,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'Queue unavailable'], 502);
        }

        return response()->json(['message' => 'Webhook processed']);
    }

    protected function handleStoryboardSceneWebhook(array $data, string $renderJobUuid, string $taskId, string $status): JsonResponse
    {
        $sceneId = (int) substr($renderJobUuid, strlen('storyboard_scene_'));
        $scene = StoryboardScene::find($sceneId);

        if (!$scene) {
            Log::warning('Storyboard scene webhook: scene not found', [
                'render_job_uuid' => $renderJobUuid,
                'scene_id' => $sceneId,
            ]);
            return response()->json(['error' => 'Storyboard scene not found'], 404);
        }

        // Update storyboard progress message if provided
        if (isset($data['progress']) && is_array($data['progress']) && !empty($data['progress'])) {
            $storyboard = $scene->storyboard;
            if ($storyboard) {
                $storyboard->update(['progress_message' => end($data['progress'])]);
                StoryboardProgressUpdated::dispatch($storyboard);
            }
        }

        try {
            $renderer = app(StoryboardRenderer::class);

            if ($status === 'completed') {
                $output = $data['output'] ?? [];
                $files = $output['files'] ?? [];
                $renderer->handleSceneCompletion($scene, [
                    'output_path' => $files['name'] ?? null,
                    'thumbnail_path' => null,
                    'gpu_seconds' => $files['gpu_seconds'] ?? $files['size'] ?? null,
                ], $output['projectId'] ?? null);
                $storyboard = $scene->storyboard;
                if ($storyboard) {
                    StoryboardProgressUpdated::dispatch($storyboard);
                }
                Log::info('Storyboard scene completed', [
                    'scene_id' => $sceneId,
                    'task_id' => $taskId,
                ]);
            } elseif (in_array($status, ['failed', 'interrupted'])) {
                $error = $data['error_message'] ?? 'Unknown daemon error';
                $renderer->handleSceneFailure($scene, $error);
                $storyboard = $scene->storyboard;
                if ($storyboard) {
                    StoryboardProgressUpdated::dispatch($storyboard);
                }
                Log::warning('Storyboard scene failed', [
                    'scene_id' => $sceneId,
                    'task_id' => $taskId,
                    'error' => $error,
                ]);
            } elseif ($status === 'running') {
                return response()->json(['message' => 'Storyboard scene progress recorded']);
            }

            return response()->json(['message' => 'Storyboard webhook processed']);
        } catch (\Throwable $e) {
            Log::error('Storyboard scene webhook processing failed', [
                'scene_id' => $sceneId,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['error' => 'Internal error processing storyboard webhook'], 500);
        }
    }

    protected function handleStoryboardSingleFlowWebhook(array $data, string $renderJobUuid, string $taskId, string $status): JsonResponse
    {
        $storyboardId = (int) substr($renderJobUuid, strlen('storyboard_single_flow_'));
        $storyboard = Storyboard::find($storyboardId);

        if (!$storyboard) {
            Log::warning('Storyboard single-flow webhook: storyboard not found', [
                'render_job_uuid' => $renderJobUuid,
                'storyboard_id' => $storyboardId,
            ]);
            return response()->json(['error' => 'Storyboard not found'], 404);
        }

        // Update storyboard progress message if provided
        if (isset($data['progress']) && is_array($data['progress']) && !empty($data['progress'])) {
            $storyboard->update(['progress_message' => end($data['progress'])]);
            StoryboardProgressUpdated::dispatch($storyboard);
        }

        try {
            $renderer = app(StoryboardRenderer::class);

            if ($status === 'completed') {
                $output = $data['output'] ?? [];
                $files = $output['files'] ?? [];
                $renderer->handleSingleFlowCompletion($storyboard, [
                    'output_path' => $files['name'] ?? null,
                    'gpu_seconds' => $files['gpu_seconds'] ?? $files['size'] ?? null,
                ]);
                StoryboardProgressUpdated::dispatch($storyboard);
                Log::info('Storyboard single-flow completed', [
                    'storyboard_id' => $storyboardId,
                    'task_id' => $taskId,
                ]);
            } elseif (in_array($status, ['failed', 'interrupted'])) {
                $error = $data['error_message'] ?? 'Unknown daemon error';
                $renderer->handleSingleFlowCompletion($storyboard, [
                    'error' => $error,
                ]);
                StoryboardProgressUpdated::dispatch($storyboard);
                Log::warning('Storyboard single-flow failed', [
                    'storyboard_id' => $storyboardId,
                    'task_id' => $taskId,
                    'error' => $error,
                ]);
            } elseif ($status === 'running') {
                return response()->json(['message' => 'Single-flow progress recorded']);
            }

            return response()->json(['message' => 'Single-flow webhook processed']);
        } catch (\Throwable $e) {
            Log::error('Storyboard single-flow webhook processing failed', [
                'storyboard_id' => $storyboardId,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['error' => 'Internal error processing single-flow webhook'], 500);
        }
    }
}

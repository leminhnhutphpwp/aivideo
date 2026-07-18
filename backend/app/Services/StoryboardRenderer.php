<?php

namespace App\Services;

use App\Jobs\ConcatStoryboardJob;
use App\Models\Storyboard;
use App\Models\StoryboardScene;
use App\Events\StoryboardProgressUpdated;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StoryboardRenderer
{
    public function __construct(
        protected DaemonClient $daemonClient,
        protected CreditService $creditService,
        protected StoryboardTypeService $storyboardTypeService,
        protected AssetService $assetService,
    ) {}

    /**
     * Render a storyboard in single-flow mode — one continuous video from compiled prompt.
     */
    public function renderSingleFlow(Storyboard $storyboard): array
    {
        if (empty($storyboard->compiled_prompt)) {
            throw new \RuntimeException('Storyboard has no compiled prompt. Please compile the prompt first.');
        }

        // 2-stage pipeline: for multi-panel (shot_type === 'multi'), ensure image exists in daemon project
        if ($storyboard->shot_type === 'multi') {
            if (empty($storyboard->multi_panel_image) || !str_starts_with($storyboard->multi_panel_image, 'storyboards/')) {
                $this->generateMultiPanelImage($storyboard);
            }
        }

        $callbackUrl = config('daemon.callback_url');

        try {
            $projectId = $this->daemonClient->createProject(
                "{$storyboard->uuid}-single-flow",
                'Storyboard Single Flow'
            );

            $totalDuration = $storyboard->total_duration ?? $storyboard->scenes()->sum('duration_seconds');
            $firstScene = $storyboard->scenes()->first();

            $referenceImage = $storyboard->first_frame_image;
            if ($storyboard->shot_type === 'multi' && $storyboard->multi_panel_image) {
                // The multi-panel image lives on the DEFAULT disk (s3/MinIO in dev+prod).
                // Read it disk-agnostically and hand a local copy to the daemon — the old
                // code read from the local 'public' disk, which never contained the s3 file,
                // so the reference silently dropped and the video rendered without the panel.
                if (Storage::exists($storyboard->multi_panel_image)) {
                    $tmpPath = tempnam(sys_get_temp_dir(), 'multipanel_') . '.png';
                    file_put_contents($tmpPath, Storage::get($storyboard->multi_panel_image));
                    $referenceImage = $this->daemonClient->uploadFile($projectId, $tmpPath);
                    @unlink($tmpPath);
                }
            }

            $taskId = $this->daemonClient->generateMedia($projectId, [
                'capability' => $this->resolveCapability($storyboard->video_type),
                'model' => $this->resolveModel($storyboard),
                'prompt' => $storyboard->compiled_prompt,
                'aspect_ratio' => $firstScene?->aspect_ratio ?? '16:9',
                'duration_seconds' => $totalDuration,
                'reference_images' => $this->resolveReferences($storyboard, $firstScene ?? $storyboard->scenes()->first() ?? null),
                'render_job_uuid' => "storyboard_single_flow_{$storyboard->id}",
                'storyboard_uuid' => $storyboard->uuid,
                'quality_tier' => $storyboard->quality_tier,
                'video_type' => $storyboard->video_type,
                'camera_movement' => $storyboard->camera_movement,
                'style' => $storyboard->style,
                'mood' => $storyboard->mood,
                'lighting' => $storyboard->lighting,
                'driving_audio' => $storyboard->driving_audio,
                'reference_image' => $referenceImage,
                'last_frame_image' => $storyboard->last_frame_image,
                'shot_type' => $storyboard->shot_type,
            ], $callbackUrl);

            return [
                'success' => true,
                'project_id' => $projectId,
                'task_id' => $taskId,
            ];
        } catch (\Throwable $e) {
            Log::error('Failed to start single-flow rendering', [
                'storyboard_id' => $storyboard->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Cancel a running storyboard job — notifies daemon to stop and cleans up.
     */
    public function cancelJob(Storyboard $storyboard): void
    {
        if ($storyboard->daemon_task_id) {
            try {
                $this->daemonClient->cancelTask($storyboard->daemon_task_id);
            } catch (\Throwable $e) {
                Log::warning('Failed to cancel daemon task on cancel', [
                    'storyboard_id' => $storyboard->id,
                    'task_id' => $storyboard->daemon_task_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Clean up daemon projects
        if ($storyboard->daemon_project_id) {
            try {
                $this->daemonClient->deleteProject($storyboard->daemon_project_id);
            } catch (\Throwable $e) {
                Log::warning('Failed to delete daemon project on cancel', [
                    'storyboard_id' => $storyboard->id,
                    'project_id' => $storyboard->daemon_project_id,
                    'error' => $e->getMessage(),
                ]);
            }
        } elseif (in_array($storyboard->render_mode, ['single_flow', 'storyboard_image'])) {
            // Legacy fallback: reconstruct project_id from uuid
            $projectId = "{$storyboard->uuid}-single-flow";
            try {
                $this->daemonClient->deleteProject($projectId);
            } catch (\Throwable $e) {
                Log::warning('Failed to delete legacy project on cancel', [
                    'storyboard_id' => $storyboard->id,
                    'project_id' => $projectId,
                    'error' => $e->getMessage(),
                ]);
            }
        } else {
            // Multi-scene: try to cancel each scene project
            foreach ($storyboard->scenes as $scene) {
                $projectId = "{$storyboard->uuid}-scene-{$scene->scene_number}";
                try {
                    $this->daemonClient->deleteProject($projectId);
                } catch (\Throwable $e) {
                    Log::warning('Failed to delete scene project on cancel', [
                        'storyboard_id' => $storyboard->id,
                        'scene_id' => $scene->id,
                        'project_id' => $projectId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }
    }

    /**
     * Stage 1: Generate multi-panel image from storyboard scenes using T2I model.
     * Downloads result and updates storyboard's multi_panel_image field.
     */
    protected function generateMultiPanelImage(Storyboard $storyboard): void
    {
        $compiler = app(AiPromptCompiler::class);
        $imagePrompt = $compiler->compileForImage($storyboard);

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
            // Deliberation pass — worth the extra ~30s for a clean multi-panel storyboard sheet.
            'thinking_mode' => true,
        ], $callbackUrl);

        $since = 0;
        $task = $this->daemonClient->getTaskStatus($taskId, $since, 120000);
        $maxWait = 120; // seconds
        $elapsed = 0;
        while (in_array($task['status'] ?? '', ['queued', 'running']) && $elapsed < $maxWait) {
            $since = $task['progressCount'] ?? count($task['progress'] ?? []);
            sleep(1);
            $elapsed++;
            $task = $this->daemonClient->getTaskStatus($taskId, $since, 5000);
        }

        if (($task['status'] ?? '') !== 'done') {
            throw new \RuntimeException(
                'Multi-panel image generation failed: ' . ($task['error']['message'] ?? 'Unknown error')
            );
        }

        $imageFilename = $task['file']['name'] ?? null;
        if (!$imageFilename) {
            throw new \RuntimeException('No image file returned from daemon for multi-panel');
        }

        $tempPath = $this->daemonClient->downloadFile($projectId, $imageFilename);

        $relativePath = 'storyboards/' . $storyboard->uuid . '/multi_panel_' . time() . '.png';
        \Illuminate\Support\Facades\Storage::put($relativePath, file_get_contents($tempPath));

        @unlink($tempPath);

        // Flag as system-generated: this image was produced silently at render time
        // because the user provided none. It is an internal artifact — the builder UI
        // hides it and it is never exposed as a downloadable asset (security).
        $storyboard->update([
            'multi_panel_image' => $relativePath,
            'multi_panel_auto_generated' => true,
        ]);

        Log::info('Multi-panel image auto-generated for storyboard', [
            'storyboard_id' => $storyboard->id,
            'path' => $relativePath,
        ]);
    }

    /**
     * Handle single-flow webhook completion — mark storyboard completed directly (no FFmpeg).
     */
    public function handleSingleFlowCompletion(Storyboard $storyboard, array $data): void
    {
        if ($storyboard->isTerminal()) return;

        $outputPath = $data['output_path'] ?? null;

        if ($outputPath) {
            $storyboard->markAsCompleted($outputPath);

            // Create Asset record for the storyboard output
            $tempPath = $this->daemonClient->downloadFile(
                projectId: $storyboard->daemon_project_id,
                filename: $outputPath,
            );
            $this->assetService->storeFromPath(
                user: $storyboard->user,
                job: null,
                type: 'video',
                sourcePath: $tempPath,
                storyboard: $storyboard,
            );
            @unlink($tempPath);

            $this->creditService->captureStoryboardReserved($storyboard);
        } else {
            $storyboard->markAsFailed($data['error'] ?? 'No output path returned');
            $this->creditService->releaseStoryboardReserved($storyboard);
        }
    }

    /**
     * Submit root scenes in a storyboard for rendering.
     * Child scenes are submitted as their parents complete.
     */
    public function renderStoryboard(Storyboard $storyboard): array
    {
        $rootScenes = $storyboard->scenes()->root()->get();
        $results = [];

        // Submit root scenes in parallel (each scene is independent)
        $sceneFutures = [];
        foreach ($rootScenes as $scene) {
            $sceneFutures[$scene->id] = $scene;
        }

        // Process in batches of 5 to respect rate limits
        $chunks = array_chunk($rootScenes->all(), 5, true);
        foreach ($chunks as $chunk) {
            $promises = [];
            foreach ($chunk as $scene) {
                try {
                    // Start project creation for this scene
                    $projectId = $this->daemonClient->createProject(
                        "{$storyboard->uuid}-scene-{$scene->scene_number}",
                        "Storyboard Scene {$scene->scene_number}"
                    );
                    $results[$scene->id] = ['project_id' => $projectId, 'scene' => $scene];
                } catch (\Throwable $e) {
                    Log::error('Failed to create project for storyboard scene', [
                        'storyboard_id' => $storyboard->id,
                        'scene_id' => $scene->id,
                        'error' => $e->getMessage(),
                    ]);
                    $results[$scene->id] = [
                        'success' => false,
                        'error' => $e->getMessage(),
                    ];
                }
            }

            // Submit generation tasks for created projects
            foreach ($results as $sceneId => $data) {
                if (!isset($data['scene'])) continue;
                try {
                    $result = $this->submitSceneGenerate($storyboard, $data['scene'], $data['project_id']);
                    $results[$sceneId] = $result;
                } catch (\Throwable $e) {
                    Log::error('Failed to queue storyboard scene', [
                        'storyboard_id' => $storyboard->id,
                        'scene_id' => $sceneId,
                        'error' => $e->getMessage(),
                    ]);
                    $results[$sceneId] = [
                        'success' => false,
                        'error' => $e->getMessage(),
                    ];
                }
            }
        }

        return $results;
    }

    /**
     * Submit generation task for a scene that already has a project
     */
    protected function submitSceneGenerate(Storyboard $storyboard, StoryboardScene $scene, string $projectId): array
    {
        return $this->renderSceneGenerate($storyboard, $scene, $projectId);
    }

    /**
     * Submit generation task — extracted from renderScene for reuse
     */
    protected function renderSceneGenerate(Storyboard $storyboard, StoryboardScene $scene, string $projectId): array
    {
        $prompt = $scene->enriched_prompt ?? $scene->prompt;
        $callbackUrl = config('daemon.callback_url');

        try {
            $taskId = $this->daemonClient->generateMedia($projectId, [
                'capability' => $this->resolveCapability($storyboard->video_type),
                'model' => $this->resolveModel($storyboard),
                'prompt' => $prompt,
                'aspect_ratio' => $scene->aspect_ratio,
                'duration_seconds' => $scene->duration_seconds,
                'reference_images' => $this->resolveReferences($storyboard, $scene),
                'render_job_uuid' => "storyboard_scene_{$scene->id}",
                'storyboard_uuid' => $storyboard->uuid,
                'scene_id' => $scene->id,
                'quality_tier' => $storyboard->quality_tier,
                'video_type' => $storyboard->video_type,
                'camera_movement' => $scene->camera_movement,
                'lighting' => $scene->lighting,
                'style' => $scene->style,
                'mood' => $scene->mood,
                'negative_prompt' => $scene->negative_prompt,
                'reference_image' => $scene->reference_image,
                'last_frame_image' => $scene->last_frame_image,
                'seed' => $scene->seed,
            ], $callbackUrl);

            $scene->update(['status' => 'queued']);

            return [
                'success' => true,
                'project_id' => $projectId,
                'task_id' => $taskId,
            ];
        } catch (\Throwable $e) {
            $scene->markAsFailed($e->getMessage());
            throw $e;
        }
    }

    /**
     * Submit a single scene for rendering
     */
    public function renderScene(Storyboard $storyboard, StoryboardScene $scene): array
    {
        // Use enriched prompt if available, otherwise use original prompt
        $prompt = $scene->enriched_prompt ?? $scene->prompt;

        try {
            // Create project in daemon
            $projectId = $this->daemonClient->createProject(
                "{$storyboard->uuid}-scene-{$scene->scene_number}",
                "Storyboard Scene {$scene->scene_number}"
            );

            $callbackUrl = config('daemon.callback_url');

            // Submit task to daemon
            $taskId = $this->daemonClient->generateMedia($projectId, [
                'capability' => $this->resolveCapability($storyboard->video_type),
                'model' => $this->resolveModel($storyboard),
                'prompt' => $prompt,
                'aspect_ratio' => $scene->aspect_ratio,
                'duration_seconds' => $scene->duration_seconds,
                'reference_images' => $this->resolveReferences($storyboard, $scene),
                'render_job_uuid' => "storyboard_scene_{$scene->id}",
                'storyboard_uuid' => $storyboard->uuid,
                'scene_id' => $scene->id,
                'quality_tier' => $storyboard->quality_tier,
                'video_type' => $storyboard->video_type,
                // Scene metadata
                'camera_movement' => $scene->camera_movement,
                'lighting' => $scene->lighting,
                'style' => $scene->style,
                'mood' => $scene->mood,
                'negative_prompt' => $scene->negative_prompt,
                'reference_image' => $scene->reference_image,
                'last_frame_image' => $scene->last_frame_image,
                'seed' => $scene->seed,
            ], $callbackUrl);

            // Update scene with render job info
            $scene->update([
                'status' => 'queued',
                // Note: We don't have a direct render_job_id since this is a scene
                // The daemon_task_id would be stored differently
            ]);

            return [
                'success' => true,
                'project_id' => $projectId,
                'task_id' => $taskId,
            ];
        } catch (\Throwable $e) {
            $scene->markAsFailed($e->getMessage());
            throw $e;
        }
    }

    /**
     * Re-render a single scene
     */
    public function reRenderScene(Storyboard $storyboard, StoryboardScene $scene): array
    {
        if ($storyboard->status !== 'rendering') {
            throw new \InvalidArgumentException(
                'Storyboard must be in rendering status to re-render scenes'
            );
        }

        $scene->update(['status' => 'pending']);
        return $this->renderScene($storyboard, $scene);
    }

    /**
     * Submit child scenes when a parent completes
     */
    public function submitChildScenes(Storyboard $storyboard, StoryboardScene $completedScene): array
    {
        $children = $completedScene->children;
        $results = [];

        foreach ($children as $child) {
            try {
                $child->update(['status' => 'pending']);
                $result = $this->renderScene($storyboard, $child);
                $results[$child->id] = $result;
            } catch (\Throwable $e) {
                Log::error('Failed to queue child scene', [
                    'storyboard_id' => $storyboard->id,
                    'parent_scene_id' => $completedScene->id,
                    'child_scene_id' => $child->id,
                    'error' => $e->getMessage(),
                ]);
                $child->markAsFailed($e->getMessage());
                $results[$child->id] = ['success' => false, 'error' => $e->getMessage()];
            }
        }

        return $results;
    }

    /**
     * Handle scene completion callback from daemon
     */
    public function handleSceneCompletion(StoryboardScene $scene, array $data, ?string $projectId = null): void
    {
        if (!in_array($scene->status, ['pending', 'queued'])) return;

        $outputPath = $data['output_path'] ?? null;
        $thumbnailPath = $data['thumbnail_path'] ?? null;
        $gpuSeconds = $data['gpu_seconds'] ?? null;

        if ($outputPath) {
            $localPath = $outputPath;
            if ($projectId) {
                try {
                    $tempPath = $this->daemonClient->downloadFile($projectId, $outputPath);
                    $storyboard = $scene->storyboard;
                    $sceneDir = storage_path('app/storyboards/' . $storyboard->uuid . '/scenes');
                    if (!is_dir($sceneDir)) {
                        mkdir($sceneDir, 0755, true);
                    }
                    $scenePath = $sceneDir . '/' . basename($outputPath);
                    rename($tempPath, $scenePath);
                    $localPath = 'storyboards/' . $storyboard->uuid . '/scenes/' . basename($outputPath);
                } catch (\Throwable $e) {
                    Log::warning('Failed to download scene file from daemon, using filename as-is', [
                        'scene_id' => $scene->id,
                        'output_path' => $outputPath,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $scene->markAsCompleted($localPath, $thumbnailPath);

            // Update storyboard consistency score if available
            if (isset($data['consistency_score'])) {
                $scene->update(['consistency_score' => $data['consistency_score']]);
            }
        } else {
            $scene->markAsFailed($data['error'] ?? 'No output path returned');
        }

        $storyboard = $scene->storyboard;

        // Submit child scenes when a parent completes
        if ($storyboard->status === 'rendering' && $scene->status === 'completed') {
            $this->submitChildScenes($storyboard, $scene);
        }

        // Check if all scenes are complete
        $this->checkStoryboardCompletion($storyboard);
    }

    /**
     * Handle scene failure callback from daemon
     */
    public function handleSceneFailure(StoryboardScene $scene, string $error, ?array $metadata = null): void
    {
        $scene->markAsFailed($error);

        // Reconcile the parent storyboard. Without this a single failed scene
        // leaves the storyboard stuck in 'rendering' forever — checkStoryboardCompletion
        // moves it to 'failed' once every scene has reached a terminal state.
        $this->checkStoryboardCompletion($scene->storyboard);
    }

    /**
     * Check if all scenes are complete and finalize storyboard
     */
    public function checkStoryboardCompletion(Storyboard $storyboard): void
    {
        if ($storyboard->render_mode === 'single_flow') {
            return;
        }

        $scenes = $storyboard->scenes()->lockForUpdate()->get();
        $completedCount = $scenes->where('status', 'completed')->count();
        $failedCount = $scenes->where('status', 'failed')->count();
        $totalCount = $scenes->count();

        $consistencyScores = $scenes->whereNotNull('consistency_score')->pluck('consistency_score');
        $avgConsistency = $consistencyScores->isNotEmpty()
            ? $consistencyScores->avg()
            : null;

        if ($completedCount === $totalCount) {
            if ($storyboard->status === 'completed') {
                return;
            }

            $storyboard->update(['progress_message' => 'Đang ghép video...']);
            StoryboardProgressUpdated::dispatch($storyboard);
            ConcatStoryboardJob::dispatch($storyboard);
        } elseif ($failedCount > 0 && $completedCount + $failedCount === $totalCount) {
            if ($failedCount === $totalCount) {
                $storyboard->markAsFailed('All scenes failed');
            } else {
                $storyboard->markAsFailed("{$failedCount} scenes failed out of {$totalCount}");
            }
            $this->creditService->releaseStoryboardReserved($storyboard);
        }
    }

    /**
     * Compile all scene videos into a final storyboard video
     */
    protected function compileFinalVideo(Storyboard $storyboard): string
    {
        $scenes = $storyboard->scenes()->where('status', 'completed')->orderBy('scene_number')->get();

        if ($scenes->isEmpty()) {
            throw new \RuntimeException('No completed scenes to compile');
        }

        $tempDir = storage_path('app/temp/' . $storyboard->uuid);
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $listFile = $tempDir . '/concat_list.txt';
        $outputFile = $tempDir . '/final_' . time() . '.mp4';

        $list = '';
        foreach ($scenes as $scene) {
            $fullPath = storage_path('app/' . $scene->output_path);
            if (file_exists($fullPath)) {
                $list .= "file '" . $fullPath . "'\n";
            }
        }

        if (empty($list)) {
            throw new \RuntimeException('No scene files found for compilation');
        }

        file_put_contents($listFile, $list);

        $escapedOutput = escapeshellarg($outputFile);
        $escapedList = escapeshellarg($listFile);
        $cmd = "timeout 300 ffmpeg -y -f concat -safe 0 -i {$escapedList} -c copy {$escapedOutput} 2>&1";

        $output = shell_exec($cmd);
        Log::info('FFmpeg compilation output', ['storyboard_uuid' => $storyboard->uuid, 'output' => $output]);

        if (!file_exists($outputFile)) {
            throw new \RuntimeException('FFmpeg compilation failed: ' . ($output ?? 'unknown error'));
        }

        $relativePath = 'storyboards/' . $storyboard->uuid . '/final_' . time() . '.mp4';
        Storage::put($relativePath, file_get_contents($outputFile));

        @unlink($listFile);
        @unlink($outputFile);

        $sceneDir = dirname(storage_path('app/storyboards/' . $storyboard->uuid . '/scenes/.'));
        if (is_dir($sceneDir)) {
            array_map('unlink', glob($sceneDir . '/*'));
            rmdir($sceneDir);
        }

        return $relativePath;
    }

    /**
     * Resolve capability based on video type
     */
    protected function resolveCapability(string $videoType): string
    {
        return $this->storyboardTypeService->getCapability($videoType);
    }

    /**
     * Resolve model based on quality tier
     */
    protected function resolveModel(Storyboard $storyboard): string
    {
        $modelSelector = app(ModelSelector::class);
        $videoTypeCode = match ($this->resolveCapability($storyboard->video_type)) {
            't2v' => 'text_to_video',
            'i2v' => 'image_to_video',
            'r2v' => 'reference_to_video',
            't2i' => 'text_to_image',
            'i2i' => 'image_to_image',
            default => 'text_to_video',
        };
        // NOTE: ModelSelector::resolve(($plan, $videoTypeCode) was refactored from a
        // quality-tier concept to a Plan concept; the first param is $plan now (it accepts
        // a slug string and falls back via match). Pass positionally so quality_tier binds
        // correctly — the old `qualityTierCode:` named arg fatals ("Unknown named parameter").
        return $modelSelector->resolve(
            $storyboard->quality_tier,
            $videoTypeCode
        );
    }

    /**
     * Resolve reference images for a scene
     */
    protected function resolveReferences(Storyboard $storyboard, ?StoryboardScene $scene = null): array
    {
        $paths = [];

        $characters = $storyboard->references()->characters()->get();
        foreach ($characters as $char) {
            $paths[] = $char->media_path;
        }

        $products = $storyboard->references()->products()->get();
        foreach ($products as $product) {
            $paths[] = $product->media_path;
        }

        $backgrounds = $storyboard->references()->backgrounds()->get();
        foreach ($backgrounds as $bg) {
            $paths[] = $bg->media_path;
        }

        return $paths;
    }
}
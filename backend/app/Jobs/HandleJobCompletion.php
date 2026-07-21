<?php

namespace App\Jobs;

use App\Models\RenderJob;
use App\Services\AssetService;
use App\Services\CreditService;
use App\Services\DaemonClient;
use App\Services\MailService;
use App\Services\TaskMetricsService;
use App\Events\JobCompleted;
use App\Events\CreditsUpdated;
use App\Jobs\GenerateThumbnail;
use App\Jobs\UploadAssetToR2;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class HandleJobCompletion implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public RenderJob $renderJob,
        public array $callbackData
    ) {}

    public function handle(
        CreditService $creditService,
        AssetService $assetService,
        MailService $mailService,
        DaemonClient $daemonClient,
    ): void {
        if ($this->renderJob->isTerminal()) return;

        $isImage = in_array($this->renderJob->capability, ['t2i', 'i2i', 'inpaint']);
        $assetType = $isImage ? 'image' : 'video';
        $hasAsset = $this->renderJob->assets()->exists();
        $tempPath = null;

        // Download file FIRST — if this fails, queue will retry without capturing credits
        if (!empty($this->callbackData['output_path']) && !$hasAsset) {
            $tempPath = $daemonClient->downloadFile(
                projectId: $this->callbackData['daemon_project_id'] ?? $this->renderJob->daemon_project_id,
                filename: $this->callbackData['output_path'],
            );
        }

        // Capture credits only after confirming file is downloadable
        $creditService->captureReserved($this->renderJob);

        if ($tempPath) {
            $asset = $assetService->storeFromPath(
                user: $this->renderJob->user,
                job: $this->renderJob,
                type: $assetType,
                sourcePath: $tempPath,
            );

            UploadAssetToR2::dispatch($asset);

            unlink($tempPath);
        }

        if (!$hasAsset) {
            GenerateThumbnail::dispatch($this->renderJob);
        }

        $this->renderJob->markAsCompleted($this->callbackData['output_path'] ?? '');
        $this->renderJob->update([
            'gpu_seconds' => $this->callbackData['gpu_seconds'] ?? null,
        ]);

        $durationSec = $this->renderJob->started_at
            ? (int) $this->renderJob->started_at->diffInSeconds($this->renderJob->completed_at)
            : 0;
        TaskMetricsService::logCompletion(
            $this->renderJob->daemon_task_id ?? $this->renderJob->uuid,
            $this->renderJob->model ?? 'unknown',
            $durationSec,
        );

        JobCompleted::dispatch($this->renderJob);
        CreditsUpdated::dispatch($this->renderJob->user);

        $mediumLabel = $isImage ? 'Hình ảnh' : 'Video';
        $actionLabel = $isImage ? 'Xem hình ảnh' : 'Xem video';

        $sendEmail = true;
        $pref = $this->renderJob->user->notificationPreferences()
            ->where('type', 'job_completed')
            ->where('channel', 'email')
            ->first();
        if ($pref && !$pref->enabled) {
            $sendEmail = false;
        }

        if ($sendEmail) {
            $mailService->sendToUser('job_completed', $this->renderJob->user, [
                'job_name' => $this->renderJob->uuid,
                'duration' => $this->callbackData['gpu_seconds'] ?? 'N/A',
                'result_url' => url('/render-jobs/' . $this->renderJob->uuid),
                'medium_label' => $mediumLabel,
                'action_label' => $actionLabel,
            ]);
        }
    }

    /**
     * Default queue tries=1: if handle() throws (e.g. downloadFile fails) the job
     * would otherwise strand in 'processing' with credits still reserved. Release
     * the reservation and mark failed so the user isn't stuck. releaseReserved is
     * idempotent (only refunds type='reserved'); if credits were already captured
     * (reserved→usage) it refunds 0 — no double-release. Guard on isTerminal() so
     * we never overwrite a job that actually completed.
     */
    public function failed(\Throwable $e): void
    {
        try {
            if ($this->renderJob->fresh()?->isTerminal()) {
                return;
            }
            app(CreditService::class)->releaseReserved($this->renderJob);
            $this->renderJob->markAsFailed('Hệ thống AI tạm thời không khả dụng. Vui lòng thử lại sau.');
        } catch (\Throwable $inner) {
            Log::error('HandleJobCompletion::failed cleanup error', [
                'job_uuid' => $this->renderJob->uuid,
                'error' => $inner->getMessage(),
            ]);
        }
    }
}

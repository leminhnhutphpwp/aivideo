<?php

namespace App\Jobs;

use App\Models\RenderJob;
use App\Services\CreditService;
use App\Services\DaemonClient;
use App\Services\RenderJobService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class RetryFailedJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    // Single attempt: the retry itself already re-reserves credits and resubmits
    // to the daemon; on any throw we release + markAsFailed in the catch below.
    // Letting the queue retry this whole job would re-reserve again → double charge.
    // (No backoff — it was dead weight with tries=1.)
    public int $tries = 1;

    public function __construct(
        // NB: property must NOT be named $job — Illuminate\Queue\InteractsWithQueue already
        // declares an (untyped) $job, and a typed RenderJob $job fatals at class composition.
        public RenderJob $renderJob
    ) {}

    public function handle(
        DaemonClient $daemonClient,
        RenderJobService $renderJobService,
        CreditService $creditService,
    ): void {
        Log::info('Retrying timed-out job', [
            'job_uuid' => $this->renderJob->uuid,
            'attempt' => $this->renderJob->attempts,
        ]);

        try {
            $user = $this->renderJob->user;
            $cost = $this->renderJob->credits_cost;

            // Re-validate plan limits
            $validation = $renderJobService->validateCanGenerate($user, $this->buildRequest());
            if ($validation->fails()) {
                $this->renderJob->markAsFailed('Plan limit exceeded for retry');
                Log::warning('Job retry failed - plan limits', ['job_uuid' => $this->renderJob->uuid]);
                return;
            }

            // Re-reserve credits. The original reservation was already released
            // before dispatch (CheckJobTimeouts::retryJob calls releaseReserved,
            // or HandleJobFailure did on the failure path), so this reserve is the
            // ONLY live reservation for this attempt — exactly one, never two.
            if (!$creditService->reserve($user, $cost, $this->renderJob)) {
                $this->renderJob->markAsFailed('Không đủ credits để thử lại');
                Log::warning('Job retry failed - insufficient credits', [
                    'job_uuid' => $this->renderJob->uuid,
                    'cost' => $cost,
                    'balance' => $user->credits,
                ]);
                return;
            }

            // Reuse existing project or create new one
            $projectId = $this->renderJob->daemon_project_id
                ?? $daemonClient->createProject($this->renderJob->uuid, "retry-{$this->renderJob->uuid}");

            $callbackUrl = config('daemon.callback_url');

            $payload = [
                'capability' => $this->renderJob->parameters['capability'] ?? 't2v',
                'model' => $this->renderJob->model,
                'prompt' => $this->renderJob->prompt,
                'aspect_ratio' => $this->renderJob->aspect_ratio,
                'duration_seconds' => $this->renderJob->duration_seconds,
                'reference_images' => $this->renderJob->reference_images ?? [],
                'render_job_uuid' => $this->renderJob->uuid,
            ];

            $taskId = $daemonClient->generateMedia($projectId, $payload, $callbackUrl);

            $this->renderJob->update([
                'daemon_project_id' => $projectId,
                'daemon_task_id' => $taskId,
                'started_at' => now(),
                'status' => 'processing',
            ]);

            Log::info('Job successfully resubmitted to daemon', [
                'job_uuid' => $this->renderJob->uuid,
                'daemon_task_id' => $taskId,
                'attempt' => $this->renderJob->attempts,
            ]);

        } catch (\Throwable $e) {
            Log::error('Failed to retry job', [
                'job_uuid' => $this->renderJob->uuid,
                'error' => $e->getMessage(),
            ]);

            $creditService->releaseReserved($this->renderJob);
            $this->renderJob->markAsFailed("Retry failed after {$this->renderJob->attempts}/{$this->renderJob->max_attempts} attempts");
        }
    }

    protected function buildRequest()
    {
        return new class($this->renderJob) {
            public function __construct(private RenderJob $renderJob) {}

            public function input($key, $default = null)
            {
                return match($key) {
                    'duration_seconds' => $this->renderJob->duration_seconds,
                    'resolution' => $this->renderJob->resolution ?? '720p',
                    default => $default,
                };
            }
        };
    }
}

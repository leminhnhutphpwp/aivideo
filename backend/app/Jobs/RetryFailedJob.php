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

    public int $tries = 1;
    public int $backoff = 30;

    public function __construct(
        public RenderJob $job
    ) {}

    public function handle(
        DaemonClient $daemonClient,
        RenderJobService $renderJobService,
        CreditService $creditService,
    ): void {
        Log::info('Retrying timed-out job', [
            'job_uuid' => $this->job->uuid,
            'attempt' => $this->job->attempts,
        ]);

        try {
            $user = $this->job->user;
            $cost = $this->job->credits_cost;

            // Re-validate plan limits
            $validation = $renderJobService->validateCanGenerate($user, $this->buildRequest());
            if ($validation->fails()) {
                $this->job->markAsFailed('Plan limit exceeded for retry');
                Log::warning('Job retry failed - plan limits', ['job_uuid' => $this->job->uuid]);
                return;
            }

            // Re-reserve credits (were released by HandleJobFailure)
            if (!$creditService->reserve($user, $cost, $this->job)) {
                $this->job->markAsFailed('Không đủ credits để thử lại');
                Log::warning('Job retry failed - insufficient credits', [
                    'job_uuid' => $this->job->uuid,
                    'cost' => $cost,
                    'balance' => $user->credits,
                ]);
                return;
            }

            // Reuse existing project or create new one
            $projectId = $this->job->daemon_project_id
                ?? $daemonClient->createProject($this->job->uuid, "retry-{$this->job->uuid}");

            $callbackUrl = config('daemon.callback_url');

            $payload = [
                'capability' => $this->job->parameters['capability'] ?? 't2v',
                'model' => $this->job->model,
                'prompt' => $this->job->prompt,
                'aspect_ratio' => $this->job->aspect_ratio,
                'duration_seconds' => $this->job->duration_seconds,
                'reference_images' => $this->job->reference_images ?? [],
                'render_job_uuid' => $this->job->uuid,
            ];

            $taskId = $daemonClient->generateMedia($projectId, $payload, $callbackUrl);

            $this->job->update([
                'daemon_project_id' => $projectId,
                'daemon_task_id' => $taskId,
                'started_at' => now(),
                'status' => 'processing',
            ]);

            Log::info('Job successfully resubmitted to daemon', [
                'job_uuid' => $this->job->uuid,
                'daemon_task_id' => $taskId,
                'attempt' => $this->job->attempts,
            ]);

        } catch (\Throwable $e) {
            Log::error('Failed to retry job', [
                'job_uuid' => $this->job->uuid,
                'error' => $e->getMessage(),
            ]);

            $creditService->releaseReserved($this->job);
            $this->job->markAsFailed("Retry failed after {$this->job->attempts}/{$this->job->max_attempts} attempts");
        }
    }

    protected function buildRequest()
    {
        return new class($this->job) {
            public function __construct(private RenderJob $job) {}

            public function input($key, $default = null)
            {
                return match($key) {
                    'duration_seconds' => $this->job->duration_seconds,
                    'resolution' => $this->job->resolution ?? '720p',
                    default => $default,
                };
            }
        };
    }
}

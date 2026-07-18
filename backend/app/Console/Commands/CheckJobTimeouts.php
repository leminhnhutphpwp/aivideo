<?php

namespace App\Console\Commands;

use App\Jobs\HandleJobFailure;
use App\Jobs\RetryFailedJob;
use App\Models\RenderJob;
use App\Services\CreditService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckJobTimeouts extends Command
{
    protected $signature = 'jobs:check-timeouts {--dry-run : Check without taking action}';
    protected $description = 'Check for timed-out render jobs, stuck queued jobs, and retry if possible';

    // Stuck queued job threshold (minutes)
    protected int $stuckQueuedThreshold = 30;
    // Stuck processing job without daemon task threshold (minutes)
    protected int $stuckProcessingNoTaskThreshold = 60;

    // Provider timeout thresholds (in minutes)
    protected array $providerTimeouts = [
        'qwencloud' => 12,
        'wavespeed' => 10,
        'volcengine' => 10,
        'byteplus' => 10,
        'fal' => 10,
        'grok' => 10,
        'default' => 10,
    ];

    public function handle(): int
    {
        $this->info('Checking for stuck jobs...');

        $dryRun = $this->option('dry-run');
        if ($dryRun) {
            $this->warn('DRY RUN MODE - No actions will be taken');
        }

        // Step 1: Clean up stuck queued jobs (never got a daemon task or never got callback)
        $this->cleanupStuckQueuedJobs($dryRun);

        // Step 2: Check timed-out processing jobs
        $timedOutJobs = $this->findTimedOutJobs();
        
        if ($timedOutJobs->isEmpty()) {
            $this->info('✓ No timed-out jobs found');
            return 0;
        }

        $this->warn("Found {$timedOutJobs->count()} timed-out job(s)");

        $retried = 0;
        $failed = 0;
        $skipped = 0;

        foreach ($timedOutJobs as $job) {
            $this->newLine();
            $this->line("Job: {$job->uuid}");
            $this->line("  Model: {$job->model}");
            $this->line("  Status: {$job->status}");
            $this->line("  Started: {$job->started_at->diffForHumans()}");
            $this->line("  Attempts: {$job->attempts}/{$job->max_attempts}");
            $this->line("  Timeout: {$this->getJobTimeout($job)} minutes");

            if ($dryRun) {
                $this->warn('  ⚠️  SKIPPED (dry run)');
                continue;
            }

            if ($job->attempts >= $job->max_attempts) {
                $this->failJob($job);
                $failed++;
            } elseif ($job->isRetryable()) {
                $this->retryJob($job);
                $retried++;
            } else {
                $this->warn('  ⚠️  SKIPPED (not retryable)');
                $skipped++;
            }
        }

        $this->newLine();
        $this->line('─'.str_repeat('─', 59));
        $this->info("Summary:");
        $this->line("  ✓ Retried:  {$retried}");
        $this->line("  ✗ Failed:   {$failed}");
        $this->line("  ⚠️  Skipped:  {$skipped}");
        $this->line("  Total:      {$timedOutJobs->count()}");

        Log::info('Job timeout check completed', [
            'total' => $timedOutJobs->count(),
            'retried' => $retried,
            'failed' => $failed,
            'skipped' => $skipped,
        ]);

        return 0;
    }

    protected function findTimedOutJobs()
    {
        $query = RenderJob::where('status', 'processing')
            ->whereNotNull('started_at');

        // Check each provider timeout
        foreach ($this->providerTimeouts as $provider => $minutes) {
            if ($provider === 'default') {
                continue;
            }

            $query->orWhere(function ($q) use ($provider, $minutes) {
                $q->where('model', 'like', "%{$provider}%")
                  ->where('started_at', '<', now()->subMinutes($minutes));
            });
        }

        // Default timeout for unmatched providers
        $query->orWhere(function ($q) {
            $q->whereNotIn('model', ['qwencloud', 'wavespeed', 'volcengine', 'byteplus', 'fal', 'grok'])
              ->where('started_at', '<', now()->subMinutes($this->providerTimeouts['default']));
        });

        return $query->get();
    }

    protected function getJobTimeout(RenderJob $job): int
    {
        foreach ($this->providerTimeouts as $provider => $minutes) {
            if (str_contains(strtolower($job->model), $provider)) {
                return $minutes;
            }
        }
        return $this->providerTimeouts['default'];
    }

    protected function retryJob(RenderJob $job): void
    {
        $job->increment('attempts');

        // RetryFailedJob handles credit reserve + daemon resubmission
        RetryFailedJob::dispatch($job);

        $this->info("  ✓ RETRYING (attempt {$job->attempts}/{$job->max_attempts})");
        
        Log::info('Job auto-retried after timeout', [
            'job_uuid' => $job->uuid,
            'attempt' => $job->attempts,
            'model' => $job->model,
        ]);
    }

    protected function failJob(RenderJob $job): void
    {
        $job->status = 'failed';
        $job->error_message = "Generation timeout after {$job->attempts} attempts (max retries exceeded)";
        $job->failed_at = now();
        $job->save();

        // Release reserved credits
        $this->call('credits:release', ['job' => $job->uuid]);

        $this->error("  ✗ FAILED (max attempts reached)");
        
        Log::error('Job failed after max retries', [
            'job_uuid' => $job->uuid,
            'attempts' => $job->attempts,
            'model' => $job->model,
        ]);
    }

    protected function cleanupStuckQueuedJobs(bool $dryRun): void
    {
        $threshold = now()->subMinutes($this->stuckQueuedThreshold);

        // Jobs stuck in 'queued' status with no daemon_task_id (submitToDaemon never ran or failed silently)
        $stuckNoTask = RenderJob::where('status', 'queued')
            ->whereNull('daemon_task_id')
            ->where('queued_at', '<', $threshold)
            ->get();

        // Jobs stuck in 'queued' status WITH daemon_task_id but no callback received
        $stuckNoCallback = RenderJob::where('status', 'queued')
            ->whereNotNull('daemon_task_id')
            ->where('queued_at', '<', $threshold)
            ->get();

        // Jobs stuck in 'processing' status with no daemon_task_id (daemon never reported back)
        $stuckProcessing = RenderJob::where('status', 'processing')
            ->whereNull('daemon_task_id')
            ->where('started_at', '<', now()->subMinutes($this->stuckProcessingNoTaskThreshold))
            ->get();

        $allStuck = $stuckNoTask->merge($stuckNoCallback)->merge($stuckProcessing);
        $uniqueStuck = $allStuck->unique('id');

        if ($uniqueStuck->isEmpty()) {
            $this->info('  ✓ No stuck queued jobs');
            return;
        }

        $this->warn("  Found {$uniqueStuck->count()} stuck queued job(s) — releasing credits and failing");

        foreach ($uniqueStuck as $job) {
            $reason = $job->daemon_task_id
                ? 'Daemon task created but no callback received within timeout'
                : 'Never submitted to daemon';

            $this->newLine();
            $this->line("  Job: {$job->uuid}");
            $this->line("    Status: {$job->status}");
            $this->line("    Reason: {$reason}");
            $this->line("    Queued: {$job->queued_at->diffForHumans()}");

            if ($dryRun) {
                $this->warn('    ⚠️  SKIPPED (dry run)');
                continue;
            }

            $creditService = app(CreditService::class);
            $creditService->releaseReserved($job);

            HandleJobFailure::dispatch(
                $job,
                'Hệ thống AI tạm thời không khả dụng. Vui lòng thử lại sau.'
            );

            Log::warning('Stuck queued job cleared', [
                'job_uuid' => $job->uuid,
                'status' => $job->status,
                'daemon_task_id' => $job->daemon_task_id,
                'reason' => $reason,
            ]);

            $this->info('    ✓ Released credits and queued failure handler');
        }
    }
}

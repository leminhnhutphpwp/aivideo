<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class TaskMetricsService
{
    public static function logPoll(string $taskId, int $attempt, string $status, float $durationMs): void
    {
        Log::channel('task_metrics')->info('poll', [
            'task_id' => $taskId,
            'attempt' => $attempt,
            'status' => $status,
            'duration_ms' => round($durationMs, 2),
        ]);
    }

    public static function logCompletion(string $taskId, string $provider, int $durationSec): void
    {
        Log::channel('task_metrics')->info('complete', [
            'task_id' => $taskId,
            'provider' => $provider,
            'total_seconds' => $durationSec,
        ]);
    }

    public static function logFailure(string $taskId, string $provider, string $error, int $durationSec): void
    {
        Log::channel('task_metrics')->info('fail', [
            'task_id' => $taskId,
            'provider' => $provider,
            'error' => $error,
            'total_seconds' => $durationSec,
        ]);
    }

    public static function logDownloadRetry(string $taskId, int $attempt, string $error): void
    {
        Log::channel('task_metrics')->warning('download_retry', [
            'task_id' => $taskId,
            'attempt' => $attempt,
            'error' => $error,
        ]);
    }
}

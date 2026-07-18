<?php

namespace App\Jobs;

use App\Models\RenderJob;
use App\Services\CreditService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ReleaseStuckCredits implements ShouldQueue
{
    use Queueable;

    public function handle(CreditService $creditService): void
    {
        // Job ở trạng thái 'created' hoặc 'queued' quá 1 giờ
        RenderJob::whereIn('status', ['created', 'queued'])
            ->where('created_at', '<', now()->subHours(1))
            ->each(function (RenderJob $job) use ($creditService) {
                $creditService->releaseReserved($job);
                $job->markAsFailed('Stuck: not picked up within 1 hour');
            });
    }
}

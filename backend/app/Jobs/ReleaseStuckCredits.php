<?php

namespace App\Jobs;

use App\Models\RenderJob;
use App\Services\CreditService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class ReleaseStuckCredits implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $backoff = 60;

    public function handle(CreditService $creditService): void
    {
        // Job ở trạng thái 'created' hoặc 'queued' quá 1 giờ.
        // Dùng cursor() thay vì each(): markAsFailed() đổi status ra khỏi tập lọc,
        // nếu dùng each() (paginate theo offset) thì mỗi trang bị dịch → bỏ sót ~1 chunk/lần chạy.
        // cursor() stream 1 query duy nhất nên không bị lệch offset.
        RenderJob::whereIn('status', ['created', 'queued'])
            ->where('created_at', '<', now()->subHours(1))
            ->cursor()
            ->each(function (RenderJob $job) use ($creditService) {
                // releaseReserved chỉ hoàn credits cho txn type='reserved' và khóa hàng
                // (idempotent) → an toàn nếu job retry.
                $creditService->releaseReserved($job);
                $job->markAsFailed('Stuck: not picked up within 1 hour');
            });
    }

    public function failed(\Throwable $e): void
    {
        Log::error('ReleaseStuckCredits job failed', [
            'error' => $e->getMessage(),
        ]);
    }
}

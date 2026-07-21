<?php

namespace Tests\Feature;

use App\Jobs\HandleJobFailure;
use App\Jobs\RetryFailedJob;
use App\Models\CreditTransaction;
use App\Models\RenderJob;
use App\Models\User;
use App\Services\CreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * Guards the single-reservation invariant on the timeout sweep:
 * exactly ONE type='reserved' credit txn per active job attempt, and every
 * terminal/retry transition captures OR releases that reservation exactly once.
 */
class CheckJobTimeoutsInvariantTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'email_verified_at' => now(),
            'credits' => 100,
        ]);
    }

    private function makeProcessingJob(string $uuid, int $attempts, int $maxAttempts, int $cost = 10): RenderJob
    {
        return RenderJob::create([
            'user_id' => $this->user->id,
            'uuid' => $uuid,
            'model' => 'wan2.6-t2v', // no provider substring → default 10-min timeout
            'capability' => 't2v',
            'status' => 'processing',
            'prompt' => 'test prompt',
            'credits_cost' => $cost,
            'duration_seconds' => 5,
            'attempts' => $attempts,
            'max_attempts' => $maxAttempts,
            'started_at' => now()->subMinutes(30), // older than 10-min default timeout
            'daemon_project_id' => 'proj-'.$uuid,
            'parameters' => ['prompt' => 'test', 'capability' => 't2v'],
        ]);
    }

    private function reservedCount(RenderJob $job): int
    {
        return CreditTransaction::where('render_job_id', $job->id)
            ->where('type', 'reserved')
            ->count();
    }

    public function test_retry_releases_original_reservation_before_redispatch(): void
    {
        Queue::fake();

        $job = $this->makeProcessingJob('timeout-retry-uuid', attempts: 0, maxAttempts: 3, cost: 10);

        // One live reservation for the attempt.
        app(CreditService::class)->reserve($this->user, 10, $job);
        $this->assertSame(1, $this->reservedCount($job));
        $this->user->refresh();
        $this->assertSame(90, $this->user->credits);

        $this->artisan('jobs:check-timeouts')->assertExitCode(0);

        // The original reservation must be released BEFORE RetryFailedJob is queued,
        // so RetryFailedJob's own reserve() becomes the only live reservation → net one.
        $this->assertSame(0, $this->reservedCount($job), 'original reservation not released → would double-reserve');
        $this->user->refresh();
        $this->assertSame(100, $this->user->credits, 'credits not refunded on release');

        Queue::assertPushed(RetryFailedJob::class, function (RetryFailedJob $j) use ($job) {
            return $j->renderJob->id === $job->id;
        });

        $job->refresh();
        $this->assertSame(1, $job->attempts, 'attempts should increment exactly once');
    }

    public function test_max_attempts_dispatches_failure_handler_without_crash(): void
    {
        Queue::fake();

        $job = $this->makeProcessingJob('timeout-fail-uuid', attempts: 3, maxAttempts: 3, cost: 10);
        app(CreditService::class)->reserve($this->user, 10, $job);

        // Previously failJob() called a no-op `credits:release` with an unknown {job}
        // arg → InvalidArgumentException aborted the whole sweep. Now it dispatches
        // HandleJobFailure (which releases reserved + fires JobFailed + emails).
        $this->artisan('jobs:check-timeouts')->assertExitCode(0);

        Queue::assertPushed(HandleJobFailure::class, function (HandleJobFailure $j) use ($job) {
            return $j->renderJob->id === $job->id;
        });
    }
}

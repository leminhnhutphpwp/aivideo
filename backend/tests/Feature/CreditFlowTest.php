<?php

namespace Tests\Feature;

use App\Models\RenderJob;
use App\Models\User;
use App\Services\CreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class CreditFlowTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Config::set('daemon.webhook_secret', 'test-secret');

        $this->user = User::factory()->create([
            'email_verified_at' => now(),
            'credits' => 100,
        ]);
    }

    public function test_credits_are_reserved_when_job_is_created(): void
    {
        $initialCredits = $this->user->credits;

        $job = RenderJob::create([
            'user_id' => $this->user->id,
            'uuid' => 'test-reserve-uuid',
            'model' => 'wan2.6-t2v',
            'capability' => 't2v',
            'status' => 'queued',
            'prompt' => 'test prompt',
            'credits_cost' => 15,
            'duration_seconds' => 5,
            'daemon_project_id' => 'proj-123',
            'parameters' => ['prompt' => 'test'],
        ]);

        $this->assertDatabaseHas('render_jobs', [
            'uuid' => 'test-reserve-uuid',
            'credits_cost' => 15,
        ]);
    }

    public function test_credit_release_on_job_failure(): void
    {
        $job = RenderJob::create([
            'user_id' => $this->user->id,
            'uuid' => 'test-fail-uuid',
            'model' => 'wan2.6-t2v',
            'capability' => 't2v',
            'status' => 'processing',
            'prompt' => 'test prompt',
            'credits_cost' => 10,
            'duration_seconds' => 5,
            'daemon_project_id' => 'proj-456',
            'parameters' => ['prompt' => 'test'],
        ]);

        $creditService = app(CreditService::class);
        $creditService->releaseReserved($job);
        $job->update(['status' => 'failed']);

        $this->assertDatabaseHas('render_jobs', [
            'uuid' => 'test-fail-uuid',
            'status' => 'failed',
        ]);
    }

    public function test_credit_capture_on_job_completion(): void
    {
        $job = RenderJob::create([
            'user_id' => $this->user->id,
            'uuid' => 'test-complete-uuid',
            'model' => 'wan2.6-t2v',
            'capability' => 't2v',
            'status' => 'processing',
            'prompt' => 'test prompt',
            'credits_cost' => 10,
            'duration_seconds' => 5,
            'daemon_project_id' => 'proj-789',
            'parameters' => ['prompt' => 'test'],
        ]);

        $creditService = app(CreditService::class);
        $creditService->captureReserved($job);
        $job->update(['status' => 'completed']);

        $this->assertDatabaseHas('render_jobs', [
            'uuid' => 'test-complete-uuid',
            'status' => 'completed',
        ]);
    }

    public function test_user_cannot_exceed_credits(): void
    {
        $this->user->update(['credits' => 5]);

        $creditService = app(CreditService::class);
        $canAfford = $creditService->canAfford($this->user, 10);

        $this->assertFalse($canAfford);
    }

    public function test_user_with_sufficient_credits_can_afford(): void
    {
        $this->user->update(['credits' => 50]);

        $creditService = app(CreditService::class);
        $canAfford = $creditService->canAfford($this->user, 10);

        $this->assertTrue($canAfford);
    }
}

<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\RenderJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * FIX 2 — the studio generate/retry proxy paths (DaemonProxyController) must enforce the
 * same content-moderation and daily-render-cap guards as RenderJobController::store, BEFORE
 * reserving credits or hitting the daemon.
 */
class DaemonProxyGenerationGuardTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'daemon.base_url' => 'http://daemon.test',
            'daemon.webhook_secret' => 'test-secret',
            'queue.default' => 'sync',
            'broadcasting.default' => 'null',
        ]);

        Http::fake(['*' => Http::response(['taskId' => 'task-xyz'], 200)]);

        $plan = Plan::create([
            'name' => 'Free',
            'slug' => 'free',
            'max_concurrent_jobs' => 5,
            'monthly_credits' => 2000,
            'price_regular' => 0,
            'quality_multiplier' => 1.0,
            'max_renders_per_day' => 3,
        ]);

        $this->user = User::factory()->create([
            'plan_id' => $plan->id,
            'credits' => 50000,
        ]);
    }

    public function test_prohibited_prompt_blocked_before_job_or_credit(): void
    {
        $this->actingAs($this->user, 'api');
        $creditsBefore = $this->user->credits;

        $response = $this->postJson('/api/daemon/projects/proj-x/media/generate', [
            'surface' => 'video',
            'capability' => 't2v',
            'prompt' => 'canh khieu dam ban dem', // unaccented Vietnamese NSFW
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('error', 'unsafe_content');

        $this->assertSame(0, RenderJob::where('user_id', $this->user->id)->count());
        $this->assertSame($creditsBefore, $this->user->fresh()->credits);
    }

    public function test_retry_prohibited_prompt_blocked(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/daemon/projects/proj-x/retry', [
            'surface' => 'video',
            'capability' => 't2v',
            'prompt' => 'phim sex',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('error', 'unsafe_content');
        $this->assertSame(0, RenderJob::where('user_id', $this->user->id)->count());
    }

    public function test_daily_render_cap_returns_429(): void
    {
        $this->actingAs($this->user, 'api');

        // Plan cap is 3/day; seed 3 render jobs created today.
        for ($i = 0; $i < 3; $i++) {
            RenderJob::create([
                'user_id' => $this->user->id,
                'status' => 'completed',
                'prompt' => "job {$i}",
                'title' => "job {$i}",
                'duration_seconds' => 5,
                'aspect_ratio' => '16:9',
                'resolution' => '720p',
                'credits_cost' => 100,
            ]);
        }

        $response = $this->postJson('/api/daemon/projects/proj-cap/media/generate', [
            'surface' => 'video',
            'capability' => 't2v',
            'prompt' => 'một cảnh hoàng hôn đẹp',
        ]);

        $response->assertStatus(429);
        $response->assertJsonPath('error', 'daily_render_limit');
    }

    public function test_clean_prompt_within_cap_proceeds(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/daemon/projects/proj-ok/media/generate', [
            'surface' => 'video',
            'capability' => 't2v',
            'prompt' => 'một cảnh hoàng hôn trên biển',
        ]);

        $response->assertStatus(200);
        $this->assertSame(1, RenderJob::where('user_id', $this->user->id)->count());
    }
}

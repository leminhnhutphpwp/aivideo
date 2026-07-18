<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\RenderJob;
use App\Models\Storyboard;
use App\Models\User;
use App\Models\VideoType;
use App\Services\DaemonClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Go-live guards: prompt/publish content moderation (WS3.2) and per-user daily render cap
 * (WS1.3).
 */
class LaunchGuardsTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Plan $plan;

    protected function setUp(): void
    {
        parent::setUp();

        config(['queue.default' => 'sync']);
        config(['broadcasting.default' => 'null']);

        VideoType::create([
            'code' => 'text_to_video',
            'name' => 'Text-to-Video',
            'base_credits' => 200,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $this->plan = Plan::create([
            'name' => 'Free',
            'slug' => 'free',
            'max_concurrent_jobs' => 5,
            'max_renders_per_day' => 100, // high so moderation tests aren't quota-limited
            'monthly_credits' => 5000,
            'price_regular' => 0,
            'quality_multiplier' => 1.0,
        ]);

        $this->user = User::factory()->create([
            'plan_id' => $this->plan->id,
            'credits' => 50000,
        ]);
    }

    private function createRenderJobToday(): RenderJob
    {
        return RenderJob::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'user_id' => $this->user->id,
            'status' => 'completed',
            'prompt' => 'Existing render today',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'credits_cost' => 100,
            'created_at' => now(),
        ]);
    }

    protected function mockDaemonHealthy(): void
    {
        $this->mock(DaemonClient::class, function ($mock) {
            $mock->shouldReceive('health')->andReturn(true);
            $mock->shouldReceive('isModelAvailable')->andReturn(true);
            $mock->shouldReceive('createProject')->andReturn('test-project-id');
            $mock->shouldReceive('generateMedia')->andReturn('test-task-id-123');
        });
    }

    // ─── WS3.2 — Content moderation ───────────────────────────────

    public function test_render_job_rejects_unsafe_prompt_without_creating_job_or_charging(): void
    {
        $this->actingAs($this->user, 'api');
        $creditsBefore = $this->user->credits;

        $response = $this->postJson('/api/render-jobs', [
            'prompt' => 'Một cảnh khiêu dâm rõ nét quay cận cảnh',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('error', 'unsafe_content');

        $this->assertEquals(0, RenderJob::where('user_id', $this->user->id)->count());
        $this->assertEquals($creditsBefore, $this->user->fresh()->credits);
    }

    public function test_render_job_allows_clean_prompt(): void
    {
        $this->mockDaemonHealthy();
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/render-jobs', [
            'prompt' => 'Một chú chó con dễ thương chạy trên bãi biển lúc hoàng hôn',
            'video_type' => 'text_to_video',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        $response->assertStatus(201);
        $this->assertEquals(1, RenderJob::where('user_id', $this->user->id)->count());
    }

    // ─── WS1.3 — Daily render cap ─────────────────────────────────

    public function test_render_job_blocked_when_daily_limit_reached(): void
    {
        $this->plan->update(['max_renders_per_day' => 2]);

        // Two renders already created today.
        $this->createRenderJobToday();
        $this->createRenderJobToday();

        $this->actingAs($this->user, 'api');
        $creditsBefore = $this->user->fresh()->credits;

        $response = $this->postJson('/api/render-jobs', [
            'prompt' => 'Một cảnh bình yên bên bờ hồ vào buổi sáng sớm',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        $response->assertStatus(429);
        $response->assertJsonPath('error', 'daily_render_limit');

        $this->assertEquals(2, RenderJob::where('user_id', $this->user->id)->count());
        $this->assertEquals($creditsBefore, $this->user->fresh()->credits);
    }

    public function test_render_job_allowed_under_daily_limit(): void
    {
        $this->plan->update(['max_renders_per_day' => 5]);

        $this->createRenderJobToday();
        $this->createRenderJobToday();

        $this->mockDaemonHealthy();
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/render-jobs', [
            'prompt' => 'Một cảnh bình yên bên bờ hồ vào buổi sáng sớm',
            'video_type' => 'text_to_video',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        $response->assertStatus(201);
    }

    public function test_storyboard_render_blocked_when_daily_limit_reached(): void
    {
        $this->plan->update(['max_renders_per_day' => 1]);

        // One render already today → over the limit of 1.
        $this->createRenderJobToday();

        $storyboard = Storyboard::create([
            'uuid' => 'quota-render-sb',
            'user_id' => $this->user->id,
            'title' => 'Quota test',
            'status' => 'analyzed',
            'video_type' => 'storyboard_video',
            'render_mode' => 'single_flow',
            'quality_tier' => 'standard',
            'render_attempts' => 0,
        ]);

        $this->actingAs($this->user, 'api');

        $response = $this->postJson("/api/storyboards/{$storyboard->uuid}/render");

        $response->assertStatus(429);
        $response->assertJsonPath('error', 'daily_render_limit');

        $storyboard->refresh();
        $this->assertEquals('analyzed', $storyboard->status);
        $this->assertEquals(0, $storyboard->render_attempts);
    }
}

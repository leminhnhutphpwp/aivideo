<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Storyboard;
use App\Models\User;
use App\Services\RenderQuotaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * FIX 6 — daily render quota must count storyboards by last_rendered_at (real render
 * kickoff), NOT updated_at (which also bumps on a title edit).
 * FIX 7 — render() on a 'failed' storyboard must be blocked (reserved credits were already
 * refunded); re-kickoff must go through retry() which re-reserves.
 */
class RenderQuotaAndFailedRenderTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        config(['queue.default' => 'sync', 'broadcasting.default' => 'null']);

        $plan = Plan::create([
            'slug' => 'free', 'name' => 'Free',
            'quality_multiplier' => 1.0, 'max_concurrent_jobs' => 1,
            'monthly_credits' => 300, 'price_regular' => 0,
            'max_renders_per_day' => 5,
        ]);

        $this->user = User::factory()->create([
            'plan_id' => $plan->id,
            'credits' => 100000,
        ]);
    }

    public function test_quota_counts_rendered_today_not_edited_today(): void
    {
        // Rendered today -> counts.
        Storyboard::create([
            'user_id' => $this->user->id, 'title' => 'Rendered today',
            'video_type' => 'ugc_review', 'quality_tier' => 'standard',
            'render_mode' => 'single_flow', 'status' => 'completed',
            'render_attempts' => 1, 'last_rendered_at' => now(),
        ]);

        // Edited today but never rendered (render_attempts>0 from a prior day, no
        // last_rendered_at today) -> must NOT count. Under the old updated_at logic it would.
        $edited = Storyboard::create([
            'user_id' => $this->user->id, 'title' => 'Edited today',
            'video_type' => 'ugc_review', 'quality_tier' => 'standard',
            'render_mode' => 'single_flow', 'status' => 'draft',
            'render_attempts' => 1, 'last_rendered_at' => null,
        ]);
        $edited->update(['title' => 'Edited title again']); // bumps updated_at to now

        // Rendered yesterday -> does not count today.
        Storyboard::create([
            'user_id' => $this->user->id, 'title' => 'Rendered yesterday',
            'video_type' => 'ugc_review', 'quality_tier' => 'standard',
            'render_mode' => 'single_flow', 'status' => 'completed',
            'render_attempts' => 1, 'last_rendered_at' => now()->subDay(),
        ]);

        $quota = app(RenderQuotaService::class);
        $this->assertSame(1, $quota->usedToday($this->user->fresh()));
    }

    public function test_render_on_failed_storyboard_is_blocked(): void
    {
        $this->actingAs($this->user, 'api');

        $sb = Storyboard::create([
            'user_id' => $this->user->id, 'title' => 'Failed SB',
            'video_type' => 'ugc_review', 'quality_tier' => 'standard',
            'render_mode' => 'single_flow', 'status' => 'failed',
            'compiled_prompt' => 'a compiled prompt',
            'credits_cost' => 500, 'render_attempts' => 1,
        ]);

        $creditsBefore = $this->user->fresh()->credits;

        $response = $this->postJson("/api/storyboards/{$sb->uuid}/render");

        $response->assertStatus(422);
        $this->assertStringContainsString('Thử lại', $response->json('message'));

        // No new render kickoff, no free generation, no credit movement.
        $this->assertSame('failed', $sb->fresh()->status);
        $this->assertSame(1, $sb->fresh()->render_attempts);
        $this->assertNull($sb->fresh()->last_rendered_at);
        $this->assertSame($creditsBefore, $this->user->fresh()->credits);
    }
}

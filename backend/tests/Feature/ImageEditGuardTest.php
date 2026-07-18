<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\RenderJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Guards against routing an image edit (i2i/inpaint) action into a text-to-image-only
 * model, which the provider cannot fulfil (404 /images/edits). See
 * DaemonProxyController::guardImageEditCapability().
 */
class ImageEditGuardTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        config(['daemon.base_url' => 'http://daemon.test']);
        config(['daemon.webhook_secret' => 'test-secret']);
        config(['queue.default' => 'sync']);
        config(['broadcasting.default' => 'null']);

        // Fake all outbound daemon HTTP so nothing hits the network.
        Http::fake(['*' => Http::response(['taskId' => 'task-xyz'], 200)]);

        $plan = Plan::create([
            'name' => 'Pro',
            'slug' => 'pro',
            'max_concurrent_jobs' => 5,
            'monthly_credits' => 2000,
            'price_regular' => 149000,
            'quality_multiplier' => 1.5,
        ]);

        $this->user = User::factory()->create([
            'plan_id' => $plan->id,
            'credits' => 50000,
        ]);
    }

    public function test_image_edit_into_t2i_only_model_is_blocked(): void
    {
        $this->actingAs($this->user, 'api');
        $creditsBefore = $this->user->credits;

        // surface=image + an `image` input => image_editing; qwen-image-max is t2i-only.
        $response = $this->postJson('/api/daemon/projects/proj-guard/media/generate', [
            'surface' => 'image',
            'capability' => 'i2i',
            'prompt' => 'Chỉnh sửa ảnh này',
            'model' => 'qwen-image-max',
            'image' => 'https://example.com/source.png',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('error', 'image_edit_unavailable');

        // No job created, no credits reserved/deducted.
        $this->assertSame(0, RenderJob::where('user_id', $this->user->id)->count());
        $this->assertSame($creditsBefore, $this->user->fresh()->credits);
    }

    public function test_image_edit_into_edit_capable_model_is_allowed(): void
    {
        $this->actingAs($this->user, 'api');

        // qwen-image-edit supports i2i/inpaint — guard must NOT block it.
        $response = $this->postJson('/api/daemon/projects/proj-ok-edit/media/generate', [
            'surface' => 'image',
            'capability' => 'i2i',
            'prompt' => 'Chỉnh sửa ảnh này',
            'model' => 'qwen-image-edit',
            'image' => 'https://example.com/source.png',
        ]);

        $this->assertNotSame('image_edit_unavailable', $response->json('error'));
        $this->assertSame(1, RenderJob::where('user_id', $this->user->id)->count());
    }

    public function test_plain_text_to_image_generation_is_not_blocked(): void
    {
        $this->actingAs($this->user, 'api');

        // No `image` input => image_generation; t2i-only model is perfectly valid here.
        $response = $this->postJson('/api/daemon/projects/proj-t2i/media/generate', [
            'surface' => 'image',
            'capability' => 't2i',
            'prompt' => 'Một chú mèo phi hành gia',
            'model' => 'qwen-image-max',
        ]);

        $this->assertNotSame('image_edit_unavailable', $response->json('error'));
        $this->assertSame(1, RenderJob::where('user_id', $this->user->id)->count());
    }
}

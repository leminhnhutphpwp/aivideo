<?php
namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssetApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private User $otherUser;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        Plan::create([
            'slug' => 'free',
            'name' => 'Free',
            'monthly_credits' => 300,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
        ]);

        $this->user = User::factory()->create([
            'password' => bcrypt('password123'),
            'plan_id' => Plan::first()->id,
        ]);

        $this->otherUser = User::factory()->create([
            'password' => bcrypt('password123'),
            'plan_id' => Plan::first()->id,
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => $this->user->email,
            'password' => 'password123',
        ]);
        $this->token = $loginResponse->json('data.token');
    }

    protected function authHeaders(): array
    {
        return ['Authorization' => 'Bearer ' . $this->token];
    }

    public function test_index_returns_empty_list(): void
    {
        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/assets');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
        $this->assertCount(0, $response->json('data.items'));
    }

    public function test_index_returns_user_assets(): void
    {
        $asset = Asset::create([
            'uuid' => 'test-asset-uuid',
            'user_id' => $this->user->id,
            'type' => 'video',
            'path' => 'videos/test.mp4',
            'original_name' => 'test.mp4',
            'size_bytes' => 1024,
            'mime_type' => 'video/mp4',
        ]);

        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/assets');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data.items'));
        $this->assertEquals('test-asset-uuid', $response->json('data.items.0.uuid'));
        $this->assertEquals('video', $response->json('data.items.0.type'));
    }

    public function test_index_requires_auth(): void
    {
        $this->getJson('/api/assets')->assertStatus(401);
    }

    public function test_show_returns_asset(): void
    {
        $asset = Asset::create([
            'uuid' => 'show-asset-uuid',
            'user_id' => $this->user->id,
            'type' => 'video',
            'path' => 'videos/show.mp4',
            'original_name' => 'show.mp4',
            'size_bytes' => 2048,
            'mime_type' => 'video/mp4',
        ]);

        $response = $this->withHeaders($this->authHeaders())
            ->getJson("/api/assets/{$asset->uuid}");

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
        $this->assertEquals('show-asset-uuid', $response->json('data.uuid'));
    }

    public function test_show_returns_404_for_nonexistent(): void
    {
        $this->withHeaders($this->authHeaders())
            ->getJson('/api/assets/99999')
            ->assertStatus(404);
    }

    public function test_show_cannot_view_other_users_asset(): void
    {
        $otherAsset = Asset::create([
            'uuid' => 'other-asset-uuid',
            'user_id' => $this->otherUser->id,
            'type' => 'video',
            'path' => 'videos/other.mp4',
            'original_name' => 'other.mp4',
            'size_bytes' => 512,
            'mime_type' => 'video/mp4',
        ]);

        $this->withHeaders($this->authHeaders())
            ->getJson("/api/assets/{$otherAsset->uuid}")
            ->assertStatus(403);
    }

    public function test_show_requires_auth(): void
    {
        $this->getJson('/api/assets/1')->assertStatus(401);
    }
}

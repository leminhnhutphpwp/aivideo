<?php
namespace Tests\Feature;

use App\Models\ApiKey;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiKeyTest extends TestCase
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
            ->getJson('/api/api-keys');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
        $this->assertCount(0, $response->json('data'));
    }

    public function test_index_returns_user_keys(): void
    {
        $key = ApiKey::create([
            'user_id' => $this->user->id,
            'name' => 'My API Key',
            'key' => hash('sha256', 'pv_' . strtolower(\Illuminate\Support\Str::random(32))),
            'prefix' => 'pv_' . \Illuminate\Support\Str::random(8),
        ]);

        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/api-keys');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('My API Key', $response->json('data.0.name'));
    }

    public function test_index_requires_auth(): void
    {
        $this->getJson('/api/api-keys')->assertStatus(401);
    }

    public function test_create_success(): void
    {
        $response = $this->withHeaders($this->authHeaders())
            ->postJson('/api/api-keys', ['name' => 'My New Key']);

        $response->assertStatus(201)
            ->assertJsonStructure(['api_key', 'plain_text_key']);

        $this->assertEquals('My New Key', $response->json('api_key.name'));
        $this->assertStringStartsWith('pv_', $response->json('api_key.prefix'));
    }

    public function test_create_requires_name(): void
    {
        $this->withHeaders($this->authHeaders())
            ->postJson('/api/api-keys', [])
            ->assertStatus(422);
    }

    public function test_create_requires_auth(): void
    {
        $this->postJson('/api/api-keys', ['name' => 'Test'])
            ->assertStatus(401);
    }

    public function test_delete_success(): void
    {
        $key = ApiKey::create([
            'user_id' => $this->user->id,
            'name' => 'To Delete',
            'key' => hash('sha256', 'test_key'),
            'prefix' => 'pv_test123',
        ]);

        $this->withHeaders($this->authHeaders())
            ->deleteJson("/api/api-keys/{$key->id}")
            ->assertStatus(204);

        $this->assertDatabaseMissing('api_keys', ['id' => $key->id]);
    }

    public function test_delete_cannot_delete_other_users_key(): void
    {
        $otherKey = ApiKey::create([
            'user_id' => $this->otherUser->id,
            'name' => 'Other Key',
            'key' => hash('sha256', 'other_key'),
            'prefix' => 'pv_other99',
        ]);

        $this->withHeaders($this->authHeaders())
            ->deleteJson("/api/api-keys/{$otherKey->id}")
            ->assertStatus(403);
    }

    public function test_delete_requires_auth(): void
    {
        $this->deleteJson('/api/api-keys/1')->assertStatus(401);
    }
}

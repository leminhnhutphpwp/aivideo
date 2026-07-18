<?php
namespace Tests\Feature;

use App\Models\Plan;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlanApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PlanSeeder::class);

        $this->user = User::factory()->create([
            'password' => bcrypt('password123'),
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

    public function test_index_returns_all_plans(): void
    {
        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/plans');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $data = $response->json('data');
        $this->assertCount(3, $data);
    }

    public function test_index_returns_correct_structure(): void
    {
        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/plans');

        $response->assertStatus(200);

        $plan = $response->json('data.0');
        $this->assertArrayHasKey('slug', $plan);
        $this->assertArrayHasKey('name', $plan);
        $this->assertArrayHasKey('description', $plan);
        $this->assertArrayHasKey('max_concurrent_jobs', $plan);
        $this->assertArrayHasKey('queue_priority', $plan);
        $this->assertArrayHasKey('monthly_credits', $plan);
        $this->assertArrayHasKey('price_regular', $plan);
        $this->assertArrayHasKey('price_sale', $plan);
        $this->assertArrayHasKey('audio_generation', $plan);
        $this->assertArrayHasKey('status', $plan);
    }

    public function test_index_does_not_expose_hidden_fields(): void
    {
        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/plans');

        $plan = $response->json('data.0');
        $this->assertArrayNotHasKey('id', $plan);
    }

    public function test_index_has_free_pro_studio(): void
    {
        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/plans');

        $slugs = collect($response->json('data'))->pluck('slug')->toArray();
        $this->assertContains('free', $slugs);
        $this->assertContains('pro', $slugs);
        $this->assertContains('studio', $slugs);
    }

    public function test_index_requires_auth(): void
    {
        $this->getJson('/api/plans')->assertStatus(401);
    }

    public function test_show_returns_plan_by_slug(): void
    {
        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/plans/pro');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $plan = $response->json('data');
        $this->assertEquals('pro', $plan['slug']);
        $this->assertEquals('Pro', $plan['name']);
        $this->assertArrayHasKey('price_regular', $plan);
        $this->assertArrayHasKey('max_concurrent_jobs', $plan);
    }

    public function test_show_returns_correct_structure(): void
    {
        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/plans/free');

        $response->assertStatus(200);

        $plan = $response->json('data');
        $this->assertArrayHasKey('slug', $plan);
        $this->assertArrayHasKey('name', $plan);
        $this->assertArrayHasKey('monthly_credits', $plan);
        $this->assertArrayNotHasKey('id', $plan);
    }

    public function test_show_returns_404_for_nonexistent_slug(): void
    {
        $this->withHeaders($this->authHeaders())
            ->getJson('/api/plans/nonexistent')
            ->assertStatus(404);
    }

    public function test_show_requires_auth(): void
    {
        $this->getJson('/api/plans/free')->assertStatus(401);
    }

    public function test_free_plan_values(): void
    {
        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/plans/free');

        $plan = $response->json('data');
        $this->assertEquals(0, $plan['price_regular']);
        $this->assertEquals(1, $plan['max_concurrent_jobs']);
        $this->assertEquals('low', $plan['queue_priority']);
    }

    public function test_pro_plan_values(): void
    {
        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/plans/pro');

        $plan = $response->json('data');
        $this->assertGreaterThan(0, $plan['price_regular']);
        $this->assertGreaterThan(1, $plan['max_concurrent_jobs']);
        $this->assertEquals('active', $plan['status']);
    }
}

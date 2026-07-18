<?php
namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_auth_required_for_protected_routes(): void
    {
        $response = $this->getJson('/api/render-jobs');
        $response->assertStatus(401);
    }

    public function test_health_endpoint_is_public(): void
    {
        $response = $this->getJson('/api/health');
        $response->assertStatus(200);
    }

    public function test_plans_endpoint_requires_auth(): void
    {
        $response = $this->getJson('/api/plans');
        $response->assertStatus(401);
    }
}

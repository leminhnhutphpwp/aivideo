<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Plan;
use App\Models\VideoType;
use App\Models\DurationTier;
use App\Models\ResolutionPricing;
use App\Models\CreditSetting;
use App\Models\PricingAuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PricingApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected string $token;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Seed pricing data
        $this->seedPricingData();

        // Create test user
        $this->user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        // Login to get token
        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $this->token = $response->json('data.token');
    }

    protected function seedPricingData(): void
    {
        // Only seed if tables are empty
        if (\App\Models\VideoType::count() === 0) {
            $this->artisan('db:seed', ['--class' => 'PricingSystemSeeder']);
        }
        
        if (\App\Models\CreditSetting::count() === 0) {
            $this->artisan('db:seed', ['--class' => 'CreditSettingsSeeder']);
        }

        if (\App\Models\Plan::count() === 0) {
            $this->artisan('db:seed', ['--class' => 'PlanSeeder']);
        }
    }

    public function test_config_endpoint_requires_auth()
    {
        $response = $this->getJson('/api/v1/pricing/config');

        $response->assertStatus(401);
    }

    public function test_config_endpoint_returns_all_options()
    {
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->getJson('/api/v1/pricing/config');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'cached' => true,
                'cache_ttl' => 300,
            ])
            ->assertJsonStructure([
                'success',
                'data' => [
                    'video_types',
                    'durations',
                    'resolutions',
                    'qualities',
                    'providers',
                ],
                'cached',
                'cache_ttl',
                'timestamp',
            ]);

        $data = $response->json('data');
        $this->assertCount(8, $data['video_types']);
        $this->assertCount(4, $data['durations']);
        // Only active resolutions are returned (480p is seeded inactive) → 720p + 1080p
        $this->assertCount(2, $data['resolutions']);
        $this->assertCount(3, $data['qualities']);
    }

    public function test_config_endpoint_filters_by_video_type()
    {
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->getJson('/api/v1/pricing/config?video_type=text_to_video');

        $response->assertStatus(200);
        
        $videoTypes = $response->json('data.video_types');
        $this->assertCount(1, $videoTypes);
        $this->assertEquals('text_to_video', $videoTypes[0]['code']);
    }

    public function test_calculate_endpoint_requires_auth()
    {
        $response = $this->postJson('/api/v1/pricing/calculate', []);

        $response->assertStatus(401);
    }

    public function test_calculate_endpoint_validates_required_fields()
    {
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->postJson('/api/v1/pricing/calculate', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['video_type', 'duration', 'resolution', 'quality']);
    }

    public function test_calculate_endpoint_validates_video_type()
    {
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->postJson('/api/v1/pricing/calculate', [
            'video_type' => 'invalid_type',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('video_type');
    }

    public function test_calculate_endpoint_basic()
    {
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->postJson('/api/v1/pricing/calculate', [
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'pricing' => [
                        // base 1500 × duration 5s (1.10) × 720p (1.0) × standard (1.0)
                        'total_credits' => 1650,
                    ],
                ],
            ])
            ->assertJsonStructure([
                'success',
                'data' => [
                    'breakdown' => [
                        'video_type',
                        'duration',
                        'resolution',
                        'quality',
                        'provider',
                        'quantity',
                    ],
                    'pricing' => [
                        'subtotal',
                        'total_credits',
                        'vnd_equivalent',
                        'exchange_rate',
                    ],
                    'user_plan',
                    'validation',
                ],
                'calculation_id',
                'valid_until',
                'timestamp',
            ]);
    }

    public function test_calculate_endpoint_with_provider()
    {
        $this->user->plan->update([
            'provider_config' => [
                'qwencloud' => [
                    'is_enabled' => true,
                    'multiplier' => 1.15,
                ]
            ]
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->postJson('/api/v1/pricing/calculate', [
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
            'provider' => 'qwencloud',
            'provider_model' => 'wan2.7-r2v',
        ]);

        $response->assertStatus(200);
        // qwencloud applies multiplier 1.15: 1650 × 1.15 = 1897
        $this->assertEquals(1897, $response->json('data.pricing.total_credits'));
    }

    public function test_calculate_endpoint_with_quantity()
    {
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->postJson('/api/v1/pricing/calculate', [
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
            'quantity' => 5,
        ]);

        $response->assertStatus(200);
        // 1650 per unit × quantity 5 = 8250
        $this->assertEquals(8250, $response->json('data.pricing.total_credits'));
        $this->assertEquals(5, $response->json('data.breakdown.quantity'));
    }

    public function test_calculate_endpoint_creates_audit_log()
    {
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->postJson('/api/v1/pricing/calculate', [
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('pricing_audit_logs', [
            'user_id' => $this->user->id,
            'event_type' => 'calculation',
        ]);
    }

    public function test_validate_endpoint_requires_auth()
    {
        $response = $this->postJson('/api/v1/pricing/validate', []);

        $response->assertStatus(401);
    }

    public function test_validate_endpoint_invalid_calculation_id()
    {
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->postJson('/api/v1/pricing/validate', [
            'calculation_id' => 'invalid_id',
            'expected_total' => 100,
        ]);

        // Invalid calculation_id should return 422 (not found in cache)
        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_packages_endpoint_requires_auth()
    {
        $response = $this->getJson('/api/v1/pricing/packages');

        $response->assertStatus(401);
    }

    public function test_packages_endpoint_returns_packages()
    {
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->getJson('/api/v1/pricing/packages');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'cached' => true,
                'cache_ttl' => 600,
            ])
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'description',
                        'video_type',
                        'duration_seconds',
                        'resolution',
                        'included_addons',
                        'pricing',
                        'popular',
                    ],
                ],
                'cached',
                'cache_ttl',
                'timestamp',
            ]);
    }

    public function test_history_endpoint_requires_auth()
    {
        $response = $this->getJson('/api/v1/pricing/history');

        $response->assertStatus(401);
    }

    public function test_history_endpoint_returns_user_history()
    {
        // First, make a calculation
        $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->postJson('/api/v1/pricing/calculate', [
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
        ]);

        // Then get history
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->getJson('/api/v1/pricing/history');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'current_page',
                    'per_page',
                    'total',
                    'items' => [
                        '*' => [
                            'id',
                            'video_type',
                            'duration',
                            'resolution',
                            'total_credits',
                            'created_at',
                        ],
                    ],
                ],
                'timestamp',
            ]);
    }

}

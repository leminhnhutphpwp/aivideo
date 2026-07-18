<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\VideoType;
use App\Models\DurationTier;
use App\Models\ResolutionPricing;
use App\Models\PricingAuditLog;
use App\Services\Pricing\PricingCacheManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PricingSecurityTest extends TestCase
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
    }

    public function test_sql_injection_in_video_type()
    {
        $maliciousInput = "text_to_video'; DROP TABLE video_types; --";
        
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->postJson('/api/v1/pricing/calculate', [
            'video_type' => $maliciousInput,
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
        ]);

        // Should fail validation, not execute SQL
        $response->assertStatus(422);
        
        // Verify table still exists and has data
        $this->assertGreaterThan(0, VideoType::count());
    }

    public function test_sql_injection_in_duration()
    {
        $maliciousInput = "5s'; DROP TABLE duration_tiers; --";
        
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->postJson('/api/v1/pricing/calculate', [
            'video_type' => 'text_to_video',
            'duration' => $maliciousInput,
            'resolution' => '720p',
            'quality' => 'standard',
        ]);

        $response->assertStatus(422);
        $this->assertGreaterThan(0, DurationTier::count());
    }

    public function test_xss_in_response()
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
        
        // Verify no script tags in response
        $responseContent = $response->getContent();
        $this->assertStringNotContainsString('<script>', $responseContent);
        $this->assertStringNotContainsString('javascript:', $responseContent);
    }

    public function test_price_tampering_detection()
    {
        // Get a valid calculation
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->postJson('/api/v1/pricing/calculate', [
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
        ]);

        $calculationId = $response->json('calculation_id');
        $actualTotal = $response->json('data.pricing.total_credits');

        // Try to validate with tampered price
        $tamperedTotal = 1; // Try to pay 1 credit instead of actual price
        
        $validationResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->postJson('/api/v1/pricing/validate', [
            'calculation_id' => $calculationId,
            'expected_total' => $tamperedTotal,
        ]);

        $validationResponse->assertStatus(422)
            ->assertJson([
                'success' => false,
                'data' => [
                    'valid' => false,
                    'price_changed' => true,
                ],
            ]);
    }

    public function test_rate_limiting_on_calculate_endpoint()
    {
        // Make 15 requests (fraud detection threshold is >10, so 12th request triggers 429)
        for ($i = 0; $i < 15; $i++) {
            $response = $this->withHeaders([
                'Authorization' => 'Bearer ' . $this->token,
            ])->postJson('/api/v1/pricing/calculate', [
                'video_type' => 'text_to_video',
                'duration' => '5s',
                'resolution' => '720p',
                'quality' => 'standard',
            ]);

            if ($i >= 11) {
                $response->assertStatus(429); // Fraud detection after 11 calculations
            } else {
                $response->assertStatus(200);
            }
        }
    }

    public function test_rate_limiting_on_config_endpoint()
    {
        // Make 125 requests (throttle limit is 120/min)
        for ($i = 0; $i < 125; $i++) {
            $response = $this->withHeaders([
                'Authorization' => 'Bearer ' . $this->token,
            ])->getJson('/api/v1/pricing/config');

            if ($i >= 120) {
                $response->assertStatus(429);
            } else {
                $response->assertStatus(200);
            }
        }
    }

    public function test_fraud_detection_too_many_requests()
    {
        // Make 15 rapid requests (threshold is 10/min)
        for ($i = 0; $i < 15; $i++) {
            $response = $this->withHeaders([
                'Authorization' => 'Bearer ' . $this->token,
            ])->postJson('/api/v1/pricing/calculate', [
                'video_type' => 'text_to_video',
                'duration' => '5s',
                'resolution' => '720p',
                'quality' => 'standard',
            ]);

            // Fraud detection triggers when calculations exceed 10/min (count > 10),
            // so the 12th request (i >= 11) is the first to be blocked.
            if ($i >= 11) {
                $response->assertStatus(429);
            }
        }
    }

    public function test_audit_log_captures_all_requests()
    {
        // Make a calculation
        $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->postJson('/api/v1/pricing/calculate', [
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
        ]);

        // Verify audit log was created
        $this->assertDatabaseHas('pricing_audit_logs', [
            'user_id' => $this->user->id,
            'event_type' => 'calculation',
        ]);

        $log = PricingAuditLog::where('user_id', $this->user->id)->first();
        $this->assertNotNull($log);
        $this->assertArrayHasKey('video_type', $log->request_data);
        $this->assertNotNull($log->ip_address);
        $this->assertNotNull($log->user_agent);
    }

    public function test_audit_log_captures_validation_attempts()
    {
        // Create a valid calculation first
        $calcResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->postJson('/api/v1/pricing/calculate', [
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
        ]);

        $calculationId = $calcResponse->json('calculation_id');

        // Try to validate with wrong price
        $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->postJson('/api/v1/pricing/validate', [
            'calculation_id' => $calculationId,
            'expected_total' => 1, // Wrong!
        ]);

        // Verify validation attempt was logged
        $this->assertDatabaseHas('pricing_audit_logs', [
            'user_id' => $this->user->id,
            'event_type' => 'validation',
        ]);
    }

    public function test_cache_manager_generates_unique_calculation_id()
    {
        $config = [
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
        ];

        $result = [
            'pricing' => ['total_credits' => 100],
        ];

        $id1 = PricingCacheManager::cache($config, $result, 300);
        $id2 = PricingCacheManager::cache($config, $result, 300);

        $this->assertNotEquals($id1, $id2);
        $this->assertStringStartsWith('calc_', $id1);
        $this->assertStringStartsWith('calc_', $id2);
    }

    public function test_cache_manager_signature_validation()
    {
        $config = [
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
        ];

        $result = [
            'pricing' => ['total_credits' => 100],
        ];

        $calculationId = PricingCacheManager::cache($config, $result, 300);

        // Valid signature
        $validation = PricingCacheManager::validate($calculationId, 100);
        $this->assertTrue($validation['valid']);
        $this->assertFalse($validation['price_changed']);

        // Tampered price
        $validation = PricingCacheManager::validate($calculationId, 1);
        $this->assertFalse($validation['valid']);
        $this->assertTrue($validation['price_changed']);
    }

    public function test_cache_manager_expiration()
    {
        $config = [
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
        ];

        $result = [
            'pricing' => ['total_credits' => 100],
        ];

        // Cache for 1 second
        $calculationId = PricingCacheManager::cache($config, $result, 1);
        
        // Should exist
        $cached = PricingCacheManager::get($calculationId);
        $this->assertNotNull($cached);

        // Wait for expiration
        sleep(2);

        // Should be expired
        $cached = PricingCacheManager::get($calculationId);
        $this->assertNull($cached);
    }

    public function test_unauthorized_user_cannot_access_api()
    {
        $response = $this->getJson('/api/v1/pricing/config');
        $response->assertStatus(401);

        $response = $this->postJson('/api/v1/pricing/calculate', []);
        $response->assertStatus(401);

        $response = $this->getJson('/api/v1/pricing/packages');
        $response->assertStatus(401);

        $response = $this->getJson('/api/v1/pricing/history');
        $response->assertStatus(401);
    }

    public function test_max_quantity_limit()
    {
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->postJson('/api/v1/pricing/calculate', [
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
            'quantity' => 101, // Over limit of 100
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('quantity');
    }

    public function test_quantity_minimum()
    {
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->postJson('/api/v1/pricing/calculate', [
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
            'quantity' => 0,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('quantity');
    }
}

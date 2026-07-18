<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\User;
use App\Models\WhitelistIp;
use App\Services\AntiAbuse\AntiAbuseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class RegistrationAbuseTest extends TestCase
{
    use RefreshDatabase;

    protected AntiAbuseService $antiAbuse;
    protected Plan $freePlan;

    protected function setUp(): void
    {
        parent::setUp();

        // Clear cache để tránh IP bị block từ các test trước
        Cache::flush();

        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'panel_user', 'guard_name' => 'web']);

        $this->antiAbuse = app(AntiAbuseService::class);

        $this->freePlan = Plan::create([
            'name' => 'Free',
            'slug' => 'free',
            'price_regular' => 0,
            'monthly_credits' => 2000,
            'bonus_credits' => 2000,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
        ]);
    }

    /** @test */
    public function register_credits_zero_before_verify()
    {
        $response = $this->call('POST', '/api/auth/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ], [], [], ['REMOTE_ADDR' => '10.0.0.10']);

        $response->assertStatus(201);
        $user = User::where('email', 'test@example.com')->first();

        $this->assertNotNull($user);
        $this->assertEquals(0, $user->credits, 'User must have 0 credits before email verification');
        $this->assertNull($user->email_verified_at);
    }

    /** @test */
    public function verify_email_grants_credits()
    {
        $this->call('POST', '/api/auth/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ], [], [], ['REMOTE_ADDR' => '10.0.0.11']);

        $login = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $token = $login->json('data.token');
        $user = User::where('email', 'test@example.com')->first();

        $response = $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/auth/verify-email', [
                'code' => $user->email_verification_code,
            ]);

        $response->assertStatus(200);
        $user->refresh();

        $this->assertNotNull($user->email_verified_at);
        $this->assertEquals(2000, $user->credits, 'User must receive 2000 credits after email verification');
    }

    /** @test */
    public function register_with_disposable_email_blocked()
    {
        $response = $this->call('POST', '/api/auth/register', [
            'name' => 'Spammer',
            'email' => 'test@mailinator.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ], [], [], ['REMOTE_ADDR' => '10.0.0.12']);

        $response->assertStatus(429);
        $response->assertJson([
            'error' => 'DISPOSABLE_EMAIL',
        ]);
    }

    /** @test */
    public function ip_daily_limit_blocks_excess_registrations()
    {
        for ($i = 1; $i <= 2; $i++) {
            $response = $this->call('POST', '/api/auth/register', [
                'name' => "User {$i}",
                'email' => "user{$i}@test.com",
                'password' => 'password123',
                'password_confirmation' => 'password123',
            ], [], [], ['REMOTE_ADDR' => '10.0.0.1']);
            $response->assertStatus(201);
        }

        $response = $this->call('POST', '/api/auth/register', [
            'name' => 'User 3',
            'email' => 'user3@test.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ], [], [], ['REMOTE_ADDR' => '10.0.0.1']);

        $response->assertStatus(429);
        $this->assertEquals('IP_DAILY_LIMIT', $response->json('error'));
    }

    /** @test */
    public function ip_hourly_rate_limit_blocks_excess_attempts()
    {
        for ($i = 1; $i <= 2; $i++) {
            $this->call('POST', '/api/auth/register', [
                'name' => "User {$i}",
                'email' => "attempt{$i}@test.com",
                'password' => 'password123',
                'password_confirmation' => 'password123',
            ], [], [], ['REMOTE_ADDR' => '10.0.0.2']);
        }

        $response = $this->call('POST', '/api/auth/register', [
            'name' => 'User 3',
            'email' => 'attempt3@test.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ], [], [], ['REMOTE_ADDR' => '10.0.0.2']);

        $response->assertStatus(429);
        $this->assertEquals('IP_DAILY_LIMIT', $response->json('error'));
    }

    /** @test */
    public function whitelisted_ip_bypasses_all_checks()
    {
        WhitelistIp::create([
            'ip_address' => '10.0.0.100',
            'reason' => 'Testing whitelist',
        ]);

        for ($i = 1; $i <= 3; $i++) {
            $response = $this->call('POST', '/api/auth/register', [
                'name' => "Whitelist User {$i}",
                'email' => "whitelist{$i}@example.com",
                'password' => 'password123',
                'password_confirmation' => 'password123',
            ], [], [], ['REMOTE_ADDR' => '10.0.0.100']);
            $response->assertStatus(201);
        }

        $this->assertEquals(3, User::where('credits', 0)->count());
    }

    /** @test */
    public function blocked_ip_cannot_register()
    {
        Cache::put('anti_abuse:blocked:10.0.0.99', ['blocked_at' => now()], 3600);

        $response = $this->call('POST', '/api/auth/register', [
            'name' => 'Blocked User',
            'email' => 'blocked@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ], [], [], ['REMOTE_ADDR' => '10.0.0.99']);

        $response->assertStatus(403);
        $this->assertEquals('IP_BLOCKED', $response->json('error'));
    }

    /** @test */
    public function simulate_100_spam_registrations()
    {
        $successCount = 0;
        $blockedCount = 0;

        for ($i = 1; $i <= 100; $i++) {
            $ip = '10.0.1.' . (int)(($i - 1) / 3);

            $response = $this->call('POST', '/api/auth/register', [
                'name' => "Spam User {$i}",
                'email' => "spam{$i}@example.com",
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'User-Agent' => 'SpamBot/1.0',
            ], [], [], ['REMOTE_ADDR' => $ip]);

            if ($response->status() === 201) {
                $successCount++;
            } else {
                $blockedCount++;
            }
        }

        $this->assertLessThanOrEqual(68, $successCount, 'Spam registrations should be limited');
        $this->assertGreaterThan(0, $blockedCount, 'Some spam attempts should be blocked');

        echo "\n[SPAM SIMULATION] {$successCount} succeeded, {$blockedCount} blocked (100 attempts)\n";
    }

    /** @test */
    public function normal_user_flow_with_whitelist()
    {
        $admin = User::factory()->create();
        WhitelistIp::create([
            'ip_address' => '10.0.0.200',
            'reason' => 'Office IP',
            'created_by' => $admin->id,
        ]);

        $register = $this->call('POST', '/api/auth/register', [
            'name' => 'Real User',
            'email' => 'real@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ], [], [], ['REMOTE_ADDR' => '10.0.0.200']);
        $register->assertStatus(201);

        $user = User::where('email', 'real@example.com')->first();
        $this->assertEquals(0, $user->credits, 'Credits must be 0 before verify');
        $this->assertEquals($this->freePlan->id, $user->plan_id);

        $login = $this->postJson('/api/auth/login', [
            'email' => 'real@example.com',
            'password' => 'password123',
        ]);
        $login->assertStatus(200);
        $token = $login->json('data.token');

        $verify = $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/auth/verify-email', [
                'code' => $user->email_verification_code,
            ]);
        $verify->assertStatus(200);

        $user->refresh();
        $this->assertEquals(2000, $user->credits, 'Credits must be granted after verify');
        $this->assertNotNull($user->email_verified_at);
    }

    /** @test */
    public function verify_with_wrong_code_fails()
    {
        $this->call('POST', '/api/auth/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ], [], [], ['REMOTE_ADDR' => '10.0.0.13']);

        $login = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);
        $token = $login->json('data.token');

        $response = $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/auth/verify-email', [
                'code' => '000000',
            ]);

        $response->assertStatus(400);
    }

    /** @test */
    public function spam_attempts_logged_in_database()
    {
        for ($i = 1; $i <= 3; $i++) {
            $this->call('POST', '/api/auth/register', [
                'name' => "Log User {$i}",
                'email' => "logtest{$i}@example.com",
                'password' => 'password123',
                'password_confirmation' => 'password123',
            ], [], [], ['REMOTE_ADDR' => '10.0.0.50']);
        }

        $this->call('POST', '/api/auth/register', [
            'name' => 'Excess User',
            'email' => 'excess@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ], [], [], ['REMOTE_ADDR' => '10.0.0.50']);

        $this->assertGreaterThanOrEqual(1, \App\Models\RegistrationLog::count());
    }
}

<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Coupon;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

/**
 * Bao phủ 4 lớp bảo mật cho coupon redeem / event claim:
 *   Layer 4 (HMAC bff.verify), Layer 3 (turnstile), Layer 2 (coupon.guard velocity).
 */
class CouponSecurityMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();

        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'panel_user', 'guard_name' => 'web']);

        Plan::create([
            'name' => 'Free',
            'slug' => 'free',
            'monthly_credits' => 300,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
        ]);
    }

    private function makeUser(bool $verified = true): array
    {
        $factory = User::factory();
        if (! $verified) {
            $factory = $factory->unverified();
        }
        $user = $factory->create(['plan_id' => Plan::first()->id]);
        $user->assignRole('panel_user');

        return [$user, JWTAuth::fromUser($user)];
    }

    private function makeCoupon(string $code = 'GIFT100', int $value = 100): Coupon
    {
        return Coupon::create(['code' => $code, 'type' => 'credits', 'value' => $value, 'is_active' => true]);
    }

    /**
     * Tính chữ ký HMAC y hệt middleware VerifyBffSignature.
     *
     * @return array<string, string> headers
     */
    private function bffHeaders(string $secret, string $method, string $path, string $body, ?int $ts = null): array
    {
        $ts ??= time();
        $bodyHash = hash('sha256', $body);
        $canonical = "{$ts}." . strtoupper($method) . ".{$path}." . $bodyHash;
        $signature = hash_hmac('sha256', $canonical, $secret);

        return [
            'X-BFF-Timestamp' => (string) $ts,
            'X-BFF-Signature' => $signature,
        ];
    }

    // ── Layer 4 — HMAC ──────────────────────────────────────────────

    /** @test */
    public function bff_disabled_when_secret_unset_passes(): void
    {
        config(['coupon_security.bff_secret' => '']);
        [, $token] = $this->makeUser();
        $this->makeCoupon();

        $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/coupons/redeem', ['code' => 'GIFT100'])
            ->assertStatus(200);
    }

    /**
     * `->call()` bỏ qua withHeaders() (chỉ đọc serverVariables), nên phải nhét
     * mọi header vào mảng server dưới dạng HTTP_*. Dùng khi cần kiểm soát raw body.
     *
     * @return array<string, string>
     */
    private function serverWithBff(string $token, string $secret, string $path, string $body, ?int $ts = null): array
    {
        $h = $this->bffHeaders($secret, 'POST', $path, $body, $ts);

        return [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_AUTHORIZATION' => "Bearer {$token}",
            'HTTP_X_BFF_TIMESTAMP' => $h['X-BFF-Timestamp'],
            'HTTP_X_BFF_SIGNATURE' => $h['X-BFF-Signature'],
        ];
    }

    /** @test */
    public function bff_valid_signature_passes(): void
    {
        config(['coupon_security.bff_secret' => 'test-secret']);
        [, $token] = $this->makeUser();
        $this->makeCoupon();

        $body = json_encode(['code' => 'GIFT100']);
        $server = $this->serverWithBff($token, 'test-secret', '/api/coupons/redeem', $body);

        $this->call('POST', '/api/coupons/redeem', [], [], [], $server, $body)
            ->assertStatus(200);
    }

    /** @test */
    public function bff_missing_signature_rejected(): void
    {
        config(['coupon_security.bff_secret' => 'test-secret']);
        [, $token] = $this->makeUser();
        $this->makeCoupon();

        $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/coupons/redeem', ['code' => 'GIFT100'])
            ->assertStatus(403)
            ->assertJson(['success' => false, 'message' => 'Yêu cầu không hợp lệ.']);
    }

    /** @test */
    public function bff_wrong_signature_rejected(): void
    {
        config(['coupon_security.bff_secret' => 'test-secret']);
        [, $token] = $this->makeUser();
        $this->makeCoupon();

        $body = json_encode(['code' => 'GIFT100']);
        // Ký bằng secret sai → chữ ký lệch.
        $server = $this->serverWithBff($token, 'WRONG-secret', '/api/coupons/redeem', $body);

        $this->call('POST', '/api/coupons/redeem', [], [], [], $server, $body)
            ->assertStatus(403);
    }

    /** @test */
    public function bff_stale_timestamp_rejected(): void
    {
        config(['coupon_security.bff_secret' => 'test-secret', 'coupon_security.bff_max_skew' => 300]);
        [, $token] = $this->makeUser();
        $this->makeCoupon();

        $body = json_encode(['code' => 'GIFT100']);
        // Timestamp cách đây 1 giờ → lệch quá skew (nhưng chữ ký khớp timestamp đó).
        $server = $this->serverWithBff($token, 'test-secret', '/api/coupons/redeem', $body, time() - 3600);

        $this->call('POST', '/api/coupons/redeem', [], [], [], $server, $body)
            ->assertStatus(403);
    }

    // ── Layer 3 — Turnstile ─────────────────────────────────────────

    /** @test */
    public function turnstile_disabled_when_secret_unset_passes(): void
    {
        config(['coupon_security.turnstile_secret' => '']);
        [, $token] = $this->makeUser();
        $this->makeCoupon();

        $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/coupons/redeem', ['code' => 'GIFT100'])
            ->assertStatus(200);
    }

    /** @test */
    public function turnstile_valid_token_passes(): void
    {
        config(['coupon_security.turnstile_secret' => 'ts-secret']);
        Http::fake([
            'challenges.cloudflare.com/*' => Http::response(['success' => true], 200),
        ]);
        [, $token] = $this->makeUser();
        $this->makeCoupon();

        $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'CF-Turnstile-Response' => 'dummy-token',
        ])->postJson('/api/coupons/redeem', ['code' => 'GIFT100'])
            ->assertStatus(200);
    }

    /** @test */
    public function turnstile_failed_token_rejected(): void
    {
        config(['coupon_security.turnstile_secret' => 'ts-secret']);
        Http::fake([
            'challenges.cloudflare.com/*' => Http::response(['success' => false], 200),
        ]);
        [, $token] = $this->makeUser();
        $this->makeCoupon();

        $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'CF-Turnstile-Response' => 'bad-token',
        ])->postJson('/api/coupons/redeem', ['code' => 'GIFT100'])
            ->assertStatus(403)
            ->assertJson(['success' => false, 'message' => 'Xác minh chống bot thất bại, vui lòng thử lại.']);
    }

    // ── Layer 2 — Velocity / anti-farm ──────────────────────────────

    /** @test */
    public function velocity_unverified_user_rejected(): void
    {
        config(['coupon_security.require_verified_email' => true]);
        [, $token] = $this->makeUser(verified: false);
        $this->makeCoupon();

        $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/coupons/redeem', ['code' => 'GIFT100'])
            ->assertStatus(403)
            ->assertJson(['success' => false, 'message' => 'Bạn cần xác thực email trước khi dùng mã.']);
    }

    /** @test */
    public function velocity_verified_user_passes(): void
    {
        config(['coupon_security.require_verified_email' => true]);
        [, $token] = $this->makeUser(verified: true);
        $this->makeCoupon();

        $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/coupons/redeem', ['code' => 'GIFT100'])
            ->assertStatus(200);
    }

    /** @test */
    public function velocity_per_ip_daily_cap_blocks_second_call(): void
    {
        config([
            'coupon_security.require_verified_email' => true,
            'coupon_security.per_ip_daily_cap' => 1,
        ]);
        [, $token] = $this->makeUser(verified: true);
        $this->makeCoupon('GIFT1', 10);
        $this->makeCoupon('GIFT2', 10);

        $server = [
            'REMOTE_ADDR' => '9.9.9.9',
            'HTTP_AUTHORIZATION' => "Bearer {$token}",
            'HTTP_ACCEPT' => 'application/json',
            'CONTENT_TYPE' => 'application/json',
        ];

        $this->call('POST', '/api/coupons/redeem', [], [], [], $server, json_encode(['code' => 'GIFT1']))
            ->assertStatus(200);

        $this->call('POST', '/api/coupons/redeem', [], [], [], $server, json_encode(['code' => 'GIFT2']))
            ->assertStatus(429)
            ->assertJson(['success' => false, 'message' => 'Quá nhiều lượt từ mạng của bạn, vui lòng thử lại sau.']);
    }

    /** @test */
    public function velocity_new_account_rejected_when_min_age_set(): void
    {
        config([
            'coupon_security.require_verified_email' => true,
            'coupon_security.min_account_age_minutes' => 60,
        ]);
        // Tài khoản vừa tạo (created_at = now) → còn quá mới.
        [, $token] = $this->makeUser(verified: true);
        $this->makeCoupon();

        $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/coupons/redeem', ['code' => 'GIFT100'])
            ->assertStatus(429)
            ->assertJson(['success' => false, 'message' => 'Tài khoản còn quá mới, vui lòng thử lại sau ít phút.']);
    }
}

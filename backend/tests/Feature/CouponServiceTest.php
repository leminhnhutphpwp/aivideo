<?php

namespace Tests\Feature;

use App\Exceptions\CouponException;
use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\User;
use App\Services\CouponService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CouponServiceTest extends TestCase
{
    use RefreshDatabase;

    private function service(): CouponService
    {
        return app(CouponService::class);
    }

    private function user(int $credits = 0): User
    {
        return User::factory()->create(['credits' => $credits]);
    }

    /** @test */
    public function redeem_credits_coupon_adds_credits_and_records_redemption()
    {
        $user = $this->user(0);
        $coupon = Coupon::create(['code' => 'GIFT100', 'type' => 'credits', 'value' => 100, 'is_active' => true]);

        $result = $this->service()->redeemForCredits('gift100', $user); // normalize lowercase

        $this->assertEquals(100, $result['credits_added']);
        $this->assertEquals(100, $user->fresh()->credits);
        $this->assertEquals(1, $coupon->fresh()->used_count);
        $this->assertDatabaseHas('coupon_redemptions', [
            'coupon_id' => $coupon->id,
            'user_id' => $user->id,
            'status' => 'completed',
            'credits_granted' => 100,
        ]);
    }

    /** @test */
    public function invalid_or_inactive_or_expired_codes_are_rejected()
    {
        $user = $this->user();

        $this->expectException(CouponException::class);
        $this->service()->redeemForCredits('NOPE', $user);
    }

    /** @test */
    public function per_user_limit_blocks_second_redeem()
    {
        $user = $this->user();
        Coupon::create(['code' => 'ONCE', 'type' => 'credits', 'value' => 50, 'is_active' => true, 'max_uses_per_user' => 1]);

        $this->service()->redeemForCredits('ONCE', $user);

        $this->expectException(CouponException::class);
        $this->service()->redeemForCredits('ONCE', $user);
    }

    /** @test */
    public function total_max_uses_is_enforced()
    {
        $coupon = Coupon::create(['code' => 'LIMIT1', 'type' => 'credits', 'value' => 10, 'is_active' => true, 'max_uses' => 1]);

        $this->service()->redeemForCredits('LIMIT1', $this->user());
        $this->assertEquals(1, $coupon->fresh()->used_count);

        $this->expectException(CouponException::class);
        $this->service()->redeemForCredits('LIMIT1', $this->user());
    }

    /** @test */
    public function percent_discount_respects_cap_and_min_purchase()
    {
        $user = $this->user();
        Coupon::create([
            'code' => 'SALE20', 'type' => 'percent', 'value' => 20,
            'max_discount' => 30000, 'min_purchase_amount' => 100000, 'is_active' => true,
        ]);

        // 20% của 200.000 = 40.000 nhưng trần 30.000
        $preview = $this->service()->previewDiscount('SALE20', $user, 200000);
        $this->assertEquals(30000, $preview['discount_amount']);
        $this->assertEquals(170000, $preview['final_amount']);

        // Dưới đơn tối thiểu → chặn
        $this->expectException(CouponException::class);
        $this->service()->previewDiscount('SALE20', $user, 50000);
    }

    /** @test */
    public function fixed_discount_never_exceeds_amount()
    {
        $user = $this->user();
        Coupon::create(['code' => 'MINUS50', 'type' => 'fixed', 'value' => 50000, 'is_active' => true]);

        $preview = $this->service()->previewDiscount('MINUS50', $user, 30000);
        $this->assertEquals(30000, $preview['discount_amount']); // không vượt quá số tiền
        $this->assertEquals(0, $preview['final_amount']);
    }

    /** @test */
    public function credits_coupon_cannot_be_used_as_discount_and_vice_versa()
    {
        $user = $this->user();
        Coupon::create(['code' => 'CR', 'type' => 'credits', 'value' => 100, 'is_active' => true]);
        Coupon::create(['code' => 'DISC', 'type' => 'fixed', 'value' => 10000, 'is_active' => true]);

        $this->expectException(CouponException::class);
        $this->service()->previewDiscount('CR', $user, 100000); // credits coupon không dùng để giảm giá
    }

    /** @test */
    public function issue_welcome_grants_once_per_user()
    {
        $user = $this->user(0);
        Coupon::create(['code' => 'WELCOME', 'type' => 'credits', 'value' => 500, 'is_welcome' => true, 'is_active' => true]);

        $this->service()->issueWelcome($user);
        $this->assertEquals(500, $user->fresh()->credits);

        // Gọi lần nữa không cộng thêm.
        $this->service()->issueWelcome($user);
        $this->assertEquals(500, $user->fresh()->credits);
        $this->assertEquals(1, CouponRedemption::where('user_id', $user->id)->count());
    }
}

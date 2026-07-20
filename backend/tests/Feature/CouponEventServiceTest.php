<?php

namespace Tests\Feature;

use App\Exceptions\CouponException;
use App\Models\Coupon;
use App\Models\CouponEvent;
use App\Models\User;
use App\Services\CouponEventService;
use App\Services\CouponService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CouponEventServiceTest extends TestCase
{
    use RefreshDatabase;

    private function service(): CouponEventService
    {
        return app(CouponEventService::class);
    }

    private function user(int $credits = 0): User
    {
        return User::factory()->create(['credits' => $credits]);
    }

    private function event(array $attrs = []): CouponEvent
    {
        return CouponEvent::create(array_merge([
            'name' => 'Sự kiện Test',
            'slug' => 'su-kien-test',
            'reward_type' => 'credits',
            'reward_value' => 100,
            'is_active' => true,
            'is_public' => true,
        ], $attrs));
    }

    /** @test */
    public function claim_mints_a_unique_code_bound_to_the_user()
    {
        $user = $this->user();
        $event = $this->event(['code_prefix' => 'TET']);

        $coupon = $this->service()->claim($event, $user);

        $this->assertEquals($user->id, $coupon->user_id);
        $this->assertEquals($event->id, $coupon->coupon_event_id);
        $this->assertEquals('credits', $coupon->type);
        $this->assertEquals(100, $coupon->value);
        $this->assertStringStartsWith('TET-', $coupon->code);
        $this->assertEquals(1, $event->fresh()->claims_count);
    }

    /** @test */
    public function second_claim_returns_same_code_and_does_not_increment()
    {
        $user = $this->user();
        $event = $this->event();

        $first = $this->service()->claim($event, $user);
        $second = $this->service()->claim($event, $user);

        $this->assertEquals($first->id, $second->id);
        $this->assertEquals($first->code, $second->code);
        $this->assertEquals(1, $event->fresh()->claims_count);
        $this->assertEquals(1, Coupon::where('coupon_event_id', $event->id)->count());
    }

    /** @test */
    public function max_claims_blocks_the_next_user()
    {
        $event = $this->event(['max_claims' => 1]);

        $this->service()->claim($event, $this->user());
        $this->assertEquals(1, $event->fresh()->claims_count);

        $this->expectException(CouponException::class);
        $this->expectExceptionMessage('Sự kiện đã hết lượt nhận.');
        $this->service()->claim($event->fresh(), $this->user());
    }

    /** @test */
    public function past_end_date_blocks_claim()
    {
        $event = $this->event(['ends_at' => now()->subDay()]);

        $this->expectException(CouponException::class);
        $this->expectExceptionMessage('Sự kiện đã kết thúc.');
        $this->service()->claim($event, $this->user());
    }

    /** @test */
    public function require_verified_blocks_unverified_user()
    {
        $event = $this->event(['require_verified' => true]);
        $user = User::factory()->unverified()->create();

        $this->expectException(CouponException::class);
        $this->expectExceptionMessage('Bạn cần xác thực email trước.');
        $this->service()->claim($event, $user);
    }

    /** @test */
    public function minted_credits_code_redeems_via_coupon_service_and_adds_credits()
    {
        $user = $this->user(0);
        $event = $this->event(['reward_value' => 250]);

        $coupon = $this->service()->claim($event, $user);
        $result = app(CouponService::class)->redeemForCredits($coupon->code, $user);

        $this->assertEquals(250, $result['credits_added']);
        $this->assertEquals(250, $user->fresh()->credits);
    }

    /** @test */
    public function code_owned_by_another_user_cannot_be_redeemed()
    {
        $userA = $this->user();
        $userB = $this->user();
        $event = $this->event();

        $coupon = $this->service()->claim($event, $userA);

        $this->expectException(CouponException::class);
        $this->expectExceptionMessage('Mã này không thuộc về bạn.');
        app(CouponService::class)->redeemForCredits($coupon->code, $userB);
    }

    /** @test */
    public function auto_grant_creates_and_redeems_a_signup_event()
    {
        $user = $this->user(0);
        $this->event([
            'name' => 'Auto Grant',
            'slug' => 'auto-grant',
            'reward_value' => 300,
            'trigger' => 'signup',
        ]);

        $this->service()->autoGrant($user);

        $this->assertEquals(300, $user->fresh()->credits);
        $coupon = Coupon::where('user_id', $user->id)->first();
        $this->assertNotNull($coupon);
        $this->assertEquals(1, $coupon->used_count);
    }

    /** @test */
    public function grant_birthday_mints_credits_code_and_adds_credits()
    {
        $user = $this->user(0);
        $this->event([
            'name' => 'Sinh nhật',
            'slug' => 'sinh-nhat',
            'reward_value' => 200,
            'trigger' => 'birthday',
        ]);

        $coupon = $this->service()->grantBirthdayFor($user);

        $this->assertNotNull($coupon);
        $this->assertEquals($user->id, $coupon->user_id);
        $this->assertEquals('credits', $coupon->type);
        $this->assertEquals(200, $user->fresh()->credits);
    }

    /** @test */
    public function grant_birthday_is_idempotent_within_the_same_year()
    {
        $user = $this->user(0);
        $this->event([
            'name' => 'Sinh nhật',
            'slug' => 'sinh-nhat',
            'reward_value' => 200,
            'trigger' => 'birthday',
        ]);

        $first = $this->service()->grantBirthdayFor($user);
        $this->assertNotNull($first);
        $this->assertEquals(200, $user->fresh()->credits);

        $second = $this->service()->grantBirthdayFor($user);
        $this->assertNull($second);
        $this->assertEquals(200, $user->fresh()->credits); // không cộng thêm
    }

    /** @test */
    public function grant_birthday_returns_null_when_no_active_birthday_event()
    {
        $user = $this->user(0);
        // Chỉ có event manual, không có birthday.
        $this->event(['slug' => 'khong-phai-sinh-nhat']);

        $this->assertNull($this->service()->grantBirthdayFor($user));
        $this->assertEquals(0, $user->fresh()->credits);
    }

    /** @test */
    public function birthday_command_grants_todays_birthday_and_skips_others()
    {
        $this->event([
            'name' => 'Sinh nhật',
            'slug' => 'sinh-nhat',
            'reward_value' => 150,
            'trigger' => 'birthday',
        ]);

        $today = User::factory()->create([
            'credits' => 0,
            'is_active' => true,
            'email_verified_at' => now(),
            'date_of_birth' => now()->subYears(25),
        ]);
        $notToday = User::factory()->create([
            'credits' => 0,
            'is_active' => true,
            'email_verified_at' => now(),
            'date_of_birth' => now()->subYears(30)->addDays(3),
        ]);

        $this->artisan('events:grant-birthday')->assertSuccessful();

        $this->assertEquals(150, $today->fresh()->credits);
        $this->assertEquals(0, $notToday->fresh()->credits);
    }
}

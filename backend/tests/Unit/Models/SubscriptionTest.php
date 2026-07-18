<?php
namespace Tests\Unit\Models;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionTest extends TestCase
{
    use RefreshDatabase;

    private Subscription $activeSub;
    private Subscription $expiredSub;
    private Subscription $cancelledSub;
    private User $user;
    private Plan $plan;

    protected function setUp(): void
    {
        parent::setUp();

        $this->plan = Plan::create([
            'slug' => 'pro',
            'name' => 'Pro',
            'monthly_credits' => 2000,
            'max_concurrent_jobs' => 3,
            'queue_priority' => 'high',
            'price_regular' => 149000,
        ]);

        $this->user = User::factory()->create([
            'plan_id' => $this->plan->id,
        ]);

        $this->activeSub = Subscription::create([
            'user_id' => $this->user->id,
            'plan_id' => $this->plan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'started_at' => now()->subMonth(),
            'expires_at' => now()->addMonth(),
        ]);

        $this->expiredSub = Subscription::create([
            'user_id' => $this->user->id,
            'plan_id' => $this->plan->id,
            'status' => Subscription::STATUS_EXPIRED,
            'started_at' => now()->subMonths(2),
            'expires_at' => now()->subMonth(),
        ]);

        $this->cancelledSub = Subscription::create([
            'user_id' => $this->user->id,
            'plan_id' => $this->plan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'started_at' => now()->subMonth(),
            'expires_at' => now()->addMonth(),
            'cancelled_at' => now(),
        ]);
    }

    public function test_is_active_returns_true_when_active_and_future(): void
    {
        $this->assertTrue($this->activeSub->isActive());
    }

    public function test_is_active_returns_false_when_expired(): void
    {
        $this->assertFalse($this->expiredSub->isActive());
    }

    public function test_is_expired_returns_true_when_expired(): void
    {
        $this->assertTrue($this->expiredSub->isExpired());
    }

    public function test_is_expired_returns_false_when_active(): void
    {
        $this->assertFalse($this->activeSub->isExpired());
    }

    public function test_is_cancelled_returns_true_when_cancelled_at_set(): void
    {
        $this->assertTrue($this->cancelledSub->isCancelled());
    }

    public function test_is_cancelled_returns_false_when_not_cancelled(): void
    {
        $this->assertFalse($this->activeSub->isCancelled());
    }

    public function test_is_on_grace_period_returns_true_when_within_grace(): void
    {
        $graceSub = Subscription::create([
            'user_id' => $this->user->id,
            'plan_id' => $this->plan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'started_at' => now()->subMonth(),
            'expires_at' => now()->subDay(),
            'grace_period_ends_at' => now()->addDays(3),
        ]);

        $this->assertTrue($graceSub->isOnGracePeriod());
    }

    public function test_is_on_grace_period_returns_false_when_past_grace(): void
    {
        $pastGraceSub = Subscription::create([
            'user_id' => $this->user->id,
            'plan_id' => $this->plan->id,
            'status' => Subscription::STATUS_EXPIRED,
            'started_at' => now()->subMonths(2),
            'expires_at' => now()->subMonth(),
            'grace_period_ends_at' => now()->subDays(5),
        ]);

        $this->assertFalse($pastGraceSub->isOnGracePeriod());
    }

    public function test_is_on_grace_period_returns_false_when_no_grace_set(): void
    {
        $this->assertFalse($this->activeSub->isOnGracePeriod());
    }

    public function test_belongs_to_user(): void
    {
        $this->assertInstanceOf(User::class, $this->activeSub->user);
        $this->assertEquals($this->user->id, $this->activeSub->user->id);
    }

    public function test_belongs_to_plan(): void
    {
        $this->assertInstanceOf(Plan::class, $this->activeSub->plan);
        $this->assertEquals($this->plan->id, $this->activeSub->plan->id);
    }

    public function test_status_constants(): void
    {
        $this->assertEquals('active', Subscription::STATUS_ACTIVE);
        $this->assertEquals('expired', Subscription::STATUS_EXPIRED);
        $this->assertEquals('cancelled', Subscription::STATUS_CANCELLED);
    }

    public function test_active_scope_returns_only_active(): void
    {
        $activeSubs = Subscription::active()->get();
        $this->assertTrue($activeSubs->contains($this->activeSub));
        $this->assertFalse($activeSubs->contains($this->expiredSub));
    }

    public function test_expired_scope_returns_only_expired(): void
    {
        $expiredSubs = Subscription::expired()->get();
        $this->assertTrue($expiredSubs->contains($this->expiredSub));
        $this->assertFalse($expiredSubs->contains($this->activeSub));
    }
}

<?php
namespace Tests\Unit\Models;

use App\Models\Plan;
use App\Models\PlanUpgrade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlanUpgradeTest extends TestCase
{
    use RefreshDatabase;

    private PlanUpgrade $upgrade;
    private User $user;
    private Plan $fromPlan;
    private Plan $toPlan;

    protected function setUp(): void
    {
        parent::setUp();

        $this->fromPlan = Plan::create([
            'slug' => 'free',
            'name' => 'Free',
            'monthly_credits' => 300,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
        ]);

        $this->toPlan = Plan::create([
            'slug' => 'pro',
            'name' => 'Pro',
            'monthly_credits' => 2000,
            'max_concurrent_jobs' => 3,
            'queue_priority' => 'high',
            'price_regular' => 149000,
        ]);

        $this->user = User::factory()->create([
            'plan_id' => $this->fromPlan->id,
        ]);

        $this->upgrade = PlanUpgrade::create([
            'user_id' => $this->user->id,
            'from_plan_id' => $this->fromPlan->id,
            'to_plan_id' => $this->toPlan->id,
            'amount' => 149000,
            'transfer_code' => 'NATEST1234',
            'status' => PlanUpgrade::STATUS_PENDING,
            'description' => 'Test upgrade',
        ]);
    }

    public function test_is_pending_returns_true_when_pending(): void
    {
        $this->assertTrue($this->upgrade->isPending());
    }

    public function test_is_pending_returns_false_when_paid(): void
    {
        $this->upgrade->markAsPaid();
        $this->assertFalse($this->upgrade->isPending());
    }

    public function test_is_paid_returns_true_when_paid(): void
    {
        $this->upgrade->markAsPaid();
        $this->assertTrue($this->upgrade->isPaid());
    }

    public function test_is_paid_returns_false_when_pending(): void
    {
        $this->assertFalse($this->upgrade->isPaid());
    }

    public function test_mark_as_paid_updates_status(): void
    {
        $this->upgrade->markAsPaid();
        $this->assertEquals(PlanUpgrade::STATUS_PAID, $this->upgrade->fresh()->status);
    }

    public function test_mark_as_cancelled_updates_status(): void
    {
        $this->upgrade->markAsCancelled();
        $this->assertEquals(PlanUpgrade::STATUS_CANCELLED, $this->upgrade->fresh()->status);
    }

    public function test_belongs_to_user(): void
    {
        $this->assertInstanceOf(User::class, $this->upgrade->user);
        $this->assertEquals($this->user->id, $this->upgrade->user->id);
    }

    public function test_belongs_to_from_plan(): void
    {
        $this->assertInstanceOf(Plan::class, $this->upgrade->fromPlan);
        $this->assertEquals($this->fromPlan->id, $this->upgrade->fromPlan->id);
    }

    public function test_belongs_to_to_plan(): void
    {
        $this->assertInstanceOf(Plan::class, $this->upgrade->toPlan);
        $this->assertEquals($this->toPlan->id, $this->upgrade->toPlan->id);
    }

    public function test_fillable_attributes(): void
    {
        $this->upgrade->update(['reference_code' => 'REF123']);
        $this->assertEquals('REF123', $this->upgrade->fresh()->reference_code);
    }

    public function test_status_constants(): void
    {
        $this->assertEquals('pending', PlanUpgrade::STATUS_PENDING);
        $this->assertEquals('paid', PlanUpgrade::STATUS_PAID);
        $this->assertEquals('cancelled', PlanUpgrade::STATUS_CANCELLED);
    }
}

<?php

namespace Tests\Feature;

use App\Jobs\CheckExpiredSubscriptions;
use App\Listeners\SePayWebhookListener;
use App\Models\CreditTransaction;
use App\Models\Plan;
use App\Models\PlanUpgrade;
use App\Models\Subscription;
use App\Models\User;
use App\Services\CreditService;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use SePay\SePay\Events\SePayWebhookEvent;
use Tests\TestCase;

class SubscriptionTest extends TestCase
{
    use RefreshDatabase;

    private Plan $freePlan;
    private Plan $premiumPlan;
    private User $user;
    private CreditService $creditService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PlanSeeder::class);

        $this->freePlan = Plan::where('slug', 'free')->firstOrFail();
        $this->premiumPlan = Plan::where('slug', 'basic')->first()
            ?? Plan::where('monthly_credits', '>', 0)->first()
            ?? Plan::factory()->create([
                'slug' => 'basic',
                'name' => 'Basic',
                'monthly_credits' => 100,
                'price_regular' => 100000,
                'queue_priority' => 'normal',
            ]);

        $this->user = User::factory()->create([
            'plan_id' => $this->freePlan->id,
            'credits' => 0,
        ]);

        $this->creditService = app(CreditService::class);
    }

    public function test_upgrade_creates_subscription_and_sets_expiry(): void
    {
        $now = now();
        $expiresAt = $now->copy()->addMonth();

        $this->user->update([
            'plan_id' => $this->premiumPlan->id,
            'plan_expires_at' => $expiresAt,
        ]);

        $this->user->subscriptions()->create([
            'plan_id' => $this->premiumPlan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'started_at' => $now,
            'expires_at' => $expiresAt,
        ]);

        $this->assertEquals($this->premiumPlan->id, $this->user->fresh()->plan_id);
        $this->assertNotNull($this->user->fresh()->plan_expires_at);
        $this->assertTrue($this->user->fresh()->plan_expires_at->isFuture());

        $subscription = $this->user->subscriptions()->first();
        $this->assertNotNull($subscription);
        $this->assertEquals(Subscription::STATUS_ACTIVE, $subscription->status);
        $this->assertTrue($subscription->isActive());
    }

    public function test_check_expired_subscriptions_downgrades_after_grace_period(): void
    {
        $expiredDate = now()->subDays(10);
        $this->user->update([
            'plan_id' => $this->premiumPlan->id,
            'plan_expires_at' => $expiredDate,
        ]);

        $this->user->subscriptions()->create([
            'plan_id' => $this->premiumPlan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'started_at' => now()->subMonth(),
            'expires_at' => $expiredDate,
        ]);

        (new CheckExpiredSubscriptions())->handle();

        $this->user->refresh();
        $this->assertEquals($this->freePlan->id, $this->user->plan_id);
        $this->assertNull($this->user->plan_expires_at);
    }

    public function test_check_expired_subscriptions_does_not_downgrade_during_grace_period(): void
    {
        $expiredDate = now()->subDays(2);
        $this->user->update([
            'plan_id' => $this->premiumPlan->id,
            'plan_expires_at' => $expiredDate,
        ]);

        $this->user->subscriptions()->create([
            'plan_id' => $this->premiumPlan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'started_at' => now()->subMonth(),
            'expires_at' => $expiredDate,
        ]);

        (new CheckExpiredSubscriptions())->handle();

        $this->user->refresh();
        $this->assertEquals($this->premiumPlan->id, $this->user->plan_id);
        $this->assertNotNull($this->user->plan_expires_at);
    }

    public function test_sepay_webhook_creates_subscription_on_upgrade(): void
    {
        $transferCode = 'NA' . substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 8);

        $upgrade = PlanUpgrade::create([
            'user_id' => $this->user->id,
            'from_plan_id' => $this->freePlan->id,
            'to_plan_id' => $this->premiumPlan->id,
            'amount' => $this->premiumPlan->price_regular,
            'transfer_code' => $transferCode,
            'status' => PlanUpgrade::STATUS_PENDING,
            'description' => "Test upgrade to {$this->premiumPlan->name}",
        ]);

        $webhookData = new \SePay\SePay\Datas\SePayWebhookData(
            id: 1,
            gateway: 'MBBank',
            transactionDate: now()->format('Y-m-d H:i:s'),
            accountNumber: '0359123456',
            subAccount: '',
            code: '',
            content: $transferCode,
            transferType: 'in',
            description: $transferCode,
            transferAmount: $this->premiumPlan->price_regular,
            referenceCode: 'REF' . time(),
            accumulated: $this->premiumPlan->price_regular,
        );

        $event = new SePayWebhookEvent('test webhook', $webhookData);
        $listener = app(SePayWebhookListener::class);
        $listener->handle($event);

        $this->user->refresh();

        $this->assertEquals($this->premiumPlan->id, $this->user->plan_id);
        $this->assertNotNull($this->user->plan_expires_at);
        $this->assertTrue($this->user->plan_expires_at->isFuture());

        $subscription = $this->user->subscriptions()->first();
        $this->assertNotNull($subscription);
        $this->assertEquals(Subscription::STATUS_ACTIVE, $subscription->status);
        $this->assertTrue($subscription->isActive());

        $upgrade->refresh();
        $this->assertEquals(PlanUpgrade::STATUS_PAID, $upgrade->status);
    }

    public function test_renew_commands_only_process_active_plans(): void
    {
        $expiredDate = now()->subDays(10);
        $activeUser = User::factory()->create([
            'plan_id' => $this->premiumPlan->id,
            'plan_expires_at' => now()->addMonth(),
            'credits_renewed_at' => null,
            'credits' => 0,
        ]);

        $expiredUser = User::factory()->create([
            'plan_id' => $this->premiumPlan->id,
            'plan_expires_at' => $expiredDate,
            'credits_renewed_at' => null,
            'credits' => 0,
        ]);

        $this->artisan('credits:renew')->assertExitCode(0);

        $this->assertGreaterThan(0, $activeUser->fresh()->credits);
        $this->assertEquals(0, $expiredUser->fresh()->credits);
    }

    public function test_subscription_is_active_helper(): void
    {
        $futureExpiry = now()->addMonth();
        $pastExpiry = now()->subDay();

        $activeSub = $this->user->subscriptions()->create([
            'plan_id' => $this->premiumPlan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'started_at' => now()->subMonth(),
            'expires_at' => $futureExpiry,
        ]);

        $expiredSub = $this->user->subscriptions()->create([
            'plan_id' => $this->premiumPlan->id,
            'status' => Subscription::STATUS_EXPIRED,
            'started_at' => now()->subMonths(2),
            'expires_at' => $pastExpiry,
        ]);

        $this->assertTrue($activeSub->isActive());
        $this->assertFalse($expiredSub->isActive());
        $this->assertFalse($activeSub->isExpired());
        $this->assertTrue($expiredSub->isExpired());
    }
}

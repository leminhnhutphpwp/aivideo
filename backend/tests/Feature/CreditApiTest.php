<?php
namespace Tests\Feature;

use App\Models\CreditSetting;
use App\Models\CreditTransaction;
use App\Models\PendingCreditPurchase;
use App\Models\Plan;
use App\Models\PlanUpgrade;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreditApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PlanSeeder::class);

        $this->user = User::factory()->create([
            'password' => bcrypt('password123'),
            'plan_id' => Plan::where('slug', 'free')->first()->id,
            'credits' => 500,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => $this->user->email,
            'password' => 'password123',
        ]);

        $this->token = $response->json('data.token');
    }

    protected function authHeaders(): array
    {
        return ['Authorization' => 'Bearer ' . $this->token];
    }

    public function test_balance_returns_correct_credits(): void
    {
        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/credits/balance');

        $response->assertStatus(200)
            ->assertJson(['balance' => 500]);
    }

    public function test_balance_requires_auth(): void
    {
        $this->getJson('/api/credits/balance')->assertStatus(401);
    }

    public function test_purchase_success(): void
    {
        // Seed exchange_rate = 0.1 (1 VNĐ = 0.1 credits)
        CreditSetting::set('exchange_rate', '0.1', 'Exchange Rate');

        $response = $this->withHeaders($this->authHeaders())
            ->postJson('/api/credits/purchase', ['amount' => 50000]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message', 'bank' => ['bank', 'account', 'holder'],
                'amount', 'content', 'credits_to_receive', 'note',
            ]);

        $this->assertEquals(50000, $response->json('amount'));
        // 50,000 VNĐ × 0.1 exchange_rate = 5,000 credits
        $this->assertEquals(5000, $response->json('credits_to_receive'));

        $this->assertDatabaseHas('pending_credit_purchases', [
            'user_id' => $this->user->id,
            'amount' => 50000,
            'status' => PendingCreditPurchase::STATUS_PENDING,
        ]);
    }

    public function test_purchase_invalid_amount_too_small(): void
    {
        $response = $this->withHeaders($this->authHeaders())
            ->postJson('/api/credits/purchase', ['amount' => 1000]);

        $response->assertStatus(422);
    }

    public function test_purchase_invalid_amount_too_large(): void
    {
        $response = $this->withHeaders($this->authHeaders())
            ->postJson('/api/credits/purchase', ['amount' => 99999999]);

        $response->assertStatus(422);
    }

    public function test_purchase_requires_auth(): void
    {
        $this->postJson('/api/credits/purchase', ['amount' => 50000])
            ->assertStatus(401);
    }

    public function test_pending_purchases_returns_list(): void
    {
        PendingCreditPurchase::create([
            'user_id' => $this->user->id,
            'transfer_code' => 'DH' . strtoupper(\Illuminate\Support\Str::random(8)),
            'amount' => 100000,
            'credits' => 100,
        ]);

        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/credits/pending-purchases');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    public function test_pending_purchases_empty(): void
    {
        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/credits/pending-purchases');

        $response->assertStatus(200);
        $this->assertCount(0, $response->json('data'));
    }

    public function test_pending_purchases_requires_auth(): void
    {
        $this->getJson('/api/credits/pending-purchases')->assertStatus(401);
    }

    public function test_upgrade_success(): void
    {
        $proPlan = Plan::where('slug', 'pro')->first();

        $response = $this->withHeaders($this->authHeaders())
            ->postJson('/api/credits/upgrade', ['plan_slug' => 'pro']);

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure([
                'success', 'message', 'upgrade_transfer_code',
                'current_plan', 'target_plan', 'bank',
                'amount', 'content', 'plan_expires_at', 'note',
            ]);

        $this->assertEquals('Free', $response->json('current_plan'));
        $this->assertEquals('Pro', $response->json('target_plan'));

        $this->assertDatabaseHas('plan_upgrades', [
            'user_id' => $this->user->id,
            'from_plan_id' => $this->user->plan_id,
            'to_plan_id' => $proPlan->id,
            'status' => PlanUpgrade::STATUS_PENDING,
        ]);
    }

    public function test_upgrade_already_on_plan(): void
    {
        $this->withHeaders($this->authHeaders())
            ->postJson('/api/credits/upgrade', ['plan_slug' => 'free'])
            ->assertStatus(400)
            ->assertJson(['success' => false]);
    }

    public function test_upgrade_downgrade_blocked(): void
    {
        $proPlan = Plan::where('slug', 'pro')->first();
        $this->user->update(['plan_id' => $proPlan->id]);

        $response = $this->withHeaders($this->authHeaders())
            ->postJson('/api/credits/upgrade', ['plan_slug' => 'free']);

        $response->assertStatus(400)
            ->assertJson(['success' => false]);
    }

    public function test_upgrade_nonexistent_plan(): void
    {
        $this->withHeaders($this->authHeaders())
            ->postJson('/api/credits/upgrade', ['plan_slug' => 'nonexistent'])
            ->assertStatus(422);
    }

    public function test_upgrade_requires_auth(): void
    {
        $this->postJson('/api/credits/upgrade', ['plan_slug' => 'pro'])
            ->assertStatus(401);
    }

    public function test_upgrade_history_returns_list(): void
    {
        $proPlan = Plan::where('slug', 'pro')->first();
        PlanUpgrade::create([
            'user_id' => $this->user->id,
            'from_plan_id' => Plan::where('slug', 'free')->first()->id,
            'to_plan_id' => $proPlan->id,
            'amount' => $proPlan->price_sale ?? $proPlan->price_regular,
            'transfer_code' => 'NA' . strtoupper(\Illuminate\Support\Str::random(8)),
            'status' => PlanUpgrade::STATUS_PAID,
            'description' => 'Test upgrade',
        ]);

        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/credits/upgrade-history');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success', 'data' => ['items', 'page', 'per_page', 'total', 'last_page'],
        ]);
        $this->assertEquals(1, $response->json('data.total'));
    }

    public function test_upgrade_history_empty(): void
    {
        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/credits/upgrade-history');

        $response->assertStatus(200);
        $this->assertEquals(0, $response->json('data.total'));
    }

    public function test_upgrade_history_requires_auth(): void
    {
        $this->getJson('/api/credits/upgrade-history')->assertStatus(401);
    }

    public function test_credit_history_returns_transactions(): void
    {
        CreditTransaction::create([
            'user_id' => $this->user->id,
            'type' => 'purchase',
            'amount' => 200,
            'balance_before' => 300,
            'balance_after' => 500,
            'description' => 'Test credit',
        ]);

        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/credits/history');

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('data.total'));
    }

    public function test_credit_history_empty(): void
    {
        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/credits/history');

        $response->assertStatus(200);
        $this->assertEquals(0, $response->json('data.total'));
    }

    public function test_credit_history_requires_auth(): void
    {
        $this->getJson('/api/credits/history')->assertStatus(401);
    }

    public function test_settings_returns_config(): void
    {
        CreditSetting::set('exchange_rate', '0.1', 'Exchange Rate');
        CreditSetting::set('min_purchase_amount', '50000', 'Min Purchase');
        CreditSetting::set('max_purchase_amount', '10000000', 'Max Purchase');

        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/credits/settings');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'exchange_rate', 'min_purchase_amount', 'max_purchase_amount',
            ]);
    }

    public function test_purchase_uses_global_exchange_rate(): void
    {
        // Set custom exchange_rate
        CreditSetting::set('exchange_rate', '0.2', 'Exchange Rate');

        $response = $this->withHeaders($this->authHeaders())
            ->postJson('/api/credits/purchase', ['amount' => 100000]);

        $response->assertStatus(200);
        // 100,000 VNĐ × 0.2 exchange_rate = 20,000 credits
        $this->assertEquals(20000, $response->json('credits_to_receive'));
    }

    public function test_exchange_rate_change_affects_credits(): void
    {
        // With exchange_rate = 0.1
        CreditSetting::set('exchange_rate', '0.1', 'Exchange Rate');

        $response1 = $this->withHeaders($this->authHeaders())
            ->postJson('/api/credits/purchase', ['amount' => 50000]);

        $credits1 = $response1->json('credits_to_receive');

        // With exchange_rate = 0.05 (lower rate = fewer credits)
        CreditSetting::set('exchange_rate', '0.05', 'Exchange Rate');

        $response2 = $this->withHeaders($this->authHeaders())
            ->postJson('/api/credits/purchase', ['amount' => 50000]);

        $credits2 = $response2->json('credits_to_receive');

        // Higher exchange_rate should give more credits
        $this->assertGreaterThan($credits2, $credits1);
        // 50,000 × 0.1 = 5,000 credits
        $this->assertEquals(5000, $credits1);
        // 50,000 × 0.05 = 2,500 credits
        $this->assertEquals(2500, $credits2);
    }
}

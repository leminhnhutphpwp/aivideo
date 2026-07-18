<?php
namespace Tests\Feature;

use App\Listeners\SePayWebhookListener;
use App\Models\CreditTransaction;
use App\Models\User;
use App\Services\CreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SePayWebhookIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function add_credits_persists_reference_code(): void
    {
        $user = User::factory()->create(['credits' => 0]);

        app(CreditService::class)->addCredits($user, 500, 'SEPay nạp test', 'FT2026REF001');

        $this->assertDatabaseHas('credit_transactions', [
            'user_id' => $user->id,
            'amount' => 500,
            'reference_code' => 'FT2026REF001',
        ]);
        $this->assertEquals(500, $user->fresh()->credits);
    }

    /** @test */
    public function idempotency_gate_matches_existing_reference_code_exactly(): void
    {
        $user = User::factory()->create(['credits' => 0]);
        app(CreditService::class)->addCredits($user, 500, 'SEPay nạp test', 'FT2026REF001');

        $listener = app(SePayWebhookListener::class);
        $method = new \ReflectionMethod($listener, 'isAlreadyProcessed');
        $method->setAccessible(true);

        // Same reference → already processed (prevents double credit on webhook retry)
        $this->assertTrue($method->invoke($listener, 'FT2026REF001'));

        // Different / empty reference → not processed
        $this->assertFalse($method->invoke($listener, 'FT2026REF999'));
        $this->assertFalse($method->invoke($listener, ''));

        // Guard against the old LIKE %code% false-positive: a substring must NOT match.
        $this->assertFalse($method->invoke($listener, 'FT2026REF'));
    }
}

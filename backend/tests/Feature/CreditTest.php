<?php
namespace Tests\Feature;

use App\Models\CreditTransaction;
use App\Models\User;
use App\Services\CreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreditTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private CreditService $creditService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create(['credits' => 100]);
        $this->creditService = app(CreditService::class);
    }

    public function test_reserve_credits(): void
    {
        $result = $this->creditService->reserve($this->user, 50);
        $this->assertTrue($result);
        $this->assertEquals(50, $this->user->fresh()->credits);
    }

    public function test_reserve_fails_when_insufficient(): void
    {
        $result = $this->creditService->reserve($this->user, 200);
        $this->assertFalse($result);
        $this->assertEquals(100, $this->user->fresh()->credits);
    }

    public function test_add_credits_increments_balance(): void
    {
        $this->creditService->addCredits($this->user, 200, 'Test add');
        $this->assertEquals(300, $this->user->fresh()->credits);
        $this->assertDatabaseHas('credit_transactions', ['type' => 'purchase', 'amount' => 200]);
    }

    public function test_add_credits(): void
    {
        $this->creditService->addCredits($this->user, 200, 'Test add');
        $this->assertEquals(300, $this->user->fresh()->credits);
        $this->assertDatabaseHas('credit_transactions', ['type' => 'purchase', 'amount' => 200]);
    }
}

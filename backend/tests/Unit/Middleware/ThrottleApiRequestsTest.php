<?php

namespace Tests\Unit\Middleware;

use App\Http\Middleware\ThrottleApiRequests;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Cache\RateLimiter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * FIX 5 — a strict per-route throttle (e.g. generate/retry ':60,1') must NOT be raised by a
 * higher plan limit. General routes (>= baseline) still scale up with the plan limit.
 */
class ThrottleApiRequestsTest extends TestCase
{
    use RefreshDatabase;

    private function middleware(): ThrottleApiRequests
    {
        return new ThrottleApiRequests(app(RateLimiter::class));
    }

    private function invokeResolve(ThrottleApiRequests $mw, ?User $user, int $configuredLimit): int
    {
        $ref = new \ReflectionMethod($mw, 'resolveMaxAttempts');
        $ref->setAccessible(true);
        return $ref->invoke($mw, $user, $configuredLimit);
    }

    private function proUser(): User
    {
        $plan = Plan::create([
            'name' => 'Pro', 'slug' => 'pro',
            'max_concurrent_jobs' => 5, 'monthly_credits' => 2000, 'price_regular' => 149000,
            'api_rate_limit' => 600,
        ]);
        return User::factory()->create(['plan_id' => $plan->id]);
    }

    public function test_strict_route_limit_is_not_raised_by_plan(): void
    {
        $user = $this->proUser();
        // Expensive endpoint declares :60,1 — plan limit 600 must NOT override it.
        $this->assertSame(60, $this->invokeResolve($this->middleware(), $user, 60));
    }

    public function test_very_strict_route_limit_wins(): void
    {
        $user = $this->proUser();
        // Purchase declares :5,1 — stays at 5 despite plan 600.
        $this->assertSame(5, $this->invokeResolve($this->middleware(), $user, 5));
    }

    public function test_general_route_scales_up_with_plan(): void
    {
        $user = $this->proUser();
        // General group declares :120,1 — plan raises the ceiling to 600.
        $this->assertSame(600, $this->invokeResolve($this->middleware(), $user, 120));
    }

    public function test_unauthenticated_uses_route_limit(): void
    {
        $this->assertSame(30, $this->invokeResolve($this->middleware(), null, 30));
    }
}

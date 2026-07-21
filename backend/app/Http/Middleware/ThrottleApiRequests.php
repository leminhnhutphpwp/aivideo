<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class ThrottleApiRequests
{
    // Fallback defaults — overridden by Plan.api_rate_limit if set
    protected const PLAN_RATE_LIMITS = [
        'free' => 120,
        'starter' => 300,
        'pro' => 600,
        'studio' => 1000,
        'enterprise' => 2000,
    ];

    protected const DEFAULT_LIMIT = 300;

    /**
     * The general per-route baseline used by the broad API groups (e.g. ':120,1'). A route
     * that declares a limit AT OR ABOVE this baseline is a general endpoint whose ceiling
     * the plan's api_rate_limit is allowed to raise (free 120 → enterprise 2000). A route
     * that declares a limit BELOW this baseline is an intentionally strict cap for an
     * expensive/sensitive endpoint (generate/retry ':60,1', purchase ':5,1', comments
     * ':10,1', auth ':30,1'…) and must NEVER be raised by a higher plan limit — we take the
     * min of the route cap and the plan limit for those.
     */
    protected const GENERAL_ROUTE_BASELINE = 120;

    public function __construct(
        protected RateLimiter $limiter
    ) {}

    public function handle(Request $request, Closure $next, string $limit = '60,1'): Response
    {
        // Skip rate limiting for whitelisted IPs
        if ($this->isWhitelisted($request->ip())) {
            return $next($request);
        }

        $user = $request->user();
        [$configMax, $decayMinutes] = explode(',', $limit . ',1');
        $decaySeconds = (int) $decayMinutes * 60;

        $maxAttempts = $this->resolveMaxAttempts($user, (int) $configMax);
        $key = $this->resolveRequestSignature($request, $maxAttempts);

        if ($this->limiter->tooManyAttempts($key, $maxAttempts)) {
            $retryAfter = $this->limiter->availableIn($key);

            return response()->json([
                'error' => 'Too many requests',
                'message' => "Bạn thao tác quá nhanh, vui lòng chờ {$retryAfter} giây.",
                'retry_after' => $retryAfter,
                'available_in_seconds' => $retryAfter,
                'limit' => $maxAttempts,
            ], 429);
        }

        $this->limiter->hit($key, $decaySeconds);

        $response = $next($request);

        return $this->addHeaders(
            $response,
            $maxAttempts,
            $this->limiter->retriesLeft($key, $maxAttempts),
            $this->limiter->availableIn($key)
        );
    }

    protected function resolveMaxAttempts($user, int $configuredLimit): int
    {
        if (!$user) return $configuredLimit;

        $planLimit = $this->resolvePlanLimit($user, $configuredLimit);

        // A strict per-route cap (below the general baseline) is a hard ceiling for an
        // expensive endpoint. Never let a higher plan limit bypass it — use the smaller of
        // the two. General routes (>= baseline) still scale up with the plan limit.
        if ($configuredLimit < self::GENERAL_ROUTE_BASELINE) {
            return min($configuredLimit, $planLimit);
        }

        return $planLimit;
    }

    /**
     * The plan's general API rate limit, independent of any per-route cap.
     */
    protected function resolvePlanLimit($user, int $configuredLimit): int
    {
        // Priority 1: Plan's api_rate_limit (configurable in admin → Plans)
        $plan = $user->relationLoaded('plan') ? $user->plan : $user->plan()->first();
        if ($plan && isset($plan->api_rate_limit) && $plan->api_rate_limit > 0) {
            return (int) $plan->api_rate_limit;
        }

        // Priority 2: Hardcoded fallback by plan slug
        $planSlug = $plan?->slug;
        if ($planSlug && isset(self::PLAN_RATE_LIMITS[$planSlug])) {
            return self::PLAN_RATE_LIMITS[$planSlug];
        }

        return $configuredLimit;
    }

    protected function resolveRequestSignature(Request $request, int $maxAttempts): string
    {
        $prefix = 'api_limit_' . $maxAttempts . ':';
        if ($user = $request->user()) {
            return $prefix . 'user:' . $user->id;
        }

        return $prefix . 'ip:' . $request->ip();
    }

    protected function addHeaders(Response $response, int $maxAttempts, int $remaining, int $reset): Response
    {
        $headers = [
            'X-RateLimit-Limit' => $maxAttempts,
            'X-RateLimit-Remaining' => max(0, $remaining),
            'X-RateLimit-Reset' => $reset,
        ];

        foreach ($headers as $key => $value) {
            $response->headers->set($key, $value);
        }

        return $response;
    }

    // Whitelist IPs change rarely (admin-managed), so a short cache avoids a DB hit on nearly
    // every API request. A few minutes of staleness on add/remove is acceptable here.
    protected const WHITELIST_CACHE_TTL = 300; // seconds

    protected function isWhitelisted(string $ip): bool
    {
        return (bool) Cache::remember(
            'api_whitelist_ip:' . $ip,
            self::WHITELIST_CACHE_TTL,
            fn () => \App\Models\WhitelistIp::where('ip_address', $ip)->exists(),
        );
    }
}

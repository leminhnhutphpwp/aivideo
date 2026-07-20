<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Services\Security\TurnstileVerifier;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Layer 3 — Turnstile middleware.
 *
 * Đọc token từ header CF-Turnstile-Response (fallback field body turnstile_token),
 * xác minh với Cloudflare. Tự tắt (fail-open) khi TURNSTILE_SECRET chưa cấu hình.
 */
class VerifyTurnstile
{
    public function __construct(private TurnstileVerifier $verifier)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->header('CF-Turnstile-Response')
            ?? $request->input('turnstile_token');

        if (! $this->verifier->verify($token, $request->ip())) {
            return response()->json([
                'success' => false,
                'message' => 'Xác minh chống bot thất bại, vui lòng thử lại.',
            ], 403);
        }

        return $next($request);
    }
}

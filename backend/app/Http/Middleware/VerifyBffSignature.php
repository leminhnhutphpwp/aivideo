<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Layer 4 — HMAC signature check.
 *
 * Chỉ tin request mang chữ ký HMAC-SHA256 hợp lệ do Next BFF tạo bằng secret
 * chia sẻ (APP_BFF_SECRET). Đây là bảo chứng "chỉ đến từ hệ thống của chúng ta".
 *
 * Canonical string: "{timestamp}.{METHOD}.{path}.{bodyHash}"
 *   - path     = '/' . ltrim($request->path(), '/')  (vd: /api/coupons/redeem)
 *   - METHOD   = viết hoa (POST, GET, ...)
 *   - bodyHash = hash('sha256', raw body)
 * Signature = hash_hmac('sha256', canonical, secret) — so sánh bằng hash_equals.
 */
class VerifyBffSignature
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret = (string) config('coupon_security.bff_secret');

        // Fail-open: chưa cấu hình secret (dev/test) → bỏ qua.
        if ($secret === '') {
            return $next($request);
        }

        $timestamp = $request->header('X-BFF-Timestamp');
        $signature = $request->header('X-BFF-Signature');

        if ($timestamp === null || $timestamp === '' || $signature === null || $signature === '') {
            return $this->reject();
        }

        if (! ctype_digit((string) $timestamp)) {
            return $this->reject();
        }

        $maxSkew = (int) config('coupon_security.bff_max_skew', 300);
        if (abs(time() - (int) $timestamp) > $maxSkew) {
            return $this->reject();
        }

        $path = '/' . ltrim($request->path(), '/');
        $bodyHash = hash('sha256', $request->getContent());
        $canonical = "{$timestamp}." . strtoupper($request->getMethod()) . ".{$path}.{$bodyHash}";
        $expected = hash_hmac('sha256', $canonical, $secret);

        if (! hash_equals($expected, (string) $signature)) {
            return $this->reject();
        }

        return $next($request);
    }

    private function reject(): Response
    {
        return response()->json([
            'success' => false,
            'message' => 'Yêu cầu không hợp lệ.',
        ], 403);
    }
}

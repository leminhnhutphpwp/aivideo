<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Layer 2 — Velocity / anti-farm guard cho redeem + claim.
 *
 * Áp ở tầng route (không ở service) nên các test service không bị ảnh hưởng.
 * Cả ba kiểm tra đều config-gated:
 *   - require_verified_email (mặc định true) — chặn email chưa xác thực.
 *   - min_account_age_minutes (mặc định 0 = tắt) — chặn tài khoản quá mới.
 *   - per_ip_daily_cap (mặc định 0 = tắt) — giới hạn lượt/IP/ngày.
 */
class CouponAbuseGuard
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Bắt buộc xác thực email.
        if ((bool) config('coupon_security.require_verified_email', true)
            && $user !== null
            && ! $user->hasVerifiedEmail()
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn cần xác thực email trước khi dùng mã.',
            ], 403);
        }

        // Tuổi tài khoản tối thiểu.
        $minAge = (int) config('coupon_security.min_account_age_minutes', 0);
        if ($minAge > 0
            && $user !== null
            && $user->created_at !== null
            && $user->created_at->gt(now()->subMinutes($minAge))
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản còn quá mới, vui lòng thử lại sau ít phút.',
            ], 429);
        }

        // Giới hạn lượt theo IP/ngày (chỉ đếm sau khi qua các kiểm tra trên).
        $cap = (int) config('coupon_security.per_ip_daily_cap', 0);
        if ($cap > 0) {
            $key = 'coupon-abuse:' . $request->ip() . ':' . now()->format('Y-m-d');
            // Seed với TTL 24h TRƯỚC khi tăng (add chỉ set khi key chưa tồn tại). Không bao giờ
            // put đè lên giá trị sau khi increment — tránh race làm mất lượt đếm song song và reset TTL.
            Cache::add($key, 0, now()->addDay());
            $count = (int) Cache::increment($key);

            if ($count > $cap) {
                return response()->json([
                    'success' => false,
                    'message' => 'Quá nhiều lượt từ mạng của bạn, vui lòng thử lại sau.',
                ], 429);
            }
        }

        return $next($request);
    }
}

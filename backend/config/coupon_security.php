<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Coupon / Event Security Hardening
|--------------------------------------------------------------------------
| Cấu hình cho 4 lớp bảo vệ endpoint đổi mã (redeem) và nhận mã sự kiện (claim).
| Mọi giá trị đều được điều khiển bằng ENV. Khi secret để trống, lớp tương ứng
| sẽ TỰ ĐỘNG TẮT (fail-open) để dev/local và test suite chạy bình thường.
| Ở production PHẢI set đủ các secret bên dưới.
*/

return [
    // Layer 4 — HMAC: secret chia sẻ giữa Next BFF và Laravel.
    // Rỗng / null = tắt kiểm tra chữ ký (dev fail-open).
    'bff_secret' => env('APP_BFF_SECRET'),

    // Độ lệch thời gian tối đa (giây) cho X-BFF-Timestamp.
    'bff_max_skew' => (int) env('APP_BFF_MAX_SKEW', 300),

    // Layer 3 — Cloudflare Turnstile secret key.
    // Rỗng / null = tắt kiểm tra chống bot (dev fail-open).
    'turnstile_secret' => env('TURNSTILE_SECRET'),

    // Layer 2 — Anti-farm / velocity.
    // Tuổi tài khoản tối thiểu (phút) mới được dùng mã. 0 = tắt. Prod nên đặt ~15.
    'min_account_age_minutes' => (int) env('COUPON_MIN_ACCOUNT_AGE_MINUTES', 0),

    // Bắt buộc xác thực email trước khi dùng mã.
    'require_verified_email' => (bool) env('COUPON_REQUIRE_VERIFIED', true),

    // Giới hạn số lượt dùng mã theo IP mỗi ngày. 0 = tắt. Prod nên đặt ~20.
    'per_ip_daily_cap' => (int) env('COUPON_PER_IP_DAILY_CAP', 0),
];

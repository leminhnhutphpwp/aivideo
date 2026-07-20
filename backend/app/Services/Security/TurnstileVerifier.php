<?php

declare(strict_types=1);

namespace App\Services\Security;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Layer 3 — Cloudflare Turnstile server-side verification.
 *
 * Xác minh token do widget Turnstile phía client tạo (được BFF forward xuống).
 * Việc xác minh cần secret nên thuộc về Laravel.
 */
class TurnstileVerifier
{
    private const ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    /**
     * @return bool true nếu hợp lệ (hoặc Turnstile đang tắt); false nếu thất bại.
     */
    public function verify(?string $token, ?string $ip): bool
    {
        $secret = (string) config('coupon_security.turnstile_secret');

        // Fail-open: chưa cấu hình secret (dev/test) → coi như hợp lệ.
        if ($secret === '') {
            return true;
        }

        // Không có token mà Turnstile đang bật → chặn.
        if ($token === null || $token === '') {
            return false;
        }

        try {
            $response = Http::asForm()->post(self::ENDPOINT, [
                'secret' => $secret,
                'response' => $token,
                'remoteip' => $ip,
            ]);

            return (bool) ($response->json('success') ?? false);
        } catch (Throwable $e) {
            // Fail-closed khi đang bật nhưng lỗi mạng — vẫn log cảnh báo.
            Log::warning('Turnstile verification failed (network error)', [
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }
}

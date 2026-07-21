<?php

namespace App\Support;

/**
 * Single source of truth for hiding provider/model/credential details from
 * end users. Internal daemon/provider errors (e.g. "no Qwen Cloud base URL")
 * must never reach the frontend — they leak which providers/models we use.
 */
class ErrorSanitizer
{
    public const GENERIC = 'Lỗi hệ thống hoặc nhà cung cấp dịch vụ không khả dụng. Vui lòng thử lại sau.';

    /** Metadata keys safe to expose to users (everything else is dropped). */
    private const SAFE_META_KEYS = ['error_code'];

    /** True if the message reveals internal provider/model/credential details. */
    public static function leaks(?string $msg): bool
    {
        if (! is_string($msg) || $msg === '') {
            return false;
        }

        // Lowercase once so the literal leak checks are case-insensitive too (not just the
        // vendor regex) — "provider request FAILED" must still be caught.
        $lower = mb_strtolower($msg);

        return str_contains($lower, 'openai generic image error')
            || str_contains($lower, 'provider')
            || str_contains($lower, 'http error')
            || str_contains($lower, 'failed')
            // Real HTTP status codes only — require an accompanying HTTP/status token or an
            // actual status phrase, so business numbers ("Cần 500 credits", "480p", "450 ký
            // tự") are NOT nuked to the generic error.
            || (bool) preg_match('/\b(?:https?|status(?:\s*code)?)\b[^0-9]{0,12}\b[45]\d{2}\b/', $lower)
            || (bool) preg_match('/\b[45]\d{2}\b\s*(?:internal server error|service unavailable|bad gateway|gateway timeout|too many requests|not found|unauthorized|forbidden|bad request)\b/', $lower)
            // structural config leaks: "no X base URL", "no X API key", endpoints…
            || (bool) preg_match('/\b(base ?url|api ?key|access ?key|secret|token|credential|endpoint|model)\b/', $lower)
            // any vendor / model name
            || (bool) preg_match('/\b(qwen|dashscope|alibaba|elevenlabs|cloudflare|ckey|openai|kling|luma|runway|haiper|seedance|wan\d|veo|sora|minimax|pika|stub)\b/', $lower);
    }

    /** Public-safe error message: generic if it leaks, otherwise unchanged. */
    public static function publicMessage(?string $msg): ?string
    {
        if ($msg === null || $msg === '') {
            return $msg;
        }

        return self::leaks($msg) ? self::GENERIC : $msg;
    }

    /**
     * Public-safe error metadata: keep only whitelisted keys (e.g. error_code),
     * drop provider/raw_error/model/etc. Returns null when nothing safe remains.
     */
    public static function publicMetadata(?array $meta): ?array
    {
        if (empty($meta)) {
            return $meta === [] ? null : $meta; // null/[] → null
        }

        $safe = array_intersect_key($meta, array_flip(self::SAFE_META_KEYS));

        return $safe === [] ? null : $safe;
    }
}

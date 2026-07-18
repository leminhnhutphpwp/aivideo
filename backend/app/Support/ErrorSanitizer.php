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

        return str_contains($msg, 'OpenAI Generic Image Error')
            || str_contains($msg, 'Provider')
            || str_contains($msg, 'HTTP error')
            || str_contains($msg, 'failed')
            || (bool) preg_match('/[45][0-9]{2}/', $msg) // 4xx/5xx codes
            // structural config leaks: "no X base URL", "no X API key", endpoints…
            || (bool) preg_match('/\b(base ?url|api ?key|access ?key|secret|token|credential|endpoint|model)\b/i', $msg)
            // any vendor / model name
            || (bool) preg_match('/\b(qwen|dashscope|alibaba|elevenlabs|cloudflare|ckey|openai|kling|luma|runway|haiper|seedance|wan\d|veo|sora|minimax|pika|stub)\b/i', $msg);
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

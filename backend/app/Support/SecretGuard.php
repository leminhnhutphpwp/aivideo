<?php

namespace App\Support;

use RuntimeException;

/**
 * Fail-closed guard: refuses to boot production with default/placeholder secrets.
 *
 * Every secret in .env.example / docker-compose ships as a "change-me" placeholder. If a
 * deploy forgets to regenerate them, JWTs could be forged and the daemon webhook HMAC
 * bypassed. This aborts boot loudly instead of silently running insecure. Only ever
 * invoked in the production environment (see AppServiceProvider::boot).
 */
class SecretGuard
{
    /**
     * Substrings that mark a value as an un-rotated placeholder.
     */
    private const PLACEHOLDER_MARKERS = [
        'change', 'your-', 'your_', 'placeholder', 'example', 'secret-here', 'todo',
    ];

    /**
     * A secret is insecure when it is empty or still contains a placeholder marker.
     */
    public static function isInsecure(?string $value): bool
    {
        if (! is_string($value) || trim($value) === '') {
            return true;
        }

        $normalized = strtolower($value);

        foreach (self::PLACEHOLDER_MARKERS as $marker) {
            if (str_contains($normalized, $marker)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Assert that every named secret is securely configured, or throw.
     *
     * @param  array<string, string|null>  $secrets  map of ENV name => value
     *
     * @throws RuntimeException on the first insecure secret found.
     */
    public static function assert(array $secrets): void
    {
        foreach ($secrets as $name => $value) {
            if (self::isInsecure($value)) {
                throw new RuntimeException(
                    "[SECURITY] {$name} chưa được cấu hình an toàn cho môi trường production. "
                    . 'Hãy đặt một giá trị bí mật ngẫu nhiên (không dùng giá trị mặc định như "change-me").'
                );
            }
        }
    }
}

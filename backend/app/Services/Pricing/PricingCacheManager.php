<?php

namespace App\Services\Pricing;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;

class PricingCacheManager
{
    /**
     * Cache a pricing calculation
     */
    public static function cache(array $config, array $result, int $ttl = 300): string
    {
        $calculationId = 'calc_' . bin2hex(random_bytes(16));
        $cacheKey = "pricing:calc:{$calculationId}";
        
        // Create signature for validation
        $signature = self::generateSignature($result['pricing']['total_credits'], $config);
        
        $data = [
            'calculation_id' => $calculationId,
            'config' => $config,
            'result' => $result,
            'signature' => $signature,
            'created_at' => now()->toISOString(),
            'expires_at' => now()->addSeconds($ttl)->toISOString(),
        ];
        
        Cache::put($cacheKey, $data, $ttl);
        
        // Also cache by config hash for quick retrieval
        $configHash = md5(json_encode($config));
        $configCacheKey = "pricing:config:{$configHash}";
        Cache::put($configCacheKey, $calculationId, 60); // Shorter TTL
        
        return $calculationId;
    }

    /**
     * Retrieve cached calculation
     */
    public static function get(string $calculationId): ?array
    {
        $cacheKey = "pricing:calc:{$calculationId}";
        return Cache::get($cacheKey);
    }

    /**
     * Validate calculation signature
     */
    public static function validate(string $calculationId, int $expectedTotal): array
    {
        $cached = self::get($calculationId);
        
        if (!$cached) {
            return [
                'valid' => false,
                'price_changed' => false,
                'error' => 'Calculation expired or not found',
            ];
        }
        
        $actualTotal = $cached['result']['pricing']['total_credits'];
        $signatureValid = self::verifySignature($actualTotal, $cached['config'], $cached['signature']);
        
        if (!$signatureValid) {
            return [
                'valid' => false,
                'price_changed' => false,
                'error' => 'Invalid signature - possible tampering detected',
            ];
        }
        
        $priceChanged = $expectedTotal !== $actualTotal;
        
        return [
            'valid' => !$priceChanged,
            'price_changed' => $priceChanged,
            'current_total' => $actualTotal,
            'expected_total' => $expectedTotal,
            'locked_until' => $cached['expires_at'],
        ];
    }

    /**
     * Generate HMAC signature
     */
    private static function generateSignature(int $totalCredits, array $config): string
    {
        ksort($config);
        $data = $totalCredits . '|' . json_encode($config, JSON_UNESCAPED_UNICODE);
        return hash_hmac('sha256', $data, config('app.key'));
    }

    /**
     * Verify HMAC signature
     */
    private static function verifySignature(int $totalCredits, array $config, string $signature): bool
    {
        $expected = self::generateSignature($totalCredits, $config);
        return hash_equals($expected, $signature);
    }

    /**
     * Clear calculation cache
     */
    public static function clear(string $calculationId): void
    {
        $cacheKey = "pricing:calc:{$calculationId}";
        Cache::forget($cacheKey);
    }

    /**
     * Get cache statistics
     */
    public static function getStats(): array
    {
        // This would require Redis for proper stats
        return [
            'hit_rate' => null,
            'total_keys' => null,
        ];
    }
}

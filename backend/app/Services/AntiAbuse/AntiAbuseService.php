<?php

namespace App\Services\AntiAbuse;

use App\Models\BlockedIp;
use App\Models\WhitelistIp;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AntiAbuseService
{
    private const CACHE_PREFIX = 'anti_abuse:';
    private const IP_REGISTRATIONS_KEY = 'ip_registrations';
    private const DEVICE_HASH_KEY = 'device_hash';
    private const HOURLY_RATE_KEY = 'hourly_rate';
    
    // Limits
    private const MAX_ACCOUNTS_PER_IP_PER_DAY = 2;
    private const MAX_REGISTRATIONS_PER_IP_PER_HOUR = 5;

    /**
     * Validate registration request.
     * Returns array with 'allowed' boolean and 'reason' string if blocked.
     */
    public function validateRegistration(string $email, string $ip, ?string $userAgent = null): array
    {
        // 0. Skip check if IP is whitelisted
        if ($this->isWhitelisted($ip)) {
            return ['allowed' => true];
        }

        // 1. Check disposable email
        // 1. Check disposable email
        if (DisposableEmailBlocklist::isDisposable($email)) {
            return [
                'allowed' => false,
                'reason' => 'Email không được phép sử dụng',
                'code' => 'DISPOSABLE_EMAIL',
            ];
        }

        // 2. Check IP daily limit (2 accounts per IP per day)
        $ipDailyCount = $this->getIpDailyRegistrationCount($ip);
        if ($ipDailyCount >= self::MAX_ACCOUNTS_PER_IP_PER_DAY) {
            return [
                'allowed' => false,
                'reason' => 'IP này đã đạt giới hạn đăng ký hôm nay',
                'code' => 'IP_DAILY_LIMIT',
            ];
        }

        // 3. Check IP hourly rate (5 registrations per hour)
        $ipHourlyCount = $this->getIpHourlyRegistrationCount($ip);
        if ($ipHourlyCount >= self::MAX_REGISTRATIONS_PER_IP_PER_HOUR) {
            return [
                'allowed' => false,
                'reason' => 'Quá nhiều yêu cầu đăng ký từ IP này',
                'code' => 'IP_HOURLY_LIMIT',
            ];
        }

        // 4. Generate device hash and check for abuse patterns
        if ($userAgent) {
            $deviceHash = $this->generateDeviceHash($ip, $userAgent);
            if ($this->isSuspiciousDeviceHash($deviceHash)) {
                return [
                    'allowed' => false,
                    'reason' => 'Phát hiện hành vi đáng ngờ',
                    'code' => 'SUSPICIOUS_DEVICE',
                ];
            }
        }

        return ['allowed' => true];
    }

    /**
     * Log a registration attempt (success or fail).
     */
    public function logRegistration(string $email, string $ip, ?string $userAgent, bool $success): void
    {
        $this->incrementIpCounter($ip);
        
        DB::table('registration_logs')->insert([
            'email' => $email,
            'ip_address' => $ip,
            'user_agent' => $userAgent,
            'device_hash' => $userAgent ? $this->generateDeviceHash($ip, $userAgent) : null,
            'success' => $success,
            'created_at' => now(),
        ]);
    }

    /**
     * Check if email already exists (helps prevent duplicate spam).
     */
    public function isEmailRegistered(string $email): bool
    {
        return DB::table('users')->where('email', strtolower($email))->exists();
    }

    /**
     * Get daily registration count for an IP.
     */
    private function getIpDailyRegistrationCount(string $ip): int
    {
        return DB::table('registration_logs')
            ->where('ip_address', $ip)
            ->where('created_at', '>=', now()->startOfDay())
            ->where('success', true)
            ->count();
    }

    /**
     * Get hourly registration count for an IP.
     */
    private function getIpHourlyRegistrationCount(string $ip): int
    {
        return DB::table('registration_logs')
            ->where('ip_address', $ip)
            ->where('created_at', '>=', now()->subHour())
            ->count();
    }

    /**
     * Increment IP registration counter.
     */
    private function incrementIpCounter(string $ip): void
    {
        $cacheKey = self::CACHE_PREFIX . $ip;
        
        $daily = Cache::get($cacheKey . ':daily', 0);
        $hourly = Cache::get($cacheKey . ':hourly', 0);
        
        Cache::put($cacheKey . ':daily', $daily + 1, now()->endOfDay());
        Cache::put($cacheKey . ':hourly', $hourly + 1, now()->addHour());
    }

    /**
     * Generate device hash from IP + User-Agent.
     */
    private function generateDeviceHash(string $ip, string $userAgent): string
    {
        return hash('sha256', $ip . $userAgent);
    }

    /**
     * Check if device hash appears in too many registrations.
     */
    private function isSuspiciousDeviceHash(string $hash): bool
    {
        $count = DB::table('registration_logs')
            ->where('device_hash', $hash)
            ->where('created_at', '>=', now()->subDay())
            ->count();
        
        return $count > self::MAX_ACCOUNTS_PER_IP_PER_DAY * 2;
    }

    /**
     * Get suspicious IPs for admin review.
     */
    public function getSuspiciousIps(int $limit = 50): array
    {
        return DB::table('registration_logs')
            ->select('ip_address', DB::raw('COUNT(*) as attempts'), DB::raw('SUM(CASE WHEN success THEN 1 ELSE 0 END) as successes'))
            ->where('created_at', '>=', now()->subDays(7))
            ->groupBy('ip_address')
            ->orderByDesc('attempts')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    /**
     * Block an IP from registration.
     */
    public function blockIp(string $ip, ?string $reason = null): void
    {
        // Persist to DB (survives restarts)
        BlockedIp::updateOrCreate(
            ['ip_address' => $ip],
            [
                'reason' => $reason,
                'blocked_by' => auth()->id(),
                'expires_at' => now()->addDays(30),
            ]
        );

        // Cache for fast lookups
        Cache::put(self::CACHE_PREFIX . 'blocked:' . $ip, true, now()->addDays(30));
    }

    /**
     * Check if IP is blocked.
     * Uses Cache as speed layer, falls back to DB.
     */
    public function isIpBlocked(string $ip): bool
    {
        if ($this->isWhitelisted($ip)) {
            return false;
        }

        // Fast path: check cache
        if (Cache::has(self::CACHE_PREFIX . 'blocked:' . $ip)) {
            return true;
        }

        // Slow path: check DB (survives cache clear)
        $blocked = BlockedIp::where('ip_address', $ip)->active()->exists();
        if ($blocked) {
            // Re-populate cache
            Cache::put(self::CACHE_PREFIX . 'blocked:' . $ip, true, now()->addDays(30));
        }

        return $blocked;
    }

    /**
     * Check if IP is whitelisted (bypass all anti-abuse checks).
     */
    public function isWhitelisted(string $ip): bool
    {
        return WhitelistIp::where('ip_address', $ip)->exists();
    }

    /**
     * Add IP to whitelist (bypass all anti-abuse checks).
     */
    public function whitelistIp(string $ip, ?string $reason = null, ?int $createdBy = null): void
    {
        WhitelistIp::firstOrCreate(
            ['ip_address' => $ip],
            [
                'reason' => $reason,
                'created_by' => $createdBy ?? auth()->id(),
            ]
        );
    }

    /**
     * Remove IP from whitelist.
     */
    public function unwhitelistIp(string $ip): void
    {
        WhitelistIp::where('ip_address', $ip)->delete();
    }
}

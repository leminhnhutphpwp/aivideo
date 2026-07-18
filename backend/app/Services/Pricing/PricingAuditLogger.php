<?php

namespace App\Services\Pricing;

use App\Models\PricingAuditLog;
use Illuminate\Http\Request;

class PricingAuditLogger
{
    /**
     * Log pricing calculation
     */
    public static function log(
        string $eventType,
        array $requestData,
        array $responseData,
        ?int $userId = null,
        ?string $calculationId = null
    ): PricingAuditLog {
        return PricingAuditLog::create([
            'user_id' => $userId,
            'event_type' => $eventType,
            'request_data' => $requestData,
            'response_data' => $responseData,
            'calculation_id' => $calculationId,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'total_credits' => $responseData['pricing']['total_credits'] ?? null,
        ]);
    }

    /**
     * Log validation attempt
     */
    public static function logValidation(
        string $calculationId,
        int $expectedTotal,
        array $result,
        ?int $userId = null
    ): PricingAuditLog {
        return PricingAuditLog::create([
            'user_id' => $userId,
            'event_type' => 'validation',
            'request_data' => [
                'calculation_id' => $calculationId,
                'expected_total' => $expectedTotal,
            ],
            'response_data' => $result,
            'calculation_id' => $calculationId,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Get user's recent calculations
     */
    public static function getUserHistory(int $userId, int $limit = 20): array
    {
        return PricingAuditLog::where('user_id', $userId)
            ->where('event_type', 'calculation')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get(['id', 'request_data', 'response_data', 'calculation_id', 'total_credits', 'created_at'])
            ->map(function ($log) {
                return [
                    'id' => $log->calculation_id,
                    'video_type' => $log->request_data['video_type'] ?? null,
                    'duration' => $log->request_data['duration'] ?? null,
                    'resolution' => $log->request_data['resolution'] ?? null,
                    'total_credits' => $log->total_credits,
                    'created_at' => $log->created_at->toISOString(),
                ];
            })
            ->toArray();
    }

    /**
     * Detect suspicious activity
     */
    public static function detectSuspiciousActivity(?int $userId = null): bool
    {
        if (!$userId) {
            return false;
        }

        $oneMinuteAgo = now()->subMinute();
        
        // Too many calculations in 1 minute
        $calculationCount = PricingAuditLog::where('user_id', $userId)
            ->where('created_at', '>', $oneMinuteAgo)
            ->where('event_type', 'calculation')
            ->count();

        if ($calculationCount > 10) {
            return true;
        }

        return false;
    }
}

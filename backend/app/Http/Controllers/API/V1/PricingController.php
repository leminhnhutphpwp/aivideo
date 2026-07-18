<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pricing\CalculatePricingRequest;
use App\Http\Requests\Pricing\ValidatePricingRequest;
use App\Services\Pricing\PricingCalculator;
use App\Services\Pricing\PricingCacheManager;
use App\Services\Pricing\PricingAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class PricingController extends Controller
{
    /**
     * GET /api/v1/pricing/config
     * Get all pricing configuration options
     */
    public function config(Request $request): JsonResponse
    {
        $videoTypeCode = $request->query('video_type');
        
        // Cache config for 5 minutes
        $cacheKey = 'pricing:config:' . ($videoTypeCode ?? 'all') . ':' . optional($request->user())->plan_id ?? 'free';
        
        $config = Cache::remember($cacheKey, 300, function () use ($videoTypeCode) {
            return PricingCalculator::getAvailableOptions($videoTypeCode);
        });

        return response()->json([
            'success' => true,
            'data' => $config,
            'cached' => true,
            'cache_ttl' => 300,
            'timestamp' => now()->toISOString(),
        ]);
    }

    /**
     * POST /api/v1/pricing/calculate
     * Calculate price for a video configuration
     */
    public function calculate(CalculatePricingRequest $request): JsonResponse
    {
        // Check for suspicious activity
        if (PricingAuditLogger::detectSuspiciousActivity($request->user()?->id)) {
            return response()->json([
                'success' => false,
                'error' => 'Too many requests. Please slow down.',
            ], 429);
        }

        // Calculate price
        $result = PricingCalculator::calculate($request->validated());

        // Cache calculation for 5 minutes
        $calculationId = PricingCacheManager::cache(
            $request->validated(),
            $result,
            300 // 5 minutes
        );

        // Apply user plan discount if exists
        $user = $request->user();
        $discountPercent = 0;
        $discountAmount = 0;
        
        if ($user && $user->plan) {
            $discountPercent = $user->plan->pricing_discount_percent ?? 0;
            if ($discountPercent > 0) {
                $discountAmount = (int) ($result['pricing']['total_credits'] * ($discountPercent / 100));
            }
        }

        $finalTotal = $result['pricing']['total_credits'] - $discountAmount;

        // Log calculation
        PricingAuditLogger::log(
            'calculation',
            $request->validated(),
            array_merge($result, ['final_total' => $finalTotal]),
            $user?->id,
            $calculationId
        );

        return response()->json([
            'success' => true,
            'data' => array_merge($result, [
                'user_plan' => [
                    'plan' => $user?->plan?->code ?? 'free',
                    'discount_percent' => $discountPercent,
                    'discount_amount' => $discountAmount,
                    'final_total' => $finalTotal,
                ],
                'validation' => [
                    'valid' => true,
                    'warnings' => [],
                    'errors' => [],
                ],
            ]),
            'calculation_id' => $calculationId,
            'valid_until' => now()->addMinutes(5)->toISOString(),
            'timestamp' => now()->toISOString(),
        ]);
    }

    /**
     * GET /api/v1/pricing/durations
     * Get all active duration tiers
     */
    public function durations(): JsonResponse
    {
        $durations = \App\Models\DurationTier::active()
            ->orderBy('seconds')
            ->get(['code', 'seconds', 'name']);

        return response()->json([
            'success' => true,
            'data' => $durations,
        ]);
    }

    /**
     * POST /api/v1/pricing/validate
     * Validate and lock a price calculation
     */
    public function validatePrice(ValidatePricingRequest $request): JsonResponse
    {
        $calculationId = $request->input('calculation_id');
        $expectedTotal = $request->input('expected_total');

        // Validate calculation
        $result = PricingCacheManager::validate($calculationId, $expectedTotal);

        // Log validation attempt
        PricingAuditLogger::logValidation(
            $calculationId,
            $expectedTotal,
            $result,
            $request->user()?->id
        );

        if (!$result['valid']) {
            return response()->json([
                'success' => false,
                'data' => $result,
            ], 422);
        }

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * GET /api/v1/pricing/packages
     * List active combo packages
     */
    public function packages(): JsonResponse
    {
        $packages = Cache::remember('pricing:packages', 600, function () {
            return \App\Models\PricingPackage::active()
                ->with('videoType')
                ->orderBy('sort_order')
                ->get()
                ->map(fn ($pkg) => [
                    'id' => $pkg->id,
                    'name' => $pkg->name,
                    'description' => $pkg->description,
                    'video_type' => $pkg->videoType?->code,
                    'duration_seconds' => $pkg->duration_seconds,
                    'resolution' => $pkg->resolution,
                    'included_addons' => $pkg->included_addons ?? [],
                    'pricing' => [
                        'regular_price' => $pkg->regular_price,
                        'package_price' => $pkg->package_price,
                        'discount_percent' => $pkg->discount_percent,
                        'saving_amount' => $pkg->saving_amount,
                    ],
                    'popular' => $pkg->sort_order === 2,
                ])
                ->values()
                ->all();
        });

        return response()->json([
            'success' => true,
            'data' => $packages,
            'cached' => true,
            'cache_ttl' => 600,
            'timestamp' => now()->toISOString(),
        ]);
    }

    /**
     * GET /api/v1/pricing/history
     * Paginated calculation history for the authenticated user
     */
    public function history(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 20);

        $logs = \App\Models\PricingAuditLog::calculations()
            ->forUser($request->user()->id)
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $items = collect($logs->items())->map(fn ($log) => [
            'id' => $log->id,
            'video_type' => $log->request_data['video_type'] ?? null,
            'duration' => $log->request_data['duration'] ?? null,
            'resolution' => $log->request_data['resolution'] ?? null,
            'total_credits' => $log->total_credits,
            'created_at' => $log->created_at?->toISOString(),
        ])->all();

        return response()->json([
            'success' => true,
            'data' => [
                'current_page' => $logs->currentPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
                'items' => $items,
            ],
            'timestamp' => now()->toISOString(),
        ]);
    }

    }

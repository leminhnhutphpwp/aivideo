<?php

namespace App\Services\Pricing;

use App\Models\VideoType;
use App\Models\DurationTier;
use App\Models\ResolutionPricing;
use App\Models\PricingPackage;
use App\Models\CreditSetting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PricingCalculator
{
    /**
     * Calculate total credits for a video job
     */
    public static function calculate(array $data): array
    {
        $videoTypeCode = $data['video_type'];
        $durationCode = $data['duration'];
        $resolutionCode = $data['resolution'];
        $qualityCode = $data['quality'] ?? 'standard';
        $provider = $data['provider'] ?? null;
        $providerModel = $data['provider_model'] ?? null;
        $quantity = $data['quantity'] ?? 1;

        // Resolve Plan
        $plan = null;
        if (isset($data['plan'])) {
            $plan = $data['plan'] instanceof \App\Models\Plan ? $data['plan'] : \App\Models\Plan::where('slug', $data['plan'])->first();
        }
        if (!$plan && auth()->check()) {
            $plan = auth()->user()->plan;
        }
        if (!$plan) {
            $plan = \App\Models\Plan::where('slug', 'free')->first() ?? \App\Models\Plan::first();
        }

        // 1. Get base video type
        $videoType = VideoType::where('code', $videoTypeCode)->firstOrFail();
        $baseCredits = $videoType->base_credits;

        // 2. Apply duration multiplier (skip for flat-fee types like images)
        $isFlatFee = in_array($videoTypeCode, ['image_generation', 'image_editing']);
        $durationTier = DurationTier::where('code', $durationCode)
            ->where('is_active', true)
            ->first();
        
        $durationMultiplier = $isFlatFee ? 1.0 : (float) ($durationTier?->multiplier ?? 1.0);
        $creditsAfterDuration = (int) ($baseCredits * $durationMultiplier);

        // 3. Apply resolution multiplier (skip for flat-fee types)
        $resolution = ResolutionPricing::where('code', $resolutionCode)
            ->where('is_active', true)
            ->first();
        
        $resolutionMultiplier = $isFlatFee ? 1.0 : (float) ($resolution?->multiplier ?? 1.0);
        $creditsAfterResolution = (int) ($creditsAfterDuration * $resolutionMultiplier);

        // 4. Apply quality multiplier (min 1.0x) from Plan.
        //    Skipped for flat-fee image types so this preview matches
        //    CreditCalculator::calculateImage(), which charges a pure flat
        //    base_credits with no quality multiplier. Applying it here made the
        //    preview diverge from the actual charge on Pro/Studio plans.
        $qualityMultiplier = 1.00;
        $qualityName = 'Standard';
        $targetPlan = null;

        if ($plan && !$isFlatFee) {
            // Backwards compatibility with qualityCode
            if ($qualityCode && $plan->getQualityTierCode() !== $qualityCode) {
                $targetPlan = \App\Models\Plan::all()->first(function ($p) use ($qualityCode) {
                    return $p->getQualityTierCode() === $qualityCode;
                });
            }

            $activePlan = $targetPlan ?? $plan;
            $qualityMultiplier = (float) $activePlan->quality_multiplier;
            $qualityName = ucfirst($activePlan->getQualityTierCode());
        }

        $creditsAfterQuality = (int) ($creditsAfterResolution * $qualityMultiplier);

        // 5. Apply provider multiplier from Plan's provider_config
        $providerMultiplier = 1.0;
        $providerName = null;
        
        if ($provider && $plan) {
            $activePlan = $targetPlan ?? $plan;
            $providerMultiplier = $activePlan->getProviderMultiplier($provider);
            $providerName = $provider . ($providerModel ? " ({$providerModel})" : '');
        }
        
        $creditsAfterProvider = (int) ($creditsAfterQuality * $providerMultiplier);
        // 6. Calculate totals
        $subtotal = $creditsAfterProvider;
        $totalCredits = $subtotal * $quantity;

        // 7. Get exchange rate
        $exchangeRate = CreditSetting::exchangeRate();
        $vndEquivalent = $totalCredits / $exchangeRate;

        return [
            'breakdown' => [
                'video_type' => [
                    'code' => $videoType->code,
                    'name' => $videoType->name,
                    'base_credits' => $baseCredits,
                ],
                'duration' => [
                    'code' => $durationTier?->code ?? 'default',
                    'name' => $durationTier?->name ?? 'Default',
                    'seconds' => $durationTier?->seconds ?? 0,
                    'multiplier' => (float) $durationMultiplier,
                    'cost' => $creditsAfterDuration - $baseCredits,
                ],
                'resolution' => [
                    'code' => $resolution?->code ?? 'default',
                    'name' => $resolution?->name ?? 'Default',
                    'multiplier' => (float) $resolutionMultiplier,
                    'cost' => $creditsAfterResolution - $creditsAfterDuration,
                ],
                'quality' => [
                    'code' => $qualityCode,
                    'name' => $qualityName,
                    'multiplier' => (float) $qualityMultiplier,
                    'cost' => $creditsAfterQuality - $creditsAfterResolution,
                ],
                'provider' => [
                    'name' => $providerName,
                    'multiplier' => (float) $providerMultiplier,
                    'cost' => $creditsAfterProvider - $creditsAfterQuality,
                ],
                'quantity' => $quantity,
            ],
            'pricing' => [
                'subtotal' => $subtotal,
                'total_credits' => $totalCredits,
                'vnd_equivalent' => $vndEquivalent,
                'exchange_rate' => $exchangeRate,
            ],
        ];
    }

    /**
     * Get all available options for pricing form
     */
    public static function getAvailableOptions(?string $videoTypeCode = null): array
    {
        $query = VideoType::active()->orderBy('sort_order');
        
        if ($videoTypeCode) {
            $query->where('code', $videoTypeCode);
        }

        // Get qualities from Plan configurations
        $qualities = \App\Models\Plan::orderBy('sort_order')
            ->get()
            ->map(function ($plan) {
                return [
                    'code' => $plan->getQualityTierCode(),
                    'name' => ucfirst($plan->getQualityTierCode()),
                    'multiplier' => (float) $plan->quality_multiplier,
                    'description' => $plan->description ?? "Chất lượng gói {$plan->name}",
                ];
            })
            ->unique('code')
            ->values();

        // Read provider definitions from config
        $providerConfig = config('media_providers.providers', []);
        $providers = collect($providerConfig)->map(function($data, $id) {
            return [
                'id' => $id,
                'name' => $data['label'] ?? ucfirst($id),
                'models' => array_keys($data['models'] ?? []),
                'description' => "Nhà cung cấp " . ($data['label'] ?? ucfirst($id))
            ];
        })->values();

        return [
            'video_types' => $query->get([
                'code', 'name', 'description', 'icon', 'base_credits'
            ]),
            
            'durations' => DurationTier::active()
                ->orderBy('sort_order')
                ->get(['code', 'name', 'seconds', 'multiplier']),
            
            'resolutions' => ResolutionPricing::active()
                ->orderBy('sort_order')
                ->get(['code', 'name', 'width', 'height', 'multiplier']),
            
            'qualities' => $qualities,
            'providers' => $providers,
        ];
    }

    /**
     * Get available packages
     */
    public static function getPackages(?string $videoTypeCode = null): array
    {
        $query = PricingPackage::active()
            ->with('videoType')
            ->orderBy('sort_order');
        
        if ($videoTypeCode) {
            $query->whereHas('videoType', function ($q) use ($videoTypeCode) {
                $q->where('code', $videoTypeCode);
            });
        }

        return $query->get()->map(function ($package) {
            return [
                'id' => $package->id,
                'name' => $package->name,
                'description' => $package->description,
                'video_type' => [
                    'code' => $package->videoType->code,
                    'name' => $package->videoType->name,
                ],
                'duration_seconds' => $package->duration_seconds,
                'resolution' => $package->resolution,
                'included_addons' => $package->included_addons,
                'pricing' => [
                    'regular_price' => $package->regular_price,
                    'package_price' => $package->package_price,
                    'discount_percent' => $package->discount_percent,
                    'saving_amount' => $package->regular_price - $package->package_price,
                ],
                'popular' => $package->discount_percent >= 20,
            ];
        })->toArray();
    }

    /**
     * Validate a video configuration and check provider support
     */
    public static function validate(array $data): array
    {
        $videoTypeCode = $data['video_type'] ?? null;
        $durationCode = $data['duration'] ?? null;
        $resolutionCode = $data['resolution'] ?? null;
        $provider = $data['provider'] ?? null;

        $warnings = [];
        $errors = [];
        $supportedProviders = [];

        $videoType = $videoTypeCode ? VideoType::where('code', $videoTypeCode)->first() : null;
        if (!$videoType) {
            $errors[] = 'Invalid video type';
            return ['valid' => false, 'warnings' => $warnings, 'errors' => $errors];
        }

        $plan = null;
        if (auth()->check()) {
            $plan = auth()->user()->plan;
        }
        if (!$plan) {
            $plan = \App\Models\Plan::where('slug', 'free')->first() ?? \App\Models\Plan::first();
        }

        $providerConfig = $plan ? $plan->provider_config : [];

        if (empty($providerConfig)) {
            $errors[] = "No providers available for user plan";
            return ['valid' => false, 'warnings' => $warnings, 'errors' => $errors];
        }

        foreach ($providerConfig as $pCode => $pCfg) {
            if (!empty($pCfg['is_enabled'])) {
                $supportedProviders[] = [
                    'provider' => $pCode,
                    'model' => $plan->resolveModelForType($videoTypeCode),
                    'description' => "Nhà cung cấp {$pCode}",
                ];
            }
        }

        // If a specific provider is requested but doesn't support the combination
        if ($provider) {
            $requestedSupported = array_filter($supportedProviders, fn($sp) => $sp['provider'] === $provider);
            if (empty($requestedSupported)) {
                $warnings[] = "Provider '{$provider}' is not enabled in your plan";
            }
        }

        if (empty($supportedProviders)) {
            $warnings[] = 'No provider is currently enabled in your plan';
        }

        return [
            'valid' => empty($errors),
            'warnings' => $warnings,
            'errors' => $errors,
            'supported_providers' => $supportedProviders,
        ];
    }
}

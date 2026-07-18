<?php

namespace App\Filament\Pages;

use App\Models\VideoType;
use App\Models\DurationTier;
use App\Models\ResolutionPricing;
use App\Services\Pricing\PricingCalculator;
use Filament\Pages\Page;

class PricingTable extends Page
{
    protected static \BackedEnum|string|null $navigationIcon = 'heroicon-o-table-cells';

    protected string $view = 'filament.pages.pricing-table';

    protected static string|\UnitEnum|null $navigationGroup = 'Billing & Credits';

    protected static ?string $navigationLabel = 'Bảng Giá';

    protected static ?int $navigationSort = 20;

    protected static ?string $title = 'Bảng Giá Dịch Vụ Video';

    public ?string $selectedVideoType = null;
    public ?string $selectedDuration = null;
    public ?string $selectedResolution = null;
    public ?string $selectedQuality = null;

    public array $pricingData = [];
    public array $comparisonData = [];

    public function mount(): void
    {
        $this->selectedVideoType = 'text_to_video';
        $this->selectedDuration = '5s';
        $this->selectedResolution = '720p';
        $this->selectedQuality = 'standard';
        
        $this->loadPricingData();
    }

    public function updatedSelectedVideoType(): void
    {
        $this->loadPricingData();
    }

    public function updatedSelectedDuration(): void
    {
        $this->loadPricingData();
    }

    public function updatedSelectedResolution(): void
    {
        $this->loadPricingData();
    }

    public function updatedSelectedQuality(): void
    {
        $this->loadPricingData();
    }

    public function loadPricingData(): void
    {
        // Calculate base pricing
        $baseResult = PricingCalculator::calculate([
            'video_type' => $this->selectedVideoType,
            'duration' => $this->selectedDuration,
            'resolution' => $this->selectedResolution,
            'quality' => $this->selectedQuality,
        ]);

        $this->pricingData = $baseResult;

        // Calculate provider comparison using plan configurations
        $plan = \App\Models\Plan::where('slug', 'free')->first() ?? \App\Models\Plan::first();
        $providerConfig = $plan ? $plan->provider_config : [];

        $this->comparisonData = collect($providerConfig)->map(function ($cfg, $providerCode) use ($baseResult) {
            $result = PricingCalculator::calculate([
                'video_type' => $this->selectedVideoType,
                'duration' => $this->selectedDuration,
                'resolution' => $this->selectedResolution,
                'quality' => $this->selectedQuality,
                'provider' => $providerCode,
            ]);

            return [
                'provider' => ucfirst($providerCode),
                'multiplier' => (float) ($cfg['multiplier'] ?? 1.0),
                'total_credits' => $result['pricing']['total_credits'],
                'description' => "Cấu hình nhà cung cấp " . ucfirst($providerCode),
            ];
        })->toArray();
    }

    public function getVideoTypesProperty()
    {
        return VideoType::active()->orderBy('sort_order')->get();
    }

    public function getDurationsProperty()
    {
        return DurationTier::active()->orderBy('sort_order')->get();
    }

    public function getResolutionsProperty()
    {
        return ResolutionPricing::active()->orderBy('sort_order')->get();
    }

    public function getQualitiesProperty()
    {
        return \App\Models\Plan::orderBy('sort_order')
            ->get()
            ->map(function ($plan) {
                return (object) [
                    'code' => $plan->getQualityTierCode(),
                    'name' => ucfirst($plan->getQualityTierCode()),
                    'multiplier' => (float) $plan->quality_multiplier,
                    'description' => $plan->description ?? "Gói {$plan->name}",
                ];
            })
            ->unique('code')
            ->values();
    }

    public function getPackagesProperty()
    {
        return \App\Models\PricingPackage::active()
            ->with('videoType')
            ->orderBy('sort_order')
            ->get();
    }
}

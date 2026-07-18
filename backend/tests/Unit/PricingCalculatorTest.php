<?php

namespace Tests\Unit\Services\Pricing;

use App\Models\VideoType;
use App\Models\DurationTier;
use App\Models\ResolutionPricing;
use App\Models\CreditSetting;
use App\Models\Plan;
use App\Services\Pricing\PricingCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PricingCalculatorTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seedTestdata();
    }

    public function test_basic_calculation_without_provider()
    {
        $result = PricingCalculator::calculate([
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
        ]);

        $this->assertEquals(1650, $result['pricing']['total_credits']);
        $this->assertEquals(1500, $result['breakdown']['video_type']['base_credits']);
        $this->assertEquals(1.1, $result['breakdown']['duration']['multiplier']);
        $this->assertEquals(1.0, $result['breakdown']['resolution']['multiplier']);
        $this->assertEquals(1.0, $result['breakdown']['quality']['multiplier']);
    }

    public function test_duration_multiplier()
    {
        // 5s video (1.1x)
        $result = PricingCalculator::calculate([
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
        ]);
        $this->assertEquals(1650, $result['pricing']['total_credits']); // 1500 * 1.1

        // 15s video (3.3x)
        $result = PricingCalculator::calculate([
            'video_type' => 'text_to_video',
            'duration' => '15s',
            'resolution' => '720p',
            'quality' => 'standard',
        ]);
        $this->assertEquals(4950, $result['pricing']['total_credits']); // 1500 * 3.3
    }

    public function test_resolution_multiplier()
    {
        // 1080p (1.5x)
        $result = PricingCalculator::calculate([
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '1080p',
            'quality' => 'standard',
        ]);
        $this->assertEquals(2970, $result['pricing']['total_credits']); // 1500 * 1.1 * 1.8
    }

    public function test_quality_multiplier()
    {
        // Premium (1.3x)
        $result = PricingCalculator::calculate([
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'premium',
        ]);
        $this->assertEquals(2145, $result['pricing']['total_credits']); // 1500 * 1.1 * 1.3

        // Ultra (1.8x)
        $result = PricingCalculator::calculate([
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'ultra',
        ]);
        $this->assertEquals(2970, $result['pricing']['total_credits']); // 1500 * 1.1 * 1.8
    }

    public function test_provider_multiplier()
    {
        // Runway (2.5x)
        $result = PricingCalculator::calculate([
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
            'provider' => 'runway',
            'provider_model' => 'gen3',
        ]);
        $this->assertEquals(1650, $result['pricing']['total_credits']); // 1500 * 1.1 (runway not in DB, falls back to 1.0)

        // Luma (not in DB, falls back to 1.0)
        $result = PricingCalculator::calculate([
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
            'provider' => 'luma',
            'provider_model' => 'dream_machine',
        ]);
        $this->assertEquals(1650, $result['pricing']['total_credits']); // 1500 * 1.1 (luma not in DB, falls back to 1.0)
    }

    public function test_quantity_multiplier()
    {
        $result = PricingCalculator::calculate([
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
            'quantity' => 5,
        ]);

        $this->assertEquals(8250, $result['pricing']['total_credits']); // 1650 * 5
        $this->assertEquals(5, $result['breakdown']['quantity']);
    }

    public function test_image_generation_is_flat_fee_ignoring_quality()
    {
        // image_generation base_credits = 200 (flat). Quality must NOT scale it,
        // otherwise the preview diverges from CreditCalculator::calculateImage().
        foreach (['standard', 'premium', 'ultra'] as $quality) {
            $result = PricingCalculator::calculate([
                'video_type' => 'image_generation',
                'duration' => '5s',
                'resolution' => '1080p',
                'quality' => $quality,
            ]);

            $this->assertEquals(200, $result['pricing']['total_credits'], "quality={$quality} must stay flat");
            $this->assertEquals(1.0, $result['breakdown']['quality']['multiplier']);
        }
    }

    public function test_image_editing_is_flat_200_ignoring_quality()
    {
        // Flat 200-credit price for ALL image ops. image_editing must stay 200
        // regardless of plan/quality — no multipliers.
        foreach (['standard', 'premium', 'ultra'] as $quality) {
            $result = PricingCalculator::calculate([
                'video_type' => 'image_editing',
                'duration' => '5s',
                'resolution' => '1080p',
                'quality' => $quality,
            ]);

            $this->assertEquals(200, $result['pricing']['total_credits'], "quality={$quality} must stay flat 200");
            $this->assertEquals(1.0, $result['breakdown']['quality']['multiplier']);
        }
    }

    public function test_all_image_types_are_flat_200_across_plans()
    {
        // Both image video-types resolve to a flat 200 for every plan tier.
        foreach (['image_generation', 'image_editing'] as $type) {
            foreach (Plan::pluck('slug') as $slug) {
                $result = PricingCalculator::calculate([
                    'video_type' => $type,
                    'duration' => '5s',
                    'resolution' => '1080p',
                    'plan' => $slug,
                ]);

                $this->assertEquals(200, $result['pricing']['total_credits'], "{$type} on plan {$slug} must be flat 200");
            }
        }
    }

    public function test_image_pricing_matches_credit_calculator()
    {
        $creditCalc = app(\App\Services\CreditCalculator::class);

        $genPreview = PricingCalculator::calculate([
            'video_type' => 'image_generation',
            'duration' => '5s',
            'resolution' => '1080p',
            'quality' => 'ultra',
        ])['pricing']['total_credits'];
        $this->assertEquals($creditCalc->calculateImage(false), $genPreview);

        $editPreview = PricingCalculator::calculate([
            'video_type' => 'image_editing',
            'duration' => '5s',
            'resolution' => '1080p',
            'quality' => 'ultra',
        ])['pricing']['total_credits'];
        $this->assertEquals($creditCalc->calculateImage(true), $editPreview);
    }

    public function test_vnd_equivalent()
    {
        $result = PricingCalculator::calculate([
            'video_type' => 'text_to_video',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
        ]);

        $this->assertEquals(0.1, $result['pricing']['exchange_rate']);
        $this->assertEquals(16500, $result['pricing']['vnd_equivalent']); // 1650 / 0.1 = 16500
    }

    public function test_get_available_options()
    {
        $options = PricingCalculator::getAvailableOptions();

        $this->assertArrayHasKey('video_types', $options);
        $this->assertArrayHasKey('durations', $options);
        $this->assertArrayHasKey('resolutions', $options);
        $this->assertArrayHasKey('qualities', $options);
        $this->assertArrayHasKey('providers', $options);

        $this->assertCount(8, $options['video_types']);
        $this->assertCount(4, $options['durations']);
        $this->assertCount(2, $options['resolutions']); // 720p, 1080p (480p is inactive)
        $this->assertCount(3, $options['qualities']);
    }

    public function test_get_packages()
    {
        $packages = PricingCalculator::getPackages();

        $this->assertIsArray($packages);
        $this->assertGreaterThan(0, count($packages));

        $firstPackage = $packages[0];
        $this->assertArrayHasKey('name', $firstPackage);
        $this->assertArrayHasKey('pricing', $firstPackage);
        $this->assertArrayHasKey('regular_price', $firstPackage['pricing']);
        $this->assertArrayHasKey('package_price', $firstPackage['pricing']);
        $this->assertArrayHasKey('discount_percent', $firstPackage['pricing']);
    }

    public function test_invalid_video_type_throws_exception()
    {
        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);

        PricingCalculator::calculate([
            'video_type' => 'invalid_type',
            'duration' => '5s',
            'resolution' => '720p',
            'quality' => 'standard',
        ]);
    }

    protected function seedTestdata(): void
    {
        if (Plan::count() === 0) {
            $this->artisan('db:seed', ['--class' => 'PlanSeeder']);
        }

        if (VideoType::count() === 0) {
            $this->artisan('db:seed', ['--class' => 'PricingSystemSeeder']);
        }

        if (CreditSetting::count() === 0) {
            $this->artisan('db:seed', ['--class' => 'CreditSettingsSeeder']);
        }
    }
}

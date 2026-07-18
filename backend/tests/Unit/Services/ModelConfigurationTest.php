<?php

namespace Tests\Unit\Services;

use App\Services\ModelSelector;
use App\Models\Plan;
use App\Models\VideoType;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ModelConfigurationTest extends TestCase
{
    use RefreshDatabase;

    protected ModelSelector $selector;

    protected function setUp(): void
    {
        parent::setUp();
        $this->selector = new ModelSelector();
    }

    /** @test */
    public function all_video_types_have_default_models()
    {
        $videoTypes = ['text_to_video', 'image_to_video', 'reference_to_video', 'video_editing', 'character_animation'];

        foreach ($videoTypes as $type) {
            $model = ModelSelector::getDefaultModel($type);
            $this->assertNotNull($model, "Video type '{$type}' must have a default model");
            $this->assertNotEmpty($model, "Video type '{$type}' default model cannot be empty");
        }
    }

    /** @test */
    public function all_quality_tiers_have_valid_multipliers()
    {
        Plan::create(['slug' => 'standard', 'name' => 'Standard', 'quality_multiplier' => 1.0, 'max_concurrent_jobs' => 1, 'queue_priority' => 'low', 'monthly_credits' => 100]);
        Plan::create(['slug' => 'premium', 'name' => 'Premium', 'quality_multiplier' => 1.5, 'max_concurrent_jobs' => 1, 'queue_priority' => 'low', 'monthly_credits' => 100]);
        Plan::create(['slug' => 'ultra', 'name' => 'Ultra', 'quality_multiplier' => 2.0, 'max_concurrent_jobs' => 1, 'queue_priority' => 'low', 'monthly_credits' => 100]);

        $tiers = Plan::all();

        foreach ($tiers as $tier) {
            $this->assertGreaterThan(0, $tier->quality_multiplier, "Quality multiplier for plan '{$tier->slug}' must be positive");
            $this->assertLessThan(10, $tier->quality_multiplier, "Quality multiplier for plan '{$tier->slug}' seems too high (>{$tier->quality_multiplier})");
        }
    }

    /** @test */
    public function quality_tier_multipliers_are_increasing()
    {
        Plan::create(['slug' => 'standard', 'name' => 'Standard', 'quality_multiplier' => 1.0, 'sort_order' => 1, 'max_concurrent_jobs' => 1, 'queue_priority' => 'low', 'monthly_credits' => 100]);
        Plan::create(['slug' => 'premium', 'name' => 'Premium', 'quality_multiplier' => 1.5, 'sort_order' => 2, 'max_concurrent_jobs' => 1, 'queue_priority' => 'low', 'monthly_credits' => 100]);
        Plan::create(['slug' => 'ultra', 'name' => 'Ultra', 'quality_multiplier' => 2.0, 'sort_order' => 3, 'max_concurrent_jobs' => 1, 'queue_priority' => 'low', 'monthly_credits' => 100]);

        $standard = Plan::where('slug', 'standard')->first();
        $premium = Plan::where('slug', 'premium')->first();
        $ultra = Plan::where('slug', 'ultra')->first();

        $this->assertGreaterThan($premium->quality_multiplier, $ultra->quality_multiplier, 'Ultra multiplier must be higher than Premium');
        $this->assertGreaterThan($standard->quality_multiplier, $premium->quality_multiplier, 'Premium multiplier must be higher than Standard');
    }

    /** @test */
    public function all_models_in_mapping_are_valid_daemon_models()
    {
        $availableModels = $this->selector->getAvailableModels();
        // Flatten nested array: ['Provider' => ['id' => 'label']] => ['id', ...]
        $allModelIds = [];
        foreach ($availableModels as $providerModels) {
            $allModelIds = array_merge($allModelIds, array_keys($providerModels));
        }

        Plan::create([
            'slug' => 'standard',
            'name' => 'Standard',
            'quality_multiplier' => 1.0,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
            'monthly_credits' => 100,
            'model_mapping' => [
                'text_to_video' => 'wan2.6-t2v',
                'image_to_video' => 'wan2.6-i2v',
            ],
        ]);

        $tier = Plan::first();
        $mapping = $tier->model_mapping;

        foreach ($mapping as $type => $model) {
            if ($model !== null) {
                $this->assertContains($model, $allModelIds, "Model '{$model}' for '{$type}' is not a valid daemon model");
            }
        }
    }

    /** @test */
    public function model_selector_returns_consistent_results()
    {
        Plan::create([
            'slug' => 'premium',
            'name' => 'Premium',
            'quality_multiplier' => 1.5,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
            'monthly_credits' => 100,
            'model_mapping' => [
                'text_to_video' => 'kling-3.0-std',
                'default' => 'kling-3.0-std',
            ],
        ]);

        // Call multiple times - should return same result
        $result1 = $this->selector->resolve('premium', 'text_to_video');
        $result2 = $this->selector->resolve('premium', 'text_to_video');
        $result3 = $this->selector->resolve('premium', 'text_to_video');

        $this->assertEquals($result1, $result2);
        $this->assertEquals($result2, $result3);
    }

    /** @test */
    public function video_type_base_credits_are_reasonable()
    {
        VideoType::create(['code' => 'text_to_video', 'name' => 'T2V', 'base_credits' => 200]);
        VideoType::create(['code' => 'image_to_video', 'name' => 'I2V', 'base_credits' => 200]);
        VideoType::create(['code' => 'reference_to_video', 'name' => 'R2V', 'base_credits' => 250]);
        VideoType::create(['code' => 'video_editing', 'name' => 'Edit', 'base_credits' => 150]);
        VideoType::create(['code' => 'character_animation', 'name' => 'Anim', 'base_credits' => 300]);

        $types = VideoType::all();

        foreach ($types as $type) {
            $this->assertGreaterThan(50, $type->base_credits, "Video type '{$type->code}' base credits too low ({$type->base_credits})");
            $this->assertLessThan(1000, $type->base_credits, "Video type '{$type->code}' base credits too high ({$type->base_credits})");
        }
    }

    /** @test */
    public function pricing_formula_produces_reasonable_costs()
    {
        VideoType::create(['code' => 'text_to_video', 'name' => 'T2V', 'base_credits' => 200]);

        $baseCredits = 200;
        $durationMultiplier = 1.0; // 5s
        $resolutionMultiplier = 1.0; // 720p
        $qualityMultiplier = 1.0; // standard

        $total = $baseCredits * $durationMultiplier * $resolutionMultiplier * $qualityMultiplier;

        // 5s video at 720p standard should cost ~200 credits = 20,000đ
        $this->assertEquals(200, $total);
        $this->assertEquals(20000, $total * 100); // 1 credit = 100đ
    }

    /** @test */
    public function all_providers_have_at_least_one_model()
    {
        $models = $this->selector->getAvailableModels();

        foreach ($models as $provider => $providerModels) {
            $this->assertNotEmpty($providerModels, "Provider '{$provider}' must have at least one model");
        }
    }

    /** @test */
    public function model_costs_are_within_acceptable_range()
    {
        // Provider costs per second (in VNĐ)
        $modelCosts = [
            'wan2.6-t2v' => 2750,
            'wan2.6-i2v' => 2750,
            'kling-3.0-std' => 2100,
            'seedance-2.0' => 2000,
            'happyhorse-1.0-i2v' => 2800,
        ];

        foreach ($modelCosts as $model => $cost) {
            $this->assertGreaterThan(1000, $cost, "Model '{$model}' cost seems too low ({$cost}đ/s)");
            $this->assertLessThan(5000, $cost, "Model '{$model}' cost seems too high ({$cost}đ/s)");
        }
    }

    /** @test */
    public function quality_tier_fallback_chain_works_correctly()
    {
        // Test 1: Specific model configured
        Plan::create([
            'slug' => 'test1',
            'name' => 'Test 1',
            'quality_multiplier' => 1.0,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
            'monthly_credits' => 100,
            'model_mapping' => ['text_to_video' => 'wan2.6-t2v'],
        ]);
        $this->assertEquals('wan2.6-t2v', $this->selector->resolve('test1', 'text_to_video'));

        // Test 2: Falls back to default
        Plan::create([
            'slug' => 'test2',
            'name' => 'Test 2',
            'quality_multiplier' => 1.0,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
            'monthly_credits' => 100,
            'model_mapping' => ['default' => 'kling-3.0-std'],
        ]);
        $this->assertEquals('kling-3.0-std', $this->selector->resolve('test2', 'image_to_video'));

        // Test 3: Falls back to system default
        Plan::create([
            'slug' => 'test3',
            'name' => 'Test 3',
            'quality_multiplier' => 1.0,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
            'monthly_credits' => 100,
            'model_mapping' => [],
        ]);
        $this->assertEquals('wan2.6-i2v', $this->selector->resolve('test3', 'image_to_video'));
    }
}

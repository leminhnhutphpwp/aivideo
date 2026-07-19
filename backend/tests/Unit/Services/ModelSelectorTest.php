<?php

namespace Tests\Unit\Services;

use App\Services\ModelSelector;
use App\Models\Plan;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ModelSelectorTest extends TestCase
{
    use RefreshDatabase;

    protected ModelSelector $selector;

    protected function setUp(): void
    {
        parent::setUp();
        $this->selector = new ModelSelector();
    }

    /** @test */
    public function resolves_model_from_quality_tier_specific_config()
    {
        Plan::create([
            'slug' => 'premium',
            'name' => 'Premium',
            'quality_multiplier' => 1.30,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
            'monthly_credits' => 300,
            'model_mapping' => [
                'text_to_video' => 'kling-3.0-std',
                'image_to_video' => 'happyhorse-1.0-i2v',
            ],
        ]);

        $this->assertEquals('kling-3.0-std', $this->selector->resolve('premium', 'text_to_video'));
        $this->assertEquals('happyhorse-1.0-i2v', $this->selector->resolve('premium', 'image_to_video'));
    }

    /** @test */
    public function falls_back_to_quality_tier_default_when_specific_type_not_configured()
    {
        Plan::create([
            'slug' => 'ultra',
            'name' => 'Ultra',
            'quality_multiplier' => 1.80,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
            'monthly_credits' => 300,
            'model_mapping' => [
                'default' => 'seedance-2.0',
                'text_to_video' => 'kling-3.0-std',
            ],
        ]);

        // text_to_video has specific config
        $this->assertEquals('kling-3.0-std', $this->selector->resolve('ultra', 'text_to_video'));

        // image_to_video falls back to default
        $this->assertEquals('seedance-2.0', $this->selector->resolve('ultra', 'image_to_video'));
    }

    /** @test */
    public function falls_back_to_system_default_when_quality_tier_has_no_config()
    {
        Plan::create([
            'slug' => 'standard',
            'name' => 'Standard',
            'quality_multiplier' => 1.00,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
            'monthly_credits' => 300,
            'model_mapping' => null,
        ]);

        $this->assertEquals('wan2.6-t2v', $this->selector->resolve('standard', 'text_to_video'));
        $this->assertEquals('wan2.6-i2v', $this->selector->resolve('standard', 'image_to_video'));
        $this->assertEquals('wan2.7-r2v', $this->selector->resolve('standard', 'reference_to_video'));
        $this->assertEquals('wan2.7-videoedit', $this->selector->resolve('standard', 'video_editing'));
        $this->assertEquals('wan2.2-animate-move', $this->selector->resolve('standard', 'character_animation'));
    }

    /** @test */
    public function falls_back_to_system_default_when_quality_tier_does_not_exist()
    {
        $this->assertEquals('wan2.6-t2v', $this->selector->resolve('nonexistent', 'text_to_video'));
        $this->assertEquals('wan2.6-i2v', $this->selector->resolve('nonexistent', 'image_to_video'));
    }

    /** @test */
    public function falls_back_to_text_to_video_default_for_unknown_video_type()
    {
        Plan::create([
            'slug' => 'standard',
            'name' => 'Standard',
            'quality_multiplier' => 1.00,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
            'monthly_credits' => 300,
            'model_mapping' => null,
        ]);

        $this->assertEquals('wan2.6-t2v', $this->selector->resolve('standard', 'unknown_type'));
    }

    /** @test */
    public function handles_empty_model_mapping()
    {
        Plan::create([
            'slug' => 'premium',
            'name' => 'Premium',
            'quality_multiplier' => 1.30,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
            'monthly_credits' => 300,
            'model_mapping' => [],
        ]);

        $this->assertEquals('wan2.6-t2v', $this->selector->resolve('premium', 'text_to_video'));
    }

    /** @test */
    public function handles_null_model_value_in_mapping()
    {
        Plan::create([
            'slug' => 'premium',
            'name' => 'Premium',
            'quality_multiplier' => 1.30,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
            'monthly_credits' => 300,
            'model_mapping' => [
                'text_to_video' => null,
                'default' => 'seedance-2.0',
            ],
        ]);

        // null value should fall back to default
        $this->assertEquals('seedance-2.0', $this->selector->resolve('premium', 'text_to_video'));
    }

    /** @test */
    public function get_available_models_returns_all_providers()
    {
        $models = $this->selector->getAvailableModels();

        $this->assertArrayHasKey('Qwen Cloud (Alibaba)', $models);
        $this->assertArrayHasKey('CKey (TTS & LLM)', $models);

        $this->assertArrayHasKey('wan2.6-t2v', $models['Qwen Cloud (Alibaba)']);
        $this->assertArrayHasKey('tts-1', $models['CKey (TTS & LLM)']);
    }

    /** @test */
    public function get_default_model_returns_correct_default()
    {
        $this->assertEquals('wan2.6-t2v', ModelSelector::getDefaultModel('text_to_video'));
        $this->assertEquals('wan2.6-i2v', ModelSelector::getDefaultModel('image_to_video'));
        $this->assertEquals('wan2.6-t2v', ModelSelector::getDefaultModel('unknown_type'));
    }

    /** @test */
    public function system_default_image_models_point_to_qwencloud()
    {
        // qwencloud is the primary image provider (prod loads the real
        // DASHSCOPE_API_KEY). System defaults must match config/media_providers.php.
        $this->assertEquals('z-image-turbo', ModelSelector::getDefaultModel('image_generation'));
        $this->assertEquals('wan2.5-i2i-preview', ModelSelector::getDefaultModel('image_editing'));
    }

    /** @test */
    public function seeded_plans_resolve_image_generation_to_qwencloud_models()
    {
        $this->seed(\Database\Seeders\PlanSeeder::class);

        $expected = [
            'free' => 'z-image-turbo',
            'pro' => 'qwen-image-plus',
            // Studio uses the cheaper qwen-image-2.0 ($0.035) — the -pro ($0.075) left the flat
            // 200-credit image fee at ~6% margin (unit-economics-2026-07-18 / A1).
            'studio' => 'qwen-image-2.0',
        ];

        foreach ($expected as $slug => $model) {
            $this->assertEquals(
                $model,
                $this->selector->resolve($slug, 'image_generation'),
                "Plan {$slug} should resolve image_generation to {$model}"
            );
        }
    }

    /** @test */
    public function resolves_correctly_with_partial_quality_tier_config()
    {
        Plan::create([
            'slug' => 'premium',
            'name' => 'Premium',
            'quality_multiplier' => 1.30,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
            'monthly_credits' => 300,
            'model_mapping' => [
                'text_to_video' => 'kling-3.0-std',
                'character_animation' => 'wavespeed-ai/wan-2.2-animate',
            ],
        ]);

        // Specific configs
        $this->assertEquals('kling-3.0-std', $this->selector->resolve('premium', 'text_to_video'));
        $this->assertEquals('wavespeed-ai/wan-2.2-animate', $this->selector->resolve('premium', 'character_animation'));

        // Unmapped types fall back to system default
        $this->assertEquals('wan2.6-i2v', $this->selector->resolve('premium', 'image_to_video'));
        $this->assertEquals('wan2.7-r2v', $this->selector->resolve('premium', 'reference_to_video'));
    }
}

<?php
namespace Database\Seeders;

use App\Models\CreditSetting;
use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        // monthly_credits = ceil(price_sale × exchange_rate) + bonus_credits
        // exchange_rate từ CreditSetting admin — sửa 1 chỗ, tự đồng bộ
        $exchangeRate = CreditSetting::exchangeRate();

        $freeMonthly = (int) ceil(0 * $exchangeRate) + 2000;

        $proPrice = 249000;
        $proMonthly = (int) ceil($proPrice * $exchangeRate) + 0;

        $studioMonthly = (int) ceil(0 * $exchangeRate) + 0;

        $defaultProviderConfig = [
            'stub' => [
                'is_enabled' => true,
                'api_key' => null,
                'base_url' => null,
                'multiplier' => 1.0
            ]
        ];

        Plan::updateOrCreate(
            ['slug' => 'free'],
            [
                'name' => 'Free',
                'price_regular' => 0,
                'price_sale' => 0,
                'max_concurrent_jobs' => 1,
                'max_renders_per_day' => 15,
                'queue_priority' => 'low',
                'monthly_credits' => $freeMonthly,
                'bonus_credits' => 2000,
                'status' => 'active',
                'sort_order' => 1,
                'is_popular' => false,
                'quality_multiplier' => 1.00,
                'model_mapping' => [
                    'default' => 'wan2.6-t2v',
                    'text_to_video' => 'wan2.6-t2v',
                    'image_to_video' => 'wan2.6-i2v',
                    'reference_to_video' => 'wan2.7-r2v',
                    'video_editing' => 'wan2.7-videoedit',
                    'character_animation' => 'wan2.2-animate-move',
                    'image_generation' => 'z-image-turbo',
                    'image_editing' => 'wan2.5-i2i-preview',
                    'storyboard_video' => 'wan2.6-t2v',
                ],
                'provider_config' => $defaultProviderConfig,
                'default_provider' => 'stub',
            ]
        );

        Plan::updateOrCreate(
            ['slug' => 'pro'],
            [
                'name' => 'Pro',
                'price_regular' => $proPrice,
                'price_sale' => $proPrice,
                'max_concurrent_jobs' => 3,
                'max_renders_per_day' => 100,
                'queue_priority' => 'high',
                'monthly_credits' => $proMonthly,
                'bonus_credits' => 0,
                'audio_generation' => true,
                'status' => 'active',
                'sort_order' => 2,
                'is_popular' => true,
                'quality_multiplier' => 1.30,
                'model_mapping' => [
                    'default' => 'wan2.7-t2v-2026-04-25',
                    'text_to_video' => 'wan2.7-t2v-2026-04-25',
                    'image_to_video' => 'wan2.7-i2v-2026-04-25',
                    'reference_to_video' => 'wan2.7-r2v',
                    'video_editing' => 'wan2.7-videoedit',
                    'character_animation' => 'wan2.2-animate-mix',
                    'image_generation' => 'qwen-image-plus',
                    'image_editing' => 'qwen-image-edit-plus',
                    'storyboard_video' => 'wan2.7-t2v-2026-04-25',
                ],
                'provider_config' => $defaultProviderConfig,
                'default_provider' => 'stub',
            ]
        );

        Plan::updateOrCreate(
            ['slug' => 'studio'],
            [
                'name' => 'Studio',
                'price_regular' => 0,
                'price_sale' => 0,
                'max_concurrent_jobs' => 10,
                'max_renders_per_day' => null, // unlimited
                'queue_priority' => 'high',
                'monthly_credits' => $studioMonthly,
                'bonus_credits' => 0,
                'audio_generation' => true,
                'status' => 'coming_soon',
                'sort_order' => 3,
                'is_popular' => false,
                'quality_multiplier' => 1.80,
                'model_mapping' => [
                    'default' => 'wan2.7-t2v-2026-04-25',
                    'text_to_video' => 'wan2.7-t2v-2026-04-25',
                    'image_to_video' => 'wan2.7-i2v-2026-04-25',
                    'reference_to_video' => 'wan2.7-r2v',
                    'video_editing' => 'wan2.7-videoedit',
                    'character_animation' => 'wan2.2-animate-mix',
                    'image_generation' => 'qwen-image-2.0-pro',
                    'image_editing' => 'qwen-image-edit-max',
                    'storyboard_video' => 'wan2.7-t2v-2026-04-25',
                ],
                'provider_config' => $defaultProviderConfig,
                'default_provider' => 'stub',
            ]
        );
    }
}

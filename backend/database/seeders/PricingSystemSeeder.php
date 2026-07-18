<?php

namespace Database\Seeders;

use App\Models\VideoType;
use App\Models\DurationTier;
use App\Models\ResolutionPricing;
use App\Models\PricingPackage;
use Illuminate\Database\Seeder;

class PricingSystemSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Video Types - Base credits for 5s at 1.0x multiplier
        // Tỷ lệ 1:1 (1 credit = 1 VNĐ).

        // --- Image Types (flat fee, not per-second) ---
        VideoType::updateOrCreate(
            ['code' => 'image_generation'],
            [
                'name' => 'Text-to-Image',
                'description' => 'Tạo hình ảnh từ mô tả văn bản (Qwen-Image, Wan, CKey)',
                'icon' => 'heroicon-o-photo',
                'base_credits' => 200,
                'is_active' => true,
                'sort_order' => 0,
            ]
        );

        VideoType::updateOrCreate(
            ['code' => 'image_editing'],
            [
                'name' => 'Image Editing',
                'description' => 'Chỉnh sửa ảnh bằng văn bản hoặc ảnh tham chiếu',
                'icon' => 'heroicon-o-swatch',
                'base_credits' => 200,
                'is_active' => true,
                'sort_order' => 0,
            ]
        );

        VideoType::updateOrCreate(
            ['code' => 'text_to_video'],
            [
                'name' => 'Text-to-Video',
                'description' => 'Tạo video từ mô tả văn bản',
                'icon' => 'heroicon-o-document-text',
                'base_credits' => 1500,
                'is_active' => true,
                'sort_order' => 1,
            ]
        );

        VideoType::updateOrCreate(
            ['code' => 'image_to_video'],
            [
                'name' => 'Image-to-Video',
                'description' => 'Tạo video từ hình ảnh',
                'icon' => 'heroicon-o-photo',
                'base_credits' => 1500,
                'is_active' => true,
                'sort_order' => 2,
            ]
        );

        VideoType::updateOrCreate(
            ['code' => 'reference_to_video'],
            [
                'name' => 'Reference-to-Video',
                'description' => 'Tạo video từ video tham chiếu',
                'icon' => 'heroicon-o-video-camera',
                'base_credits' => 1875,
                'is_active' => true,
                'sort_order' => 3,
            ]
        );

        VideoType::updateOrCreate(
            ['code' => 'video_editing'],
            [
                'name' => 'Video Editing',
                'description' => 'Chỉnh sửa, cắt ghép video',
                'icon' => 'heroicon-o-scissors',
                'base_credits' => 1125,
                'is_active' => true,
                'sort_order' => 4,
            ]
        );

        VideoType::updateOrCreate(
            ['code' => 'character_animation'],
            [
                'name' => 'Character Animation',
                'description' => 'Hoạt hình nhân vật',
                'icon' => 'heroicon-o-face-smile',
                'base_credits' => 2250,
                'is_active' => true,
                'sort_order' => 5,
            ]
        );

        VideoType::updateOrCreate(
            ['code' => 'storyboard_video'],
            [
                'name' => 'Storyboard-to-Video',
                'description' => 'Tạo video từ storyboard nhiều cảnh, giữ nhất quán nhân vật/sản phẩm',
                'icon' => 'heroicon-o-film',
                'base_credits' => 1875,
                'is_active' => true,
                'sort_order' => 6,
            ]
        );

        // 2. Duration Tiers - Linear pricing (API cost = 0.1$/s cho Wan)
        // API cost 5s 720P ≈ 13,172 VND → target 20% margin → 1,650 credits
        // Công thức: credits = 1,500 × multiplier × res × quality × provider
        $durations = [
            ['code' => '5s',  'name' => '5 giây',  'seconds' => 5,  'multiplier' => 1.10],
            ['code' => '8s',  'name' => '8 giây',  'seconds' => 8,  'multiplier' => 1.76],
            ['code' => '10s', 'name' => '10 giây', 'seconds' => 10, 'multiplier' => 2.20],
            ['code' => '15s', 'name' => '15 giây', 'seconds' => 15, 'multiplier' => 3.30],
        ];

        foreach ($durations as $data) {
            DurationTier::updateOrCreate(
                ['code' => $data['code']],
                array_merge($data, ['is_active' => true, 'sort_order' => $data['seconds']])
            );
        }

        DurationTier::whereNotIn('code', ['5s', '8s', '10s', '15s'])->delete();

        // 3. Resolution Pricings
        $resolutions = [
            ['code' => '480p', 'name' => 'SD 480p', 'width' => 854, 'height' => 480, 'multiplier' => 0.7, 'is_active' => false],
            ['code' => '720p', 'name' => 'HD 720p', 'width' => 1280, 'height' => 720, 'multiplier' => 1.0],
            ['code' => '1080p', 'name' => 'Full HD 1080p', 'width' => 1920, 'height' => 1080, 'multiplier' => 1.8]
        ];

        foreach ($resolutions as $data) {
            ResolutionPricing::updateOrCreate(
                ['code' => $data['code']],
                array_merge(['is_active' => true, 'sort_order' => $data['height']], $data)
            );
        }

        // 4. Quality Tiers (Removed: models and pricing configurations are now managed inside Plans)

        // 5. Provider Pricings (Removed: provider configurations are now managed inside Plans)

        // 6. Pricing Packages (gói combo)
        $t2v = VideoType::where('code', 'text_to_video')->value('id');
        PricingPackage::updateOrCreate(
            ['name' => 'Starter Pack - Text to Video'],
            [
                'video_type_id' => $t2v,
                'description' => 'Gói trải nghiệm cho người mới',
                'duration_seconds' => 5,
                'resolution' => '720p',
                'included_addons' => ['bgm'],
                'regular_price' => 1300,
                'package_price' => 1000,
                'discount_percent' => 23,
                'is_active' => true,
                'sort_order' => 1,
            ]
        );

        PricingPackage::updateOrCreate(
            ['name' => 'Pro Pack - Text to Video'],
            [
                'video_type_id' => $t2v,
                'description' => 'Gói chuyên nghiệp với đầy đủ tính năng',
                'duration_seconds' => 15,
                'resolution' => '1080p',
                'included_addons' => ['voice_over', 'bgm', 'subtitles'],
                'regular_price' => 4750,
                'package_price' => 3800,
                'discount_percent' => 20,
                'is_active' => true,
                'sort_order' => 2,
            ]
        );

        PricingPackage::updateOrCreate(
            ['name' => 'Enterprise Pack - Text to Video'],
            [
                'video_type_id' => $t2v,
                'description' => 'Gói doanh nghiệp - Full HD 1080p',
                'duration_seconds' => 15,
                'resolution' => '1080p',
                'included_addons' => ['voice_over', 'ai_script', 'bgm', 'subtitles', 'priority_render'],
                'regular_price' => 12000,
                'package_price' => 9000,
                'discount_percent' => 25,
                'is_active' => true,
                'sort_order' => 3,
            ]
        );
    }
}

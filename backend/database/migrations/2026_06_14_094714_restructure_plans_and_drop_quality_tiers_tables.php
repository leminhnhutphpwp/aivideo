<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Thêm các cột cấu hình vào bảng plans
        Schema::table('plans', function (Blueprint $table) {
            $table->decimal('quality_multiplier', 3, 2)->default(1.00)->after('name');
            $table->json('model_mapping')->nullable()->after('quality_multiplier');
            $table->json('provider_config')->nullable()->after('model_mapping');
        });

        // 2. Chuyển đổi dữ liệu cũ từ quality_tiers sang plans
        if (Schema::hasTable('quality_tiers')) {
            $plans = DB::table('plans')->get();
            foreach ($plans as $plan) {
                $qualityTier = DB::table('quality_tiers')->where('id', $plan->quality_tier_id)->first();
                
                $qualityMultiplier = 1.00;
                $modelMapping = null;
                
                if ($qualityTier) {
                    $qualityMultiplier = $qualityTier->multiplier;
                    $modelMapping = $qualityTier->model_mapping;
                } else {
                    // Fallback mặc định theo slug của plan
                    $modelMapping = json_encode([
                        'default' => 'wan2.6-t2v',
                        'text_to_video' => 'wan2.6-t2v',
                        'image_to_video' => 'wan2.6-i2v',
                        'reference_to_video' => 'wan2.7-r2v',
                        'video_editing' => 'wan2.7-videoedit',
                        'character_animation' => 'wan2.2-animate-move',
                        'image_generation' => 'z-image-turbo',
                        'image_editing' => 'wan2.5-i2i-preview',
                        'storyboard_video' => 'wan2.6-t2v',
                    ]);
                }

                // Thiết lập provider_config mặc định
                $providerConfig = json_encode([
                    'qwencloud' => [
                        'is_enabled' => true,
                        'api_key' => null,
                        'base_url' => null,
                        'multiplier' => 1.15
                    ],
                    'ckey' => [
                        'is_enabled' => true,
                        'api_key' => null,
                        'base_url' => null,
                        'multiplier' => 1.0
                    ],
                    'elevenlabs' => [
                        'is_enabled' => true,
                        'api_key' => null,
                        'base_url' => null,
                        'multiplier' => 1.0
                    ],
                    'cloudflare' => [
                        'is_enabled' => true,
                        'api_key' => null,
                        'base_url' => null,
                        'multiplier' => 1.0
                    ],
                    'stub' => [
                        'is_enabled' => true,
                        'api_key' => null,
                        'base_url' => null,
                        'multiplier' => 1.0
                    ]
                ]);

                DB::table('plans')->where('id', $plan->id)->update([
                    'quality_multiplier' => $qualityMultiplier,
                    'model_mapping' => $modelMapping,
                    'provider_config' => $providerConfig,
                ]);
            }
        }

        // 3. Xóa khóa ngoại, cột quality_tier_id và các bảng cũ (bỏ qua trên SQLite để tránh lỗi SQLite foreign key check)
        if (DB::getDriverName() !== 'sqlite') {
            Schema::disableForeignKeyConstraints();

            Schema::table('plans', function (Blueprint $table) {
                // Kiểm tra và drop foreign key
                $foreignKeys = DB::select(
                    "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE 
                     WHERE TABLE_SCHEMA = DATABASE() 
                     AND TABLE_NAME = 'plans' 
                     AND COLUMN_NAME = 'quality_tier_id' 
                     AND REFERENCED_TABLE_NAME = 'quality_tiers'"
                );

                if (!empty($foreignKeys)) {
                    $table->dropForeign(['quality_tier_id']);
                }
                $table->dropColumn('quality_tier_id');
            });

            Schema::dropIfExists('provider_pricings');
            Schema::dropIfExists('quality_tiers');
            Schema::dropIfExists('video_type_pricings');
            Schema::dropIfExists('pricing_addons');
            
            Schema::enableForeignKeyConstraints();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Phục hồi lại cột và bảng cũ
        Schema::table('plans', function (Blueprint $table) {
            $table->unsignedBigInteger('quality_tier_id')->nullable()->after('price_monthly');
            $table->dropColumn(['quality_multiplier', 'model_mapping', 'provider_config']);
        });

        // Trong trường hợp rollback, ta tạo lại các bảng cũ (chỉ cần cấu trúc cơ bản)
        Schema::create('quality_tiers', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->decimal('multiplier', 3, 2)->default(1.00);
            $table->string('description')->nullable();
            $table->json('model_mapping')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('provider_pricings', function (Blueprint $table) {
            $table->id();
            $table->string('provider');
            $table->string('model');
            $table->unsignedBigInteger('video_type_id')->nullable();
            $table->decimal('base_multiplier', 3, 2)->default(1.00);
            $table->integer('min_duration_seconds')->default(0);
            $table->integer('max_duration_seconds')->default(120);
            $table->json('supported_resolutions')->nullable();
            $table->json('supported_addons')->nullable();
            $table->string('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }
};

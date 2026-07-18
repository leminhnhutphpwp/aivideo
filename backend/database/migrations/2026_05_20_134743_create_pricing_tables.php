<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Base pricing theo loại video
        Schema::create('video_types', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // text_to_video, image_to_video...
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('icon')->nullable();
            $table->integer('base_credits'); // Credits cơ bản
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // 2. Duration tiers (bậc thời lượng)
        Schema::create('duration_tiers', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // 3s, 5s, 10s...
            $table->string('name');
            $table->integer('seconds'); // 3, 5, 10...
            $table->decimal('multiplier', 5, 2)->default(1.0); // Nhân với base_credits
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // 3. Resolution pricing
        Schema::create('resolution_pricings', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // 720p, 1080p, 2k, 4k
            $table->string('name');
            $table->integer('width');
            $table->integer('height');
            $table->decimal('multiplier', 5, 2)->default(1.0);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // 4. Quality tiers
        Schema::create('quality_tiers', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // standard, premium, ultra
            $table->string('name');
            $table->decimal('multiplier', 5, 2)->default(1.0);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // 5. Add-on services
        Schema::create('pricing_addons', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // voice_over, ai_script, bgm...
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('pricing_type', ['fixed', 'per_second', 'percentage']);
            $table->integer('base_credits'); // Credits cố định hoặc per second
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // 6. Provider-specific pricing (override)
        Schema::create('provider_pricings', function (Blueprint $table) {
            $table->id();
            $table->string('provider'); // seedance, runway, kling...
            $table->string('model')->nullable(); // v2, gen3, sora...
            $table->foreignId('video_type_id')->constrained()->cascadeOnDelete();
            $table->decimal('base_multiplier', 5, 2)->default(1.0); // Nhân với base_credits
            $table->integer('min_duration_seconds')->default(3);
            $table->integer('max_duration_seconds')->default(60);
            $table->json('supported_resolutions')->nullable(); // ["720p", "1080p"]
            $table->json('supported_addons')->nullable(); // ["voice_over", "ai_script"]
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['provider', 'model']);
            $table->index('is_active');
        });

        // 7. Package deals (gói combo giảm giá)
        Schema::create('pricing_packages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('video_type_id')->constrained()->cascadeOnDelete();
            $table->integer('duration_seconds');
            $table->string('resolution');
            $table->json('included_addons'); // ["voice_over", "bgm"]
            $table->integer('regular_price'); // Giá gốc
            $table->integer('package_price'); // Giá gói
            $table->integer('discount_percent')->default(0);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pricing_packages');
        Schema::dropIfExists('provider_pricings');
        Schema::dropIfExists('pricing_addons');
        Schema::dropIfExists('quality_tiers');
        Schema::dropIfExists('resolution_pricings');
        Schema::dropIfExists('duration_tiers');
        Schema::dropIfExists('video_types');
    }
};

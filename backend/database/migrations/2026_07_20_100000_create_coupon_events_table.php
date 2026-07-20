<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupon_events', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique()->index();
            $table->text('description')->nullable();
            $table->enum('reward_type', ['credits', 'percent', 'fixed'])->default('credits');
            $table->unsignedInteger('reward_value');
            $table->unsignedInteger('max_discount')->nullable();
            $table->unsignedInteger('min_purchase_amount')->nullable();
            $table->string('code_prefix')->nullable();
            $table->unsignedInteger('max_claims')->nullable();
            $table->unsignedInteger('claims_count')->default(0);
            $table->unsignedInteger('per_user_uses')->default(1);
            $table->unsignedInteger('code_valid_days')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->boolean('auto_grant')->default(false);
            $table->boolean('require_verified')->default(false);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_public')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupon_events');
    }
};

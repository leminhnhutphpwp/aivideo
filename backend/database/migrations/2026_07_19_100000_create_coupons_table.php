<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('description')->nullable();
            // credits = redeem cộng credits; percent/fixed = giảm giá khi mua gói nạp.
            $table->enum('type', ['credits', 'percent', 'fixed'])->default('credits');
            $table->unsignedInteger('value'); // credits / % / VND tuỳ type
            $table->unsignedInteger('max_discount')->nullable();       // trần giảm cho percent (VND)
            $table->unsignedInteger('min_purchase_amount')->nullable(); // đơn tối thiểu cho discount (VND)
            $table->unsignedInteger('max_uses')->nullable();            // null = không giới hạn tổng
            $table->unsignedInteger('used_count')->default(0);
            $table->unsignedInteger('max_uses_per_user')->default(1);
            $table->boolean('is_welcome')->default(false);             // mã chào mừng tự cấp khi verify
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('is_active');
            $table->index('is_welcome');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupons');
    }
};

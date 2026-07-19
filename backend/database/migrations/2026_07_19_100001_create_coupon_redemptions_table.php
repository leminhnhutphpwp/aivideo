<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupon_redemptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            // reserved = giữ chỗ khi tạo đơn nạp (discount); completed = đã cấp/đã thanh toán;
            // voided = đơn hết hạn/huỷ, nhả lại lượt.
            $table->enum('status', ['reserved', 'completed', 'voided'])->default('completed');
            $table->unsignedInteger('credits_granted')->nullable();
            $table->unsignedInteger('amount_discounted')->nullable();
            $table->foreignId('pending_credit_purchase_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('credit_transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('redeemed_at')->nullable();
            $table->timestamps();

            $table->index(['coupon_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupon_redemptions');
    }
};

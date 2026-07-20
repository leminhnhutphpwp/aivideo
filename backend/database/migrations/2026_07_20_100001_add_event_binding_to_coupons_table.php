<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->unsignedBigInteger('coupon_event_id')->nullable()->after('id');
            $table->unsignedBigInteger('user_id')->nullable()->after('coupon_event_id');

            $table->foreign('coupon_event_id')->references('id')->on('coupon_events')->nullOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();

            $table->index('coupon_event_id');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->dropForeign(['coupon_event_id']);
            $table->dropForeign(['user_id']);
            $table->dropIndex(['coupon_event_id']);
            $table->dropIndex(['user_id']);
            $table->dropColumn(['coupon_event_id', 'user_id']);
        });
    }
};

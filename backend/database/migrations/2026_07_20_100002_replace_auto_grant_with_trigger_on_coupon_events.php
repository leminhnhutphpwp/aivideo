<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coupon_events', function (Blueprint $table) {
            $table->enum('trigger', ['manual', 'signup', 'birthday'])
                ->default('manual')
                ->after('is_public');
        });

        // Giữ dữ liệu đã seed: auto_grant=true → trigger='signup'.
        DB::table('coupon_events')->where('auto_grant', true)->update(['trigger' => 'signup']);

        Schema::table('coupon_events', function (Blueprint $table) {
            $table->dropColumn('auto_grant');
        });
    }

    public function down(): void
    {
        Schema::table('coupon_events', function (Blueprint $table) {
            $table->boolean('auto_grant')->default(false)->after('is_public');
        });

        DB::table('coupon_events')->where('trigger', 'signup')->update(['auto_grant' => true]);

        Schema::table('coupon_events', function (Blueprint $table) {
            $table->dropColumn('trigger');
        });
    }
};

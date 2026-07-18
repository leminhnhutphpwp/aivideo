<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->integer('price_regular')->default(0);
            $table->integer('price_sale')->nullable();
        });

        DB::statement('UPDATE plans SET price_regular = price_monthly');

        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['price_monthly', 'price_yearly', 'stripe_price_id', 'api_access']);
        });

        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn(['stripe_id', 'pm_type', 'pm_last_four', 'trial_ends_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->integer('price_monthly')->default(0);
            $table->integer('price_yearly')->default(0);
            $table->string('stripe_price_id')->nullable();
            $table->boolean('api_access')->default(false);
        });

        DB::statement('UPDATE plans SET price_monthly = price_regular');

        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['price_regular', 'price_sale']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('stripe_id')->nullable()->unique();
            $table->string('pm_type')->nullable();
            $table->string('pm_last_four')->nullable();
            $table->timestamp('trial_ends_at')->nullable();
        });
    }
};

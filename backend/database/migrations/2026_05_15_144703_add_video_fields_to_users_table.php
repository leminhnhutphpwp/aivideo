<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->uuid('uuid')->unique()->after('id');
            $table->integer('credits')->default(0)->after('remember_token');
            $table->integer('credits_total_used')->default(0)->after('credits');
            $table->foreignId('plan_id')->nullable()->constrained('plans')->after('credits_total_used');
            $table->string('stripe_id')->nullable()->unique()->after('plan_id');
            $table->string('pm_type')->nullable()->after('stripe_id');
            $table->string('pm_last_four')->nullable()->after('pm_type');
            $table->timestamp('trial_ends_at')->nullable()->after('pm_last_four');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['uuid', 'credits', 'credits_total_used', 'plan_id', 'stripe_id', 'pm_type', 'pm_last_four', 'trial_ends_at']);
        });
    }
};

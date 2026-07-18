<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('plan_expires_at')->nullable()->after('trial_ends_at');
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('plan_id')->constrained()->onDelete('cascade');
            $table->string('status')->default('active'); // active, expired, cancelled
            $table->timestamp('started_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('grace_period_ends_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });

        // Seed plan_expires_at for existing paid upgrades
        $paidUpgrades = DB::table('plan_upgrades')
            ->where('status', 'paid')
            ->whereNotNull('updated_at')
            ->get();

        foreach ($paidUpgrades as $upgrade) {
            $expiresAt = $upgrade->updated_at instanceof \Carbon\Carbon
                ? $upgrade->updated_at->addMonth()
                : \Carbon\Carbon::parse($upgrade->updated_at)->addMonth();

            DB::table('users')
                ->where('id', $upgrade->user_id)
                ->whereNull('plan_expires_at')
                ->update(['plan_expires_at' => $expiresAt]);

            DB::table('subscriptions')->insert([
                'user_id' => $upgrade->user_id,
                'plan_id' => $upgrade->to_plan_id,
                'status' => $expiresAt->isFuture() ? 'active' : 'expired',
                'started_at' => $upgrade->updated_at,
                'expires_at' => $expiresAt,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('plan_expires_at');
        });
    }
};

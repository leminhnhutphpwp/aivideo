<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FIX 6 — the daily render quota counted storyboards by `updated_at`, so merely editing a
 * storyboard's title inflated the count. Add an explicit `last_rendered_at` timestamp that
 * is set only on a real render kickoff, and index it (+ render_jobs) for the daily count.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storyboards', function (Blueprint $table) {
            $table->timestamp('last_rendered_at')->nullable()->after('render_attempts');
            $table->index(['user_id', 'last_rendered_at']);
        });

        Schema::table('render_jobs', function (Blueprint $table) {
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('storyboards', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'last_rendered_at']);
            $table->dropColumn('last_rendered_at');
        });

        Schema::table('render_jobs', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'created_at']);
        });
    }
};

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
            // Daily render cap per user. NULL = unlimited (paid / internal plans).
            $table->unsignedInteger('max_renders_per_day')->nullable()->after('max_concurrent_jobs');
        });

        // Backfill sensible defaults so an existing DB is protected without re-seeding.
        DB::table('plans')->where('slug', 'free')->update(['max_renders_per_day' => 15]);
        DB::table('plans')->where('slug', 'pro')->update(['max_renders_per_day' => 100]);
        // Studio / others stay NULL (unlimited).
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('max_renders_per_day');
        });
    }
};

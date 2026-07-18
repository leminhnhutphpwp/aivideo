<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-skill aggregate signal counters — the substrate of the "learning loop".
 * usage_count / likes_count / published_count are rolled up from real community
 * activity (generate, like, publish) attributed to a skill via render_jobs.skill_id.
 * skills:refresh-examples reads these to decide which skill's example_prompt to
 * evolve toward a real, high-liked prompt.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('skill_stats', function (Blueprint $table) {
            $table->id();
            $table->string('skill_id')->unique();
            $table->string('category')->nullable();
            $table->unsignedBigInteger('usage_count')->default(0);
            $table->unsignedBigInteger('published_count')->default(0);
            $table->unsignedBigInteger('likes_count')->default(0);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->index('usage_count');
            $table->index('likes_count');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('skill_stats');
    }
};

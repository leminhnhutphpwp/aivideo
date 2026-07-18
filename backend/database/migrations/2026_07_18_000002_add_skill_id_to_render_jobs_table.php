<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Skill attribution: record WHICH skill (image-direction / video-direction / etc.)
 * a render was generated with, so community signals (usage/likes/publish) can be
 * rolled up per-skill for the self-evolving skill library.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('render_jobs', function (Blueprint $table) {
            $table->string('skill_id')->nullable()->after('capability');
            $table->index('skill_id');
        });
    }

    public function down(): void
    {
        Schema::table('render_jobs', function (Blueprint $table) {
            $table->dropIndex(['skill_id']);
            $table->dropColumn('skill_id');
        });
    }
};

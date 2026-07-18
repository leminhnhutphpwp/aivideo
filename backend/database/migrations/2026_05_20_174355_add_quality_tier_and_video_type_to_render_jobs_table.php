<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('render_jobs', function (Blueprint $table) {
            if (!Schema::hasColumn('render_jobs', 'quality_tier')) {
                $table->string('quality_tier')->nullable()->after('model');
            }
            if (!Schema::hasColumn('render_jobs', 'video_type')) {
                $table->string('video_type')->nullable()->after('quality_tier');
            }
        });
    }

    public function down(): void
    {
        Schema::table('render_jobs', function (Blueprint $table) {
            if (Schema::hasColumn('render_jobs', 'quality_tier')) {
                $table->dropColumn('quality_tier');
            }
            if (Schema::hasColumn('render_jobs', 'video_type')) {
                $table->dropColumn('video_type');
            }
        });
    }
};

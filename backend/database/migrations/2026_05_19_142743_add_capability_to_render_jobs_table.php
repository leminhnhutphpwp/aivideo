<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('render_jobs', function (Blueprint $table) {
            $table->string('capability')->nullable()->after('model')
                  ->comment('t2v, i2v, r2v, video-edit, character-anim');
            $table->string('video_type')->nullable()->after('capability')
                  ->comment('text-to-video, image-to-video, reference-to-video, video-edit, character-animation');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('render_jobs', function (Blueprint $table) {
            $table->dropColumn(['capability', 'video_type']);
        });
    }
};

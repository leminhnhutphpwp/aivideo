<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storyboard_scenes', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('storyboard_scenes', function (Blueprint $table) {
            $table->dropUnique(['storyboard_id', 'scene_number']);
            $table->index(['storyboard_id', 'scene_number']);
        });
    }

    public function down(): void
    {
        Schema::table('storyboard_scenes', function (Blueprint $table) {
            $table->dropIndex(['storyboard_id', 'scene_number']);
            $table->unique(['storyboard_id', 'scene_number']);
            $table->dropSoftDeletes();
        });
    }
};

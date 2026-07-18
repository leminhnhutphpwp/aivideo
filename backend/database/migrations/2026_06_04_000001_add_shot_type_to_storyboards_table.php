<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storyboards', function (Blueprint $table) {
            $table->string('shot_type')->nullable()->after('last_frame_image');
            $table->string('multi_panel_image')->nullable()->after('shot_type');
        });
    }

    public function down(): void
    {
        Schema::table('storyboards', function (Blueprint $table) {
            $table->dropColumn(['shot_type', 'multi_panel_image']);
        });
    }
};

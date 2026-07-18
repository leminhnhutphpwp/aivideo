<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storyboards', function (Blueprint $table) {
            $table->string('first_frame_image')->nullable()->after('driving_audio');
            $table->string('last_frame_image')->nullable()->after('first_frame_image');
        });
    }

    public function down(): void
    {
        Schema::table('storyboards', function (Blueprint $table) {
            $table->dropColumn(['first_frame_image', 'last_frame_image']);
        });
    }
};

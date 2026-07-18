<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storyboards', function (Blueprint $table) {
            $table->string('camera_movement')->nullable();
            $table->string('style')->nullable();
            $table->string('mood')->nullable();
            $table->string('lighting')->nullable();
            $table->text('narration')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('storyboards', function (Blueprint $table) {
            $table->dropColumn(['camera_movement', 'style', 'mood', 'lighting', 'narration']);
        });
    }
};

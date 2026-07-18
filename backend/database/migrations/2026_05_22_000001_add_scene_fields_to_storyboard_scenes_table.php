<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storyboard_scenes', function (Blueprint $table) {
            $table->string('style')->nullable()->after('lighting');
            $table->string('mood')->nullable()->after('style');
            $table->text('negative_prompt')->nullable()->after('mood');
            $table->string('reference_image')->nullable()->after('negative_prompt');
            $table->text('narration')->nullable()->after('reference_image');
        });
    }

    public function down(): void
    {
        Schema::table('storyboard_scenes', function (Blueprint $table) {
            $table->dropColumn(['style', 'mood', 'negative_prompt', 'reference_image', 'narration']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('storyboard_scenes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('storyboard_id')->constrained()->cascadeOnDelete();
            $table->integer('scene_number');
            $table->text('prompt');
            $table->text('enriched_prompt')->nullable();
            $table->integer('duration_seconds')->default(5);
            $table->string('camera_movement')->nullable();
            $table->string('lighting')->nullable();
            $table->string('aspect_ratio')->default('16:9');
            $table->string('resolution')->default('720p');
            $table->string('status')->default('pending');
            $table->foreignId('render_job_id')->nullable()->constrained()->nullOnDelete();
            $table->string('output_path')->nullable();
            $table->string('thumbnail_path')->nullable();
            $table->decimal('consistency_score', 5, 2)->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index('storyboard_id');
            $table->unique(['storyboard_id', 'scene_number']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storyboard_scenes');
    }
};

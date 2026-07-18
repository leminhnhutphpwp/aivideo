<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('storyboards', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->json('style_guide')->nullable();
            $table->string('voice_mood')->nullable();
            $table->string('video_type')->default('ugc_review');
            $table->string('quality_tier')->default('standard');
            $table->string('status')->default('draft');
            $table->integer('credits_cost')->default(0);
            $table->json('analysis_result')->nullable();
            $table->decimal('consistency_score', 5, 2)->nullable();
            $table->string('output_path')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storyboards');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('render_jobs', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained();
            $table->string('status')->default('created');
            $table->text('prompt');
            $table->string('model')->default('seedance');
            $table->integer('duration_seconds');
            $table->string('aspect_ratio')->default('16:9');
            $table->string('resolution')->default('720p');
            $table->json('parameters')->nullable();
            $table->json('reference_images')->nullable();
            $table->integer('attempts')->default(0);
            $table->integer('max_attempts')->default(3);
            $table->integer('credits_cost')->default(0);
            $table->json('plan_snapshot')->nullable();
            $table->integer('gpu_seconds')->nullable();
            $table->string('open_design_session_id')->nullable();
            $table->string('output_path')->nullable();
            $table->string('thumbnail_path')->nullable();
            $table->string('preview_path')->nullable();
            $table->integer('output_size_bytes')->nullable();
            $table->timestamp('queued_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->json('error_metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('render_jobs');
    }
};

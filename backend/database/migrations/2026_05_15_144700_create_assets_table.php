<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained();
            $table->foreignId('render_job_id')->nullable()->constrained();
            $table->string('type');
            $table->string('mime_type');
            $table->string('path');
            $table->string('original_name');
            $table->integer('size_bytes');
            $table->json('metadata')->nullable();
            $table->boolean('is_public')->default(false);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index('render_job_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('price_monthly')->default(0);
            $table->integer('price_yearly')->default(0);
            $table->integer('max_duration_seconds')->default(15);
            $table->string('max_resolution')->default('720p');
            $table->integer('max_concurrent_jobs')->default(1);
            $table->string('queue_priority')->default('low');
            $table->integer('monthly_credits')->default(1000);
            $table->boolean('watermark')->default(true);
            $table->boolean('audio_generation')->default(false);
            $table->boolean('upscale')->default(false);
            $table->boolean('api_access')->default(false);
            $table->string('stripe_price_id')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};

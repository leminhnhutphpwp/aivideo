<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('credit_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->decimal('value', 20, 6);
            $table->string('label');
            $table->string('unit')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('video_type_pricings', function (Blueprint $table) {
            $table->id();
            $table->string('provider');
            $table->string('model')->nullable();
            $table->string('quality')->default('standard');
            $table->integer('duration_seconds');
            $table->integer('credit_cost');
            $table->string('resolution')->default('720p');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['provider', 'model']);
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('video_type_pricings');
        Schema::dropIfExists('credit_settings');
    }
};

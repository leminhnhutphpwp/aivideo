<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('storyboard_references', function (Blueprint $table) {
            $table->id();
            $table->foreignId('storyboard_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->foreignId('asset_id')->nullable()->constrained()->nullOnDelete();
            $table->string('media_path');
            $table->text('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('storyboard_id');
            $table->index(['storyboard_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storyboard_references');
    }
};

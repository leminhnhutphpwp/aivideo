<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registration_logs', function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();
            $table->string('ip_address', 45)->index(); // IPv6 compatible
            $table->text('user_agent')->nullable();
            $table->string('device_hash', 64)->nullable()->index();
            $table->boolean('success');
            $table->timestamp('created_at')->useCurrent()->index();
            
            // Indexes for abuse detection queries
            $table->index(['ip_address', 'created_at']);
            $table->index(['device_hash', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registration_logs');
    }
};

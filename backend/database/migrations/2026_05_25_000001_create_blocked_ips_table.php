<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blocked_ips', function (Blueprint $table) {
            $table->id();
            $table->string('ip_address', 45);
            $table->string('reason')->nullable();
            $table->unsignedBigInteger('blocked_by')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->index('ip_address');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blocked_ips');
    }
};

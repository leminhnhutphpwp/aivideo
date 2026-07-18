<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pending_credit_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('transfer_code', 20)->unique();
            $table->integer('amount'); // VNĐ
            $table->integer('credits'); // Credits sẽ nhận
            $table->string('status')->default('pending'); // pending, paid, expired
            $table->string('reference_code')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pending_credit_purchases');
    }
};
